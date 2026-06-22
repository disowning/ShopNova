import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { hashPassword, verifyPassword } from '../_shared/password.ts';
import { assertValidSession } from '../_shared/session.ts';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  avatar_url: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || '');
    const adminUserId = String(body.adminUserId || '');
    const supabase = getSupabaseAdmin();
    await assertAdminUser(supabase, adminUserId, String(body.adminSessionToken || ''));

    if (action === 'get') return jsonResponse(await getSettings(supabase, adminUserId));
    if (action === 'saveSettings') {
      await saveSettings(supabase, adminUserId, body.settingsData);
      return jsonResponse({ ok: true });
    }
    if (action === 'updateProfile') return jsonResponse({ user: await updateProfile(supabase, adminUserId, body.profile) });
    if (action === 'changePassword') {
      await changePassword(supabase, adminUserId, body.currentPassword, body.newPassword);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Settings admin request failed' }, { status: 400 });
  }
});

async function assertAdminUser(supabase: SupabaseAdmin, adminUserId: string, adminSessionToken: string) {
  if (!adminUserId) throw new Error('Please sign in as an administrator first');
  await assertValidSession(supabase, adminUserId, adminSessionToken);

  const { data, error } = await supabase
    .from('users')
    .select('role, status, deleted_at')
    .eq('id', adminUserId)
    .maybeSingle();
  if (error) throw new Error('Failed to verify administrator access');
  if (data?.role !== 'admin' || data.deleted_at) throw new Error('This account does not have administrator access');
  if (data.status === '已封禁') throw new Error('This administrator account is disabled');
}

async function getSettings(supabase: SupabaseAdmin, adminUserId: string) {
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, email, name, phone, role, avatar_url')
    .eq('id', adminUserId)
    .maybeSingle();
  if (userError) throw new Error('Failed to read administrator profile');
  if (!userRow) throw new Error('Administrator account was not found');

  const { data: settingsRow, error: settingsError } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .eq('user_id', adminUserId)
    .maybeSingle();
  if (settingsError) throw new Error(`Failed to read admin settings: ${settingsError.message}`);

  return {
    user: userRow as AdminUser,
    settingsData: settingsRow?.settings_data ?? {},
  };
}

async function saveSettings(supabase: SupabaseAdmin, adminUserId: string, settingsData: unknown) {
  if (!settingsData || typeof settingsData !== 'object' || Array.isArray(settingsData)) {
    throw new Error('Settings payload is invalid');
  }

  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      user_id: adminUserId,
      settings_data: settingsData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw new Error(`Failed to save admin settings: ${error.message}`);
}

function normalizeProfile(input: unknown) {
  const profile = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = String(profile.name || '').trim();
  const email = String(profile.email || '').trim().toLowerCase();
  const phone = String(profile.phone || '').trim();

  if (!name) throw new Error('Administrator name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Administrator email is invalid');
  if (!/^[+\d][\d\s-]{6,}$/.test(phone)) throw new Error('Administrator phone is invalid');

  return { name, email, phone };
}

async function updateProfile(supabase: SupabaseAdmin, adminUserId: string, input: unknown) {
  const profile = normalizeProfile(input);
  const { data: duplicate, error: duplicateError } = await supabase
    .from('users')
    .select('id')
    .eq('email', profile.email)
    .neq('id', adminUserId)
    .maybeSingle();
  if (duplicateError) throw new Error('Failed to check administrator email');
  if (duplicate) throw new Error('This email is already used by another account');

  const { data, error } = await supabase
    .from('users')
    .update({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminUserId)
    .select('id, email, name, phone, role, avatar_url')
    .single();
  if (error || !data) throw new Error('Failed to save administrator profile');
  return data as AdminUser;
}

async function changePassword(
  supabase: SupabaseAdmin,
  adminUserId: string,
  currentPassword: unknown,
  newPassword: unknown,
) {
  const current = String(currentPassword || '');
  const next = String(newPassword || '');
  if (!current) throw new Error('Current password is required');
  if (next.length < 6) throw new Error('New password must be at least 6 characters');

  const { data, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', adminUserId)
    .maybeSingle();
  if (error) throw new Error('Failed to verify current password');
  if (!data || !(await verifyPassword(current, data.password_hash))) throw new Error('Current password is incorrect');

  const { error: updateError } = await supabase
    .from('users')
    .update({
      password_hash: await hashPassword(next),
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminUserId);
  if (updateError) throw new Error('Failed to change password');
}
