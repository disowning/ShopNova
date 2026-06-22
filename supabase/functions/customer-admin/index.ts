import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/payment.ts';
import { hashPassword } from '../_shared/password.ts';
import { assertValidSession } from '../_shared/session.ts';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

interface CustomerRules {
  vipSpendThreshold: number;
  vipOrderThreshold: number;
  highVipSpendThreshold: number;
  highVipOrderThreshold: number;
}

const DEFAULT_CUSTOMER_RULES: CustomerRules = {
  vipSpendThreshold: 3000,
  vipOrderThreshold: 5,
  highVipSpendThreshold: 10000,
  highVipOrderThreshold: 20,
};

const CUSTOMER_STATUSES = new Set(['活跃', '待验证', '已封禁']);
const VALID_PAID_STATUSES = new Set(['paid']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || '');
    const supabase = getSupabaseAdmin();
    await assertAdminUser(supabase, String(body.adminUserId || ''), String(body.adminSessionToken || ''));

    if (action === 'list') return jsonResponse(await listCustomers(supabase, body));
    if (action === 'stats') return jsonResponse({ stats: await fetchStats(supabase) });
    if (action === 'orders') return jsonResponse({ orders: await fetchOrders(supabase, String(body.customerId || '')) });
    if (action === 'create') return jsonResponse({ customer: await createCustomer(supabase, body) });
    if (action === 'update') return jsonResponse({ customer: await updateCustomer(supabase, body) });
    if (action === 'resetPassword') {
      await resetCustomerPassword(supabase, body);
      return jsonResponse({ ok: true });
    }
    if (action === 'status') return jsonResponse({ customer: await updateCustomerStatus(supabase, body) });
    if (action === 'delete') {
      await deleteCustomer(supabase, String(body.customerId || ''));
      return jsonResponse({ ok: true });
    }
    if (action === 'sync') return jsonResponse({ updatedCount: await syncCustomerSummaries(supabase) });
    if (action === 'getRules') return jsonResponse({ customerRules: await fetchCustomerRules(supabase) });
    if (action === 'saveRules') return jsonResponse({ customerRules: await saveCustomerRules(supabase, body.customerRules) });

    return jsonResponse({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Customer admin request failed' }, { status: 400 });
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

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function requireEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Customer email is invalid');
  return email;
}

function normalizeStatus(value: unknown) {
  const status = String(value || '活跃').trim();
  if (!CUSTOMER_STATUSES.has(status)) throw new Error('Customer status is invalid');
  return status;
}

function cleanNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

function mergeCustomerRules(saved?: Partial<CustomerRules>): CustomerRules {
  return {
    vipSpendThreshold: cleanNumber(saved?.vipSpendThreshold, DEFAULT_CUSTOMER_RULES.vipSpendThreshold),
    vipOrderThreshold: cleanNumber(saved?.vipOrderThreshold, DEFAULT_CUSTOMER_RULES.vipOrderThreshold),
    highVipSpendThreshold: cleanNumber(saved?.highVipSpendThreshold, DEFAULT_CUSTOMER_RULES.highVipSpendThreshold),
    highVipOrderThreshold: cleanNumber(saved?.highVipOrderThreshold, DEFAULT_CUSTOMER_RULES.highVipOrderThreshold),
  };
}

function getMemberLevel(orderCount: number, totalSpend: number, rules: CustomerRules) {
  if (totalSpend >= rules.highVipSpendThreshold || orderCount >= rules.highVipOrderThreshold) return '高级VIP';
  if (totalSpend >= rules.vipSpendThreshold || orderCount >= rules.vipOrderThreshold) return 'VIP';
  if (orderCount > 0) return '普通';
  return '新用户';
}

async function fetchCustomerRules(supabase: SupabaseAdmin): Promise<CustomerRules> {
  const { data, error } = await supabase
    .from('customer_rules')
    .select('vip_spend_threshold, vip_order_threshold, high_vip_spend_threshold, high_vip_order_threshold')
    .eq('id', 'default')
    .maybeSingle();

  if (!error && data) {
    return mergeCustomerRules({
      vipSpendThreshold: data.vip_spend_threshold,
      vipOrderThreshold: data.vip_order_threshold,
      highVipSpendThreshold: data.high_vip_spend_threshold,
      highVipOrderThreshold: data.high_vip_order_threshold,
    });
  }

  const { data: legacyData } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const legacyRules = (legacyData?.settings_data as { customerRules?: Partial<CustomerRules> } | null)?.customerRules;
  return mergeCustomerRules(legacyRules);
}

async function saveCustomerRules(supabase: SupabaseAdmin, value: unknown) {
  const rules = mergeCustomerRules(value as Partial<CustomerRules>);
  if (rules.highVipSpendThreshold < rules.vipSpendThreshold) {
    throw new Error('High VIP spend threshold cannot be lower than VIP spend threshold');
  }
  if (rules.highVipOrderThreshold < rules.vipOrderThreshold) {
    throw new Error('High VIP order threshold cannot be lower than VIP order threshold');
  }

  const { error } = await supabase
    .from('customer_rules')
    .upsert({
      id: 'default',
      vip_spend_threshold: rules.vipSpendThreshold,
      vip_order_threshold: rules.vipOrderThreshold,
      high_vip_spend_threshold: rules.highVipSpendThreshold,
      high_vip_order_threshold: rules.highVipOrderThreshold,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw new Error(`Failed to save customer rules: ${error.message}`);
  return rules;
}

async function listCustomers(supabase: SupabaseAdmin, body: Record<string, unknown>) {
  const page = Math.max(0, Number(body.page || 0));
  const pageSize = Math.min(100, Math.max(1, Number(body.pageSize || 15)));
  const search = String(body.search || '').trim();
  const level = String(body.level || '全部').trim();
  let query = supabase
    .from('users')
    .select('id, name, email, phone, country, member_level, status, total_spend, order_count, last_order_at, created_at', { count: 'exact' })
    .eq('role', 'customer')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  if (level && level !== '全部') query = query.eq('member_level', level);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to read customers: ${error.message}`);
  return { customers: data ?? [], total: count ?? 0 };
}

async function fetchStats(supabase: SupabaseAdmin) {
  const rules = await fetchCustomerRules(supabase);
  const [{ data: users, error: userError }, { data: recentOrders, error: orderError }] = await Promise.all([
    supabase
      .from('users')
      .select('id, member_level, total_spend, order_count')
      .eq('role', 'customer')
      .is('deleted_at', null),
    supabase
      .from('orders')
      .select('user_id')
      .not('user_id', 'is', null)
      .eq('payment_status', 'paid')
      .gte('created_at', getThirtyDaysAgoIso()),
  ]);
  if (userError) throw new Error(`Failed to read customer stats: ${userError.message}`);
  if (orderError) throw new Error(`Failed to read recent orders: ${orderError.message}`);

  const activeUserIds = new Set((recentOrders ?? []).map((order) => order.user_id).filter(Boolean));
  return {
    total: users?.length ?? 0,
    active: activeUserIds.size,
    vip: (users ?? []).filter((user) => {
      const level = user.member_level || getMemberLevel(Number(user.order_count ?? 0), Number(user.total_spend ?? 0), rules);
      return level === 'VIP' || level === '高级VIP';
    }).length,
    revenue: (users ?? []).reduce((sum, user) => sum + Number(user.total_spend ?? 0), 0),
  };
}

function getThirtyDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

async function fetchOrders(supabase: SupabaseAdmin, customerId: string) {
  if (!customerId) throw new Error('Missing customer id');
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, total_amount, delivery_method, created_at, shipping_addresses(recipient_name, email, phone, country, province, city)')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`Failed to read customer orders: ${error.message}`);
  return data ?? [];
}

async function assertUniqueEmail(supabase: SupabaseAdmin, email: string, exceptId?: string) {
  let query = supabase.from('users').select('id').eq('email', email).limit(1);
  if (exceptId) query = query.neq('id', exceptId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to check customer email: ${error.message}`);
  if (data) throw new Error('This email is already used by another account');
}

async function createCustomer(supabase: SupabaseAdmin, body: Record<string, unknown>) {
  const email = requireEmail(body.email);
  const password = String(body.password || '').trim();
  if (password.length < 6) throw new Error('Customer password must contain at least 6 characters');
  await assertUniqueEmail(supabase, email);

  const rules = await fetchCustomerRules(supabase);
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: await hashPassword(password),
      name: String(body.name || '').trim(),
      phone: String(body.phone || '').trim(),
      country: String(body.country || '').trim(),
      role: 'customer',
      member_level: getMemberLevel(0, 0, rules),
      status: normalizeStatus(body.status),
      total_spend: 0,
      order_count: 0,
      last_order_at: null,
      deleted_at: null,
    })
    .select('id, name, email, phone, country, member_level, status, total_spend, order_count, last_order_at, created_at')
    .single();
  if (error || !data) throw new Error(`Failed to create customer: ${error?.message ?? ''}`);
  return data;
}

