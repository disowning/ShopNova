import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { verifyPassword } from '../_shared/password.ts';
import { assertValidSession } from '../_shared/session.ts';
import {
  getPaymentSecretStatus,
  saveEncryptedPaymentSecrets,
  type PaymentSecretName,
} from '../_shared/secret-store.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as PaymentSecretsRequest;
    const supabase = getSupabaseAdmin();
    await assertAdminUser(supabase, body.adminUserId, body.adminSessionToken);

    if (body.action === 'status') {
      return jsonResponse({ secrets: await getPaymentSecretStatus(supabase) });
    }

    if (body.action === 'save') {
      if (!body.providerId || !body.secrets) throw new Error('Missing payment secret payload');
      await assertAdminUser(supabase, body.adminUserId, body.adminSessionToken, body.adminPassword, true);
      await saveEncryptedPaymentSecrets(supabase, body.providerId, body.secrets);
      return jsonResponse({ secrets: await getPaymentSecretStatus(supabase) });
    }

    return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Payment secrets request failed' }, { status: 400 });
  }
});

interface PaymentSecretsRequest {
  action: 'status' | 'save';
  adminUserId?: string;
  adminSessionToken?: string;
  adminPassword?: string;
  providerId?: string;
  secrets?: Partial<Record<PaymentSecretName, string>>;
}

async function assertAdminUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  adminUserId?: string,
  adminSessionToken?: string,
  adminPassword?: string,
  requirePassword = false,
) {
  if (!adminUserId) throw new Error('Please sign in as an administrator first');
  await assertValidSession(supabase, adminUserId, adminSessionToken);
  const { data, error } = await supabase
    .from('users')
    .select('role, password_hash')
    .eq('id', adminUserId)
    .maybeSingle();
  if (error) throw new Error('Failed to verify administrator access');
  if (data?.role !== 'admin') throw new Error('This account does not have administrator access');
  if (requirePassword) {
    if (!adminPassword?.trim()) throw new Error('Administrator password confirmation is required');
    if (!(await verifyPassword(adminPassword, data.password_hash))) throw new Error('Administrator password is incorrect');
  }
}
