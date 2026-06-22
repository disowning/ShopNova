import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { assertValidSession } from '../_shared/session.ts';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

const providerIds = ['dev_card', 'stripe', 'paypal', 'cod'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const supabase = getSupabaseAdmin();
    await assertAdminUser(supabase, String(body.adminUserId || ''), String(body.adminSessionToken || ''));

    if (body.action === 'get') {
      return jsonResponse({ paymentSettings: await fetchPaymentSettings(supabase) });
    }

    if (body.action === 'save') {
      const paymentSettings = normalizePaymentSettings(body.paymentSettings);
      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          id: 'default',
          providers: paymentSettings.providers,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) throw new Error(`Failed to save payment settings: ${error.message}`);
      return jsonResponse({ paymentSettings });
    }

    return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Payment admin request failed' }, { status: 400 });
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

async function fetchPaymentSettings(supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('providers, updated_at')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw new Error(`Failed to read payment settings: ${error.message}`);
  return normalizePaymentSettings({
    providers: data?.providers,
    updatedAt: data?.updated_at,
  });
}

function normalizePaymentSettings(value: unknown) {
  const raw = value as { providers?: unknown; updatedAt?: unknown } | null;
  const providers = Array.isArray(raw?.providers) ? raw.providers : [];
  const cleaned = providers
    .filter((provider): provider is Record<string, unknown> => Boolean(provider && typeof provider === 'object'))
    .filter((provider) => providerIds.includes(String(provider.id)));

  return {
    providers: providerIds.map((id) => {
      const provider = cleaned.find((item) => item.id === id) ?? {};
      return {
        ...provider,
        id,
        enabled: Boolean(provider.enabled),
        settlementCurrency: String(provider.settlementCurrency || 'USD').trim().toUpperCase(),
      };
    }),
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}