async function updateCustomer(supabase: SupabaseAdmin, body: Record<string, unknown>) {
  const customerId = String(body.customerId || '');
  if (!customerId) throw new Error('Missing customer id');
  const email = requireEmail(body.email);
  await assertUniqueEmail(supabase, email, customerId);

  const { data, error } = await supabase
    .from('users')
    .update({
      name: String(body.name || '').trim(),
      email,
      phone: String(body.phone || '').trim(),
      country: String(body.country || '').trim(),
      status: normalizeStatus(body.status),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('role', 'customer')
    .is('deleted_at', null)
    .select('id, name, email, phone, country, member_level, status, total_spend, order_count, last_order_at, created_at')
    .single();
  if (error || !data) throw new Error(`Failed to update customer: ${error?.message ?? ''}`);
  return data;
}

async function resetCustomerPassword(supabase: SupabaseAdmin, body: Record<string, unknown>) {
  const customerId = String(body.customerId || '');
  const password = String(body.password || '').trim();
  if (!customerId) throw new Error('Missing customer id');
  if (password.length < 6) throw new Error('Customer password must contain at least 6 characters');

  const { error } = await supabase
    .from('users')
    .update({
      password_hash: await hashPassword(password),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('role', 'customer')
    .is('deleted_at', null);
  if (error) throw new Error(`Failed to reset customer password: ${error.message}`);
}

async function updateCustomerStatus(supabase: SupabaseAdmin, body: Record<string, unknown>) {
  const customerId = String(body.customerId || '');
  if (!customerId) throw new Error('Missing customer id');

  const { data, error } = await supabase
    .from('users')
    .update({
      status: normalizeStatus(body.status),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('role', 'customer')
    .is('deleted_at', null)
    .select('id, name, email, phone, country, member_level, status, total_spend, order_count, last_order_at, created_at')
    .single();
  if (error || !data) throw new Error(`Failed to update customer status: ${error?.message ?? ''}`);
  return data;
}

async function deleteCustomer(supabase: SupabaseAdmin, customerId: string) {
  if (!customerId) throw new Error('Missing customer id');

  const { error } = await supabase
    .from('users')
    .update({
      deleted_at: new Date().toISOString(),
      status: '已删除',
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('role', 'customer')
    .is('deleted_at', null);
  if (error) throw new Error(`Failed to delete customer: ${error.message}`);
}

async function syncCustomerSummaries(supabase: SupabaseAdmin) {
  const rules = await fetchCustomerRules(supabase);
  const { data: userRows, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'customer')
    .is('deleted_at', null);
  if (userError) throw new Error(`Failed to read customers: ${userError.message}`);

  const userIds = (userRows ?? []).map((user) => user.id).filter(Boolean);
  if (userIds.length === 0) return 0;

  const { data: orderRows, error: orderError } = await supabase
    .from('orders')
    .select('user_id, total_amount, payment_status, created_at')
    .in('user_id', userIds);
  if (orderError) throw new Error(`Failed to read customer orders: ${orderError.message}`);

  const summaryByUser = new Map<string, { orderCount: number; totalSpend: number; lastOrderAt: string | null }>();
  userIds.forEach((id) => summaryByUser.set(id, { orderCount: 0, totalSpend: 0, lastOrderAt: null }));

  (orderRows ?? []).forEach((order) => {
    if (!order.user_id || !VALID_PAID_STATUSES.has(order.payment_status)) return;
    const summary = summaryByUser.get(order.user_id);
    if (!summary) return;
    summary.orderCount += 1;
    summary.totalSpend += Number(order.total_amount ?? 0);
    if (!summary.lastOrderAt || new Date(order.created_at) > new Date(summary.lastOrderAt)) {
      summary.lastOrderAt = order.created_at;
    }
  });

  await Promise.all(Array.from(summaryByUser.entries()).map(([id, summary]) => (
    supabase
      .from('users')
      .update({
        total_spend: summary.totalSpend,
        order_count: summary.orderCount,
        last_order_at: summary.lastOrderAt,
        member_level: getMemberLevel(summary.orderCount, summary.totalSpend, rules),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  )));

  return userIds.length;
}
