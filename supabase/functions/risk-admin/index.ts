import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { assertValidSession } from '../_shared/session.ts';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

const PAGE_SIZE_MAX = 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const supabase = getSupabaseAdmin();
    await assertAdminUser(supabase, String(body.adminUserId || ''), String(body.adminSessionToken || ''));

    if (body.action === 'list') return jsonResponse(await listRiskOrders(supabase, body));
    if (body.action === 'stats') return jsonResponse({ stats: await fetchStats(supabase) });
    if (body.action === 'review') {
      await reviewRiskOrder(supabase, String(body.riskOrderId || ''), String(body.status || ''));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Risk admin request failed' }, { status: 400 });
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

async function listRiskOrders(supabase: SupabaseAdmin, body: Record<string, unknown>) {
  const page = Math.max(0, Number(body.page || 0));
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(body.pageSize || 15)));

  const { data, count, error } = await supabase
    .from('risk_orders')
    .select('*, orders(order_number, status, payment_status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw new Error(`Failed to read risk orders: ${error.message}`);
  return { riskOrders: data ?? [], total: count ?? 0 };
}

async function fetchStats(supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('risk_orders')
    .select('review_status, risk_score');
  if (error) throw new Error(`Failed to read risk stats: ${error.message}`);
  if (!data || data.length === 0) {
    return { total: 0, pending: 0, rejected: 0, passed: 0, avgScore: 0 };
  }

  return {
    total: data.length,
    pending: data.filter((row) => row.review_status === '待审核').length,
    rejected: data.filter((row) => row.review_status === '已拒绝').length,
    passed: data.filter((row) => row.review_status === '已通过').length,
    avgScore: Math.round(data.reduce((sum, row) => sum + Number(row.risk_score || 0), 0) / data.length),
  };
}

async function reviewRiskOrder(supabase: SupabaseAdmin, riskOrderId: string, status: string) {
  if (!riskOrderId) throw new Error('Missing risk order id');
  if (status !== '已通过' && status !== '已拒绝') throw new Error('Unsupported review status');

  const { data: riskOrder, error: readError } = await supabase
    .from('risk_orders')
    .select('id, order_id, review_status, orders(payment_status)')
    .eq('id', riskOrderId)
    .maybeSingle();
  if (readError) throw new Error(`Failed to read risk order: ${readError.message}`);
  if (!riskOrder) throw new Error('Risk order not found');
  if (riskOrder.review_status !== '待审核') throw new Error('Risk order has already been reviewed');

  const { error: riskError } = await supabase
    .from('risk_orders')
    .update({ review_status: status, reviewed_at: new Date().toISOString() })
    .eq('id', riskOrderId);
  if (riskError) throw new Error(`Failed to update risk order: ${riskError.message}`);

  if (!riskOrder.order_id) return;

  const paymentStatus = Array.isArray(riskOrder.orders)
    ? riskOrder.orders[0]?.payment_status
    : riskOrder.orders?.payment_status;

  if (status === '已通过') {
    const { error } = await supabase
      .from('orders')
      .update({
        status: paymentStatus === 'paid' ? 'processing' : 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', riskOrder.order_id);
    if (error) throw new Error(`Failed to update approved order: ${error.message}`);
    return;
  }

  const nextPaymentStatus = paymentStatus === 'paid' ? 'refunded' : 'failed';
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', riskOrder.order_id);
  if (orderError) throw new Error(`Failed to reject order: ${orderError.message}`);

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: nextPaymentStatus === 'refunded' ? 'refunded' : 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', riskOrder.order_id);
  if (paymentError) throw new Error(`Failed to update rejected payment: ${paymentError.message}`);
}
