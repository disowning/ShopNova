import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as { credential?: string };
    if (!body.credential) throw new Error('Missing Google credential');

    const supabase = getSupabaseAdmin();
    const settings = await fetchGoogleSettings(supabase);
    if (!settings.enabled || !settings.clientId) throw new Error('Google login is not enabled');

    const profile = await verifyGoogleIdToken(body.credential, settings.clientId, settings.hostedDomain);
    const user = await findOrCreateGoogleUser(supabase, profile, settings.autoCreateCustomers);
    return jsonResponse({ user });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Google login failed' }, { status: 400 });
  }
});

interface GoogleLoginSettings {
  enabled: boolean;
  clientId: string;
  hostedDomain: string;
  autoCreateCustomers: boolean;
}

interface GoogleTokenInfo {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  hd?: string;
  exp?: string;
  error_description?: string;
}

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  avatar_url: string | null;
  google_sub?: string | null;
  status?: string | null;
  deleted_at?: string | null;
}

async function fetchGoogleSettings(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<GoogleLoginSettings> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('Failed to read Google login settings');
  const google = ((data?.settings_data as {
    authSettings?: { google?: Partial<GoogleLoginSettings> };
  } | null)?.authSettings?.google ?? {});

  return {
    enabled: Boolean(google.enabled),
    clientId: String(google.clientId ?? '').trim(),
    hostedDomain: String(google.hostedDomain ?? '').trim().toLowerCase(),
    autoCreateCustomers: google.autoCreateCustomers !== false,
  };
}

async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
  hostedDomain: string,
): Promise<GoogleProfile> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const token = await response.json() as GoogleTokenInfo;
  if (!response.ok) throw new Error(token.error_description || 'Google token verification failed');

  if (token.aud !== clientId) throw new Error('Google token audience does not match Client ID');
  if (token.iss !== 'accounts.google.com' && token.iss !== 'https://accounts.google.com') {
    throw new Error('Google token issuer is invalid');
  }

  const expiresAt = Number(token.exp ?? 0);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
    throw new Error('Google token has expired');
  }

  const emailVerified = token.email_verified === true || token.email_verified === 'true';
  if (!token.sub || !token.email || !emailVerified) {
    throw new Error('Google account email is not verified');
  }

  if (hostedDomain && token.hd?.toLowerCase() !== hostedDomain) {
    throw new Error('Google account is not allowed for this Workspace domain');
  }

  return {
    sub: token.sub,
    email: token.email.trim().toLowerCase(),
    name: token.name?.trim() || token.email.split('@')[0],
    picture: token.picture || null,
    emailVerified,
  };
}

async function findOrCreateGoogleUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  profile: GoogleProfile,
  autoCreateCustomers: boolean,
) {
  const existingByGoogle = await findUserByGoogleSub(supabase, profile.sub);
  if (existingByGoogle) {
    assertUserCanLogin(existingByGoogle);
    return updateGoogleUser(supabase, existingByGoogle.id, profile);
  }

  const existingByEmail = await findUserByEmail(supabase, profile.email);
  if (existingByEmail) {
    assertUserCanLogin(existingByEmail);
    if (existingByEmail.google_sub && existingByEmail.google_sub !== profile.sub) {
      throw new Error('This email is already linked to another Google account');
    }
    return updateGoogleUser(supabase, existingByEmail.id, profile);
  }

  if (!autoCreateCustomers) throw new Error('Google account auto creation is disabled');
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: profile.email,
      password_hash: '',
      name: profile.name,
      phone: '',
      role: 'customer',
      status: '活跃',
      avatar_url: profile.picture,
      auth_provider: 'google',
      google_sub: profile.sub,
      google_email_verified: profile.emailVerified,
      last_login_at: new Date().toISOString(),
    })
    .select('id, email, name, phone, role, avatar_url, status')
    .single();

  if (error || !data) throw new Error(`Failed to create Google user: ${error?.message ?? ''}`);
  return data as UserRow;
}

async function findUserByGoogleSub(supabase: ReturnType<typeof getSupabaseAdmin>, googleSub: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone, role, avatar_url, google_sub, status, deleted_at')
    .eq('google_sub', googleSub)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error('Failed to find Google user');
  return data as UserRow | null;
}

async function findUserByEmail(supabase: ReturnType<typeof getSupabaseAdmin>, email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone, role, avatar_url, google_sub, status, deleted_at')
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error('Failed to find user by email');
  return data as UserRow | null;
}

function assertUserCanLogin(user: UserRow) {
  if (user.status === '已封禁') {
    throw new Error('Account has been disabled. Please contact support.');
  }
  if (user.status === '已删除' || user.deleted_at) {
    throw new Error('Account no longer exists. Please contact support.');
  }
}

async function updateGoogleUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  profile: GoogleProfile,
) {
  const { data, error } = await supabase
    .from('users')
    .update({
      name: profile.name,
      avatar_url: profile.picture,
      auth_provider: 'google',
      google_sub: profile.sub,
      google_email_verified: profile.emailVerified,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, email, name, phone, role, avatar_url, status')
    .single();

  if (error || !data) throw new Error(`Failed to update Google user: ${error?.message ?? ''}`);
  return data as UserRow;
}
