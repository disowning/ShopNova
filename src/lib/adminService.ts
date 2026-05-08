import { supabase } from './supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  coupon_code: string | null;
  delivery_method: string;
  notes: string;
  created_at: string;
  updated_at: string;
  // joined
  shipping_address?: ShippingAddressRow;
  items?: OrderItemRow[];
  payment?: PaymentRow;
}

export interface ShippingAddressRow {
  id: string;
  recipient_name: string;
  email: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  zip: string;
  street1: string;
  street2: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  sku_description: string;
  sku_id: string | null;
  sku_name: string | null;
  sku_attributes_json: Record<string, string> | null;
  unit_price: number;
  qty: number;
  subtotal: number;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  payment_method: string;
  status: string;
  amount: number;
  card_holder_name: string | null;
  card_number: string | null;
  card_last4: string | null;
  card_expiry: string | null;
  card_cvv: string | null;
  transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  paidOrders: number;
  pendingOrders: number;
  riskOrders: number;
  totalRevenue: number;
}

export interface TrendPoint {
  day: string; // MM-DD
  orders: number;
}

export interface StatusPoint {
  label: string;
  value: number;
  color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  paid: '已支付',
  pending: '待处理',
  processing: '处理中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
};

const STATUS_COLOR: Record<string, string> = {
  paid: '#10b981',
  pending: '#f59e0b',
  processing: '#3b82f6',
  shipped: '#06b6d4',
  completed: '#059669',
  cancelled: '#9ca3af',
  refunded: '#ef4444',
};

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}

export function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? '#9ca3af';
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '信用卡/借记卡',
  paypal: 'PayPal',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
  cod: '货到付款',
};

export function paymentMethodLabel(m: string): string {
  return PAYMENT_METHOD_LABEL[m] ?? m;
}

const DELIVERY_LABEL: Record<string, string> = {
  standard: '标准配送',
  express: '快速配送',
  nextday: '次日达',
};

export function deliveryLabel(d: string): string {
  return DELIVERY_LABEL[d] ?? d;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalRes, todayRes, paidRes, pendingRes, revenueRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
  ]);

  const totalRevenue = (revenueRes.data ?? []).reduce((a: number, r: { total_amount: number }) => a + (r.total_amount ?? 0), 0);

  return {
    totalOrders: totalRes.count ?? 0,
    todayOrders: todayRes.count ?? 0,
    paidOrders: paidRes.count ?? 0,
    pendingOrders: pendingRes.count ?? 0,
    riskOrders: 0, // no risk field yet
    totalRevenue,
  };
}

// ─── Trend (last 30 days) ────────────────────────────────────────────────────

export async function fetchTrend30Days(): Promise<TrendPoint[]> {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('orders')
    .select('created_at')
    .gte('created_at', start.toISOString());

  // Build a map: YYYY-MM-DD → count
  const countMap: Record<string, number> = {};
  for (const row of data ?? []) {
    const d = row.created_at.slice(0, 10);
    countMap[d] = (countMap[d] ?? 0) + 1;
  }

  // Fill all 30 days including zeros
  const result: TrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({ day: label, orders: countMap[key] ?? 0 });
  }
  return result;
}

// ─── Status distribution ─────────────────────────────────────────────────────

export async function fetchStatusDistribution(): Promise<StatusPoint[]> {
  const { data } = await supabase.from('orders').select('status');
  const countMap: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = row.status ?? 'pending';
    countMap[s] = (countMap[s] ?? 0) + 1;
  }

  const allStatuses = ['paid', 'pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'];
  return allStatuses
    .map((s) => ({ label: statusLabel(s), value: countMap[s] ?? 0, color: statusColor(s) }))
    .filter((s) => s.value > 0);
}

// ─── Order list (with joins) ──────────────────────────────────────────────────

export interface OrderListFilter {
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface OrderListResult {
  rows: OrderRow[];
  total: number;
}

export async function fetchOrders(filter: OrderListFilter = {}): Promise<OrderListResult> {
  const { search = '', status = '', paymentStatus = '', dateFrom = '', dateTo = '', page = 1, pageSize = 20 } = filter;

  let q = supabase
    .from('orders')
    .select(
      `id, order_number, status, payment_status, subtotal_amount, discount_amount, shipping_fee, tax_amount, total_amount, coupon_code, delivery_method, notes, created_at, updated_at,
       shipping_addresses(id, recipient_name, email, phone, country, province, city, zip, street1, street2)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  if (paymentStatus) q = q.eq('payment_status', paymentStatus);
  if (dateFrom) q = q.gte('created_at', dateFrom);
  if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

  // Search by order_number — apply after other filters
  if (search) {
    q = q.or(`order_number.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  q = q.range(from, from + pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw error;

  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const addr = r.shipping_addresses as ShippingAddressRow | null;
    return {
      ...r,
      shipping_address: addr ?? undefined,
    } as OrderRow;
  });

  return { rows, total: count ?? 0 };
}

// ─── Single order detail (full) ───────────────────────────────────────────────

export async function fetchOrderDetail(orderId: string): Promise<OrderRow | null> {
  const [orderRes, itemsRes, paymentRes] = await Promise.all([
    supabase
      .from('orders')
      .select(`*, shipping_addresses(*)`)
      .eq('id', orderId)
      .maybeSingle(),
    supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId),
    supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle(),
  ]);

  if (!orderRes.data) return null;

  return {
    ...orderRes.data,
    shipping_address: orderRes.data.shipping_addresses ?? undefined,
    items: itemsRes.data ?? [],
    payment: paymentRes.data ?? undefined,
  } as OrderRow;
}

// ─── Update order status ──────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

// ─── Search helpers: search by email (from shipping_addresses) ────────────────

export async function searchOrdersByEmail(email: string): Promise<string[]> {
  const { data } = await supabase
    .from('shipping_addresses')
    .select('id')
    .ilike('email', `%${email}%`);
  return (data ?? []).map((r: { id: string }) => r.id);
}

export async function searchOrdersByCardLast4(last4: string): Promise<string[]> {
  const { data } = await supabase
    .from('payments')
    .select('order_id')
    .ilike('card_last4', `%${last4}%`);
  return (data ?? []).map((r: { order_id: string }) => r.order_id);
}

export async function searchOrdersByProductName(name: string): Promise<string[]> {
  const { data } = await supabase
    .from('order_items')
    .select('order_id')
    .ilike('product_name', `%${name}%`);
  return [...new Set((data ?? []).map((r: { order_id: string }) => r.order_id))];
}
