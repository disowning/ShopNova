import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { verifyPassword } from '../_shared/password.ts';
import { createSessionToken } from '../_shared/session.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as { action?: string; email?: string; password?: string };
    if (body.action !== 'login') throw new Error('Unsupported action');

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) throw new Error('Email and password are required');

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, phone, role, avatar_url, password_hash, status, deleted_at')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new Error('Login request failed');
    if (!data || !(await verifyPassword(password, data.password_hash))) throw new Error('Email or password is incorrect');
    if (data.status === '已封禁') throw new Error('Account has been disabled. Please contact support.');
    if (data.status === '已删除' || data.deleted_at) throw new Error('Account no longer exists. Please contact support.');

    const sessionToken = await createSessionToken(supabase, data.id);
    return jsonResponse({
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        avatar_url: data.avatar_url,
        session_token: sessionToken,
      },
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Login failed' }, { status: 400 });
  }
});
