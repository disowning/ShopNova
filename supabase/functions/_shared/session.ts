import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SESSION_BYTES = 32;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function createSessionToken(
  supabase: SupabaseClient,
  userId: string,
  maxAgeDays = 7,
) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_BYTES)));
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('auth_sessions')
    .insert({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    });
  if (error) throw new Error(`Failed to create login session: ${error.message}`);

  return token;
}

export async function assertValidSession(
  supabase: SupabaseClient,
  userId: string,
  token: string | undefined,
) {
  if (!token) throw new Error('Please sign in again');
  const tokenHash = await sha256(token);
  const { data, error } = await supabase
    .from('auth_sessions')
    .select('user_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) throw new Error('Failed to verify login session');
  if (!data || data.user_id !== userId) throw new Error('Login session is invalid');
  if (new Date(data.expires_at).getTime() <= Date.now()) throw new Error('Login session has expired');
}
