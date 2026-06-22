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
  shipping_status: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  shipped_at: string | null;
  delivered_at: string | null;
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

export interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  status: string;
  paymentMethod: string;
  search: string;
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
  failed: '支付失败',
  success: '支付成功',
  unfulfilled: '待发货',
  preparing: '备货中',
  delivered: '已签收',
};

const STATUS_COLOR: Record<string, string> = {
  paid: '#10b981',
  pending: '#f59e0b',
  processing: '#3b82f6',
  shipped: '#06b6d4',
  completed: '#059669',
  cancelled: '#9ca3af',
  refunded: '#ef4444',
  failed: '#ef4444',
  success: '#10b981',
  unfulfilled: '#94a3b8',
  preparing: '#3b82f6',
  delivered: '#059669',
};

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}

export function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? '#9ca3af';
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '信用卡/借记卡',
  dev_card: '开发测试卡支付',
  stripe: 'Stripe 银行卡',
  paypal: 'PayPal',
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

function toDateStart(value: string) {
  return value ? new Date(`${value}T00:00:00.000`).toISOString() : '';
}

function toDateEnd(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : '';
}

function buildTrendRange(filter: Partial<DashboardFilters> = {}) {
  const end = filter.dateTo ? new Date(`${filter.dateTo}T00:00:00`) : new Date();
  const start = filter.dateFrom ? new Date(`${filter.dateFrom}T00:00:00`) : new Date(end);
  if (!filter.dateFrom) start.setDate(end.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function intersectIds(left: string[] | null, right: string[] | null) {
  if (left === null) return right;
  if (right === null) return left;
  const rightSet = new Set(right);
  return left.filter((id) => rightSet.has(id));
}

async function getOrderIdsBySearch(search: string) {
  const keyword = search.trim();
  if (!keyword) return null;

  const [orderRes, addressRes, itemRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id')
      .ilike('order_number', `%${keyword}%`),
    supabase
      .from('shipping_addresses')
      .select('id')
      .or(`email.ilike.%${keyword}%,recipient_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`),
    supabase
      .from('order_items')
      .select('order_id')
      .ilike('product_name', `%${keyword}%`),
  ]);

  const ids = new Set<string>((orderRes.data ?? []).map((row) => row.id));
  const addressIds = (addressRes.data ?? []).map((row) => row.id);

  if (addressIds.length > 0) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .in('shipping_address_id', addressIds);
    (data ?? []).forEach((row) => ids.add(row.id));
  }

  (itemRes.data ?? []).forEach((row) => {
    if (row.order_id) ids.add(row.order_id);
  });

  return [...ids];
}

async function getOrderIdsByPaymentMethod(paymentMethod: string) {
  if (!paymentMethod) return null;
  const { data } = await supabase
    .from('payments')
    .select('order_id')
    .eq('payment_method', paymentMethod);
  return [...new Set((data ?? []).map((row) => row.order_id).filter(Boolean))];
}

async function getRestrictedOrderIds(filter: Partial<DashboardFilters>) {
  const searchIds = await getOrderIdsBySearch(filter.search ?? '');
  const paymentMethodIds = await getOrderIdsByPaymentMethod(filter.paymentMethod ?? '');
  return intersectIds(searchIds, paymentMethodIds);
}

