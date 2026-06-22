import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { assertValidSession } from '../_shared/session.ts';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const supabase = getSupabaseAdmin();
    await assertAdminUser(supabase, String(body.adminUserId || ''), String(body.adminSessionToken || ''));

    if (body.action === 'summary') {
      return jsonResponse({ analytics: await buildAnalyticsSummary(supabase) });
    }

    return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Analytics admin request failed' }, { status: 400 });
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

async function buildAnalyticsSummary(supabase: SupabaseAdmin) {
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, total_amount, created_at, status, payment_status')
    .eq('payment_status', 'paid')
    .in('status', ['paid', 'processing', 'shipped', 'completed'])
    .order('created_at', { ascending: true });
  if (orderError) throw new Error(`Failed to read analytics orders: ${orderError.message}`);

  const paidOrders = orders ?? [];
  const paidOrderIds = paidOrders.map((order) => order.id).filter(Boolean);

  const monthlyData = buildMonthlyData(paidOrders);
  const dailyOrders = buildDailyOrders(paidOrders);
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalOrders = paidOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const growth = monthlyData.length >= 2 && monthlyData[monthlyData.length - 2].revenue > 0
    ? ((monthlyData[monthlyData.length - 1].revenue - monthlyData[monthlyData.length - 2].revenue) / monthlyData[monthlyData.length - 2].revenue) * 100
    : 0;

  const topProducts = await buildTopProducts(supabase, paidOrderIds);

  return {
    monthlyData,
    topProducts,
    dailyOrders,
    kpi: { totalRevenue, totalOrders, avgOrder, growth },
  };
}

function buildMonthlyData(orders: Array<{ total_amount: number; created_at: string }>) {
  const monthMap = new Map<string, { revenue: number; orders: number }>();
  orders.forEach((order) => {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key) || { revenue: 0, orders: 0 };
    entry.revenue += Number(order.total_amount) || 0;
    entry.orders += 1;
    monthMap.set(key, entry);
  });

  return [...monthMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([key, value]) => ({
      month: `${Number(key.split('-')[1])}月`,
      revenue: value.revenue,
      orders: value.orders,
    }));
}

function buildDailyOrders(orders: Array<{ created_at: string }>) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const dayMap = new Map<string, number>();
  for (let index = 0; index < 30; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    dayMap.set(date.toISOString().slice(0, 10), 0);
  }

  orders.forEach((order) => {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
  });

  return [...dayMap.entries()].map(([date, count]) => ({ date, count }));
}

async function buildTopProducts(supabase: SupabaseAdmin, paidOrderIds: string[]) {
  if (paidOrderIds.length === 0) return [];

  const { data: items, error } = await supabase
    .from('order_items')
    .select('order_id, product_name, subtotal, qty')
    .in('order_id', paidOrderIds);
  if (error) throw new Error(`Failed to read product analytics: ${error.message}`);

  const productMap = new Map<string, { revenue: number; qty: number }>();
  (items ?? []).forEach((item) => {
    const name = item.product_name || '未知产品';
    const entry = productMap.get(name) || { revenue: 0, qty: 0 };
    entry.revenue += Number(item.subtotal) || 0;
    entry.qty += Number(item.qty) || 0;
    productMap.set(name, entry);
  });

  return [...productMap.entries()]
    .map(([name, value]) => ({ name, revenue: value.revenue, qty: value.qty }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);
}