async function attachOrderRelations(rows: OrderRow[]) {
  const orderIds = rows.map((row) => row.id);
  if (orderIds.length === 0) return rows;

  const [itemsRes, paymentsRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds),
    supabase
      .from('payments')
      .select('*')
      .in('order_id', orderIds),
  ]);

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  (itemsRes.data ?? []).forEach((item) => {
    const row = item as OrderItemRow;
    if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, []);
    itemsByOrder.get(row.order_id)?.push(row);
  });

  const paymentByOrder = new Map<string, PaymentRow>();
  (paymentsRes.data ?? []).forEach((payment) => {
    const row = payment as PaymentRow;
    paymentByOrder.set(row.order_id, row);
  });

  return rows.map((row) => ({
    ...row,
    items: itemsByOrder.get(row.id) ?? [],
    payment: paymentByOrder.get(row.id),
  }));
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function fetchDashboardStats(filter: Partial<DashboardFilters> = {}): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const restrictedIds = await getRestrictedOrderIds(filter);
  if (restrictedIds && restrictedIds.length === 0) {
    return { totalOrders: 0, todayOrders: 0, paidOrders: 0, pendingOrders: 0, riskOrders: 0, totalRevenue: 0 };
  }

  let query = supabase
    .from('orders')
    .select('id, status, payment_status, total_amount, created_at');

  if (filter.dateFrom) query = query.gte('created_at', toDateStart(filter.dateFrom));
  if (filter.dateTo) query = query.lte('created_at', toDateEnd(filter.dateTo));
  if (filter.status) query = query.eq('status', filter.status);
  if (restrictedIds) query = query.in('id', restrictedIds);

  const { data } = await query;
  const rows = data ?? [];
  const totalRevenue = rows
    .filter((row) => row.payment_status === 'paid')
    .reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

  return {
    totalOrders: rows.length,
    todayOrders: rows.filter((row) => new Date(row.created_at) >= todayStart).length,
    paidOrders: rows.filter((row) => row.payment_status === 'paid').length,
    pendingOrders: rows.filter((row) => ['pending', 'processing'].includes(row.status)).length,
    riskOrders: await fetchRiskOrderCount(filter),
    totalRevenue,
  };
}

// ─── Trend (last 30 days) ────────────────────────────────────────────────────

export async function fetchTrend30Days(filter: Partial<DashboardFilters> = {}): Promise<TrendPoint[]> {
  const { start, end } = buildTrendRange(filter);
  const restrictedIds = await getRestrictedOrderIds(filter);

  if (restrictedIds && restrictedIds.length === 0) {
    const empty: TrendPoint[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      empty.push({ day: formatDayLabel(cursor), orders: 0 });
    }
    return empty;
  }

  let query = supabase
    .from('orders')
    .select('created_at')
    .gte('created_at', toDateStart(formatDateKey(start)))
    .lte('created_at', toDateEnd(formatDateKey(end)));

  if (filter.status) query = query.eq('status', filter.status);
  if (restrictedIds) query = query.in('id', restrictedIds);

  const { data } = await query;

  // Build a map: YYYY-MM-DD → count
  const countMap: Record<string, number> = {};
  for (const row of data ?? []) {
    const d = formatDateKey(new Date(row.created_at));
    countMap[d] = (countMap[d] ?? 0) + 1;
  }

  // Fill all 30 days including zeros
  const result: TrendPoint[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = formatDateKey(cursor);
    result.push({ day: formatDayLabel(cursor), orders: countMap[key] ?? 0 });
  }
  return result;
}

// ─── Status distribution ─────────────────────────────────────────────────────

export async function fetchStatusDistribution(filter: Partial<DashboardFilters> = {}): Promise<StatusPoint[]> {
  const restrictedIds = await getRestrictedOrderIds(filter);
  if (restrictedIds && restrictedIds.length === 0) return [];

  let query = supabase.from('orders').select('id, status, created_at');
  if (filter.dateFrom) query = query.gte('created_at', toDateStart(filter.dateFrom));
  if (filter.dateTo) query = query.lte('created_at', toDateEnd(filter.dateTo));
  if (filter.status) query = query.eq('status', filter.status);
  if (restrictedIds) query = query.in('id', restrictedIds);

  const { data } = await query;
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
  paymentMethod?: string;
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
  const { status = '', paymentStatus = '', paymentMethod = '', dateFrom = '', dateTo = '', page = 1, pageSize = 20 } = filter;
  const restrictedIds = await getRestrictedOrderIds({
    search: filter.search ?? '',
    paymentMethod,
  });

  if (restrictedIds && restrictedIds.length === 0) return { rows: [], total: 0 };

  let q = supabase
    .from('orders')
    .select(
      `*,
       shipping_addresses(id, recipient_name, email, phone, country, province, city, zip, street1, street2)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  if (paymentStatus) q = q.eq('payment_status', paymentStatus);
  if (dateFrom) q = q.gte('created_at', toDateStart(dateFrom));
  if (dateTo) q = q.lte('created_at', toDateEnd(dateTo));
  if (restrictedIds) q = q.in('id', restrictedIds);

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

  return { rows: await attachOrderRelations(rows), total: count ?? 0 };
}

export async function fetchRiskOrderCount(filter: Partial<DashboardFilters> = {}) {
  try {
    let query = supabase
      .from('risk_orders')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', '待审核');

    if (filter.dateFrom) query = query.gte('created_at', toDateStart(filter.dateFrom));
    if (filter.dateTo) query = query.lte('created_at', toDateEnd(filter.dateTo));
    if (filter.search) query = query.ilike('user_email', `%${filter.search.trim()}%`);

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
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

function buildFulfillmentPatchFromStatus(status: string) {
  const now = new Date().toISOString();
  if (status === 'processing') return { shipping_status: 'preparing' };
  if (status === 'shipped') return { shipping_status: 'shipped', shipped_at: now };
  if (status === 'completed') return { shipping_status: 'delivered', shipped_at: now, delivered_at: now };
  if (status === 'cancelled' || status === 'refunded') return { shipping_status: 'cancelled' };
  return {};
}

function isMissingFulfillmentColumnError(error: { message?: string; details?: string; hint?: string }) {
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return text.includes('shipping_status')
    || text.includes('carrier')
    || text.includes('tracking_number')
    || text.includes('tracking_url')
    || text.includes('shipped_at')
    || text.includes('delivered_at')
    || text.includes('column');
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const fulfillmentPatch = buildFulfillmentPatchFromStatus(status);
  const { error } = await supabase
    .from('orders')
    .update({
      status,
      ...fulfillmentPatch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (!error) return;

  if (Object.keys(fulfillmentPatch).length > 0 && isMissingFulfillmentColumnError(error)) {
    const { error: retryError } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (retryError) throw retryError;
    return;
  }

  throw error;
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<void> {
  const paymentRecordStatus: Record<string, string> = {
    paid: 'success',
    pending: 'pending',
    failed: 'failed',
    refunded: 'refunded',
  };
  const orderPatch: Record<string, string> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (paymentStatus === 'refunded') orderPatch.status = 'refunded';
  if (paymentStatus === 'failed') orderPatch.status = 'cancelled';

  const { error: orderError } = await supabase
    .from('orders')
    .update(orderPatch)
    .eq('id', orderId);
  if (orderError) throw orderError;

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: paymentRecordStatus[paymentStatus] ?? paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId);
  if (paymentError) throw paymentError;
}

export interface OrderFulfillmentInput {
  shippingStatus: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

export async function updateOrderFulfillment(orderId: string, input: OrderFulfillmentInput): Promise<void> {
  const now = new Date().toISOString();
  const patch: Record<string, string | null> = {
    shipping_status: input.shippingStatus,
    carrier: input.carrier.trim(),
    tracking_number: input.trackingNumber.trim(),
    tracking_url: input.trackingUrl.trim(),
    updated_at: now,
  };

  if (input.shippingStatus === 'preparing') patch.status = 'processing';
  if (input.shippingStatus === 'shipped') {
    patch.status = 'shipped';
    patch.shipped_at = now;
  }
  if (input.shippingStatus === 'delivered') {
    patch.status = 'completed';
    patch.shipped_at = now;
    patch.delivered_at = now;
  }
  if (input.shippingStatus === 'cancelled') patch.status = 'cancelled';

  const { error } = await supabase
    .from('orders')
    .update(patch)
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
