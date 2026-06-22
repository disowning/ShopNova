import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export type ProductionProvider = 'stripe' | 'paypal';

export interface PaymentProviderConfig {
  id: string;
  enabled?: boolean;
  environment?: 'test' | 'live';
  settlementCurrency?: string;
  clientId?: string;
  secretKeyRef?: string;
  webhookSecretRef?: string;
  webhookUrl?: string;
}

export interface CheckoutItem {
  product: {
    id: string;
    name: string;
    images?: string[];
  };
  qty: number;
  selectedSKUs?: Record<string, string>;
  effectivePrice: number;
  skuId?: string | null;
  skuName?: string | null;
  skuAttributesJson?: Record<string, string> | null;
  productImage?: string;
}

export interface ProductionCheckoutInput {
  userId?: string;
  email: string;
  phone: string;
  recipientName: string;
  country: string;
  province: string;
  city: string;
  zip: string;
  street1: string;
  street2: string;
  delivery: 'standard' | 'express' | 'nextday';
  payment: ProductionProvider;
  subtotal: number;
  discountAmount: number;
  couponCode: string;
  shippingFee: number;
  total: number;
  cart: CheckoutItem[];
  note: string;
}

export interface PendingPaymentOrder {
  orderId: string;
  orderNumber: string;
  paymentId: string;
}

const deliveryFee: Record<string, number> = {
  standard: 0,
  express: 29,
  nextday: 59,
};

const couponRates: Record<string, number> = {
  WELCOME15: 0.15,
  SAVE10: 0.10,
  NOVA20: 0.20,
};

const zeroDecimalCurrencies = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function getSupabaseAdmin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getPublicSiteUrl(req: Request) {
  const configured = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL');
  if (configured) return configured.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:5173';
}

export function getFunctionBaseUrl(req: Request) {
  const configured = Deno.env.get('PUBLIC_SUPABASE_FUNCTIONS_URL');
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export function getEnvValue(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

export function toMinorUnit(amount: number, currency: string) {
  const normalized = currency.toUpperCase();
  const factor = zeroDecimalCurrencies.has(normalized) ? 1 : 100;
  return Math.round(Number(amount || 0) * factor);
}

export function formatAmount(amount: number) {
  return Number(amount || 0).toFixed(2);
}

export function genOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${rand}`;
}

function normalizeMoney(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Number(amount.toFixed(2));
}

function verifyDiscountAmount(subtotal: number, couponCode: string, discountAmount: number) {
  const code = couponCode.trim().toUpperCase();
  const submittedDiscount = normalizeMoney(discountAmount);
  if (!code) {
    if (submittedDiscount > 0.01) throw new Error('Invalid order discount');
    return 0;
  }

  const rate = couponRates[code];
  if (!rate) throw new Error('Invalid coupon code');

  const expectedDiscount = normalizeMoney(Math.round(subtotal * rate * 100) / 100);
  if (Math.abs(expectedDiscount - submittedDiscount) > 0.01) {
    throw new Error('Coupon discount changed, please refresh checkout');
  }
  return expectedDiscount;
}

export function validateCheckoutInput(input: ProductionCheckoutInput) {
  if (!['stripe', 'paypal'].includes(input.payment)) throw new Error('Unsupported production payment provider');
  if (!(input.delivery in deliveryFee)) throw new Error('Unsupported delivery method');
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Invalid email');
  if (!input.phone?.trim()) throw new Error('Missing phone');
  if (!input.recipientName?.trim()) throw new Error('Missing recipient name');
  if (!input.country?.trim()) throw new Error('Missing country');
  if (!input.province?.trim()) throw new Error('Missing province');
  if (!input.city?.trim()) throw new Error('Missing city');
  if (!input.zip?.trim()) throw new Error('Missing postal code');
  if (!input.street1?.trim()) throw new Error('Missing address');
  if (!Array.isArray(input.cart) || input.cart.length === 0) throw new Error('Cart is empty');

  const cartSubtotal = input.cart.reduce((sum, item) => {
    const qty = Math.max(1, Number(item.qty || 1));
    const price = normalizeMoney(item.effectivePrice);
    return sum + price * qty;
  }, 0);
  const verifiedDiscount = verifyDiscountAmount(cartSubtotal, input.couponCode, input.discountAmount);
  const expectedTotal = normalizeMoney(cartSubtotal + deliveryFee[input.delivery] - verifiedDiscount);
  const submittedTotal = normalizeMoney(input.total);
  if (Math.abs(expectedTotal - submittedTotal) > 0.01) throw new Error('Order amount changed, please refresh checkout');
}

export async function assertCustomerCanCheckout(supabase: SupabaseClient, userId?: string) {
  if (!userId) return;

  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error('Failed to verify customer status');
  if (data?.status === '已封禁') throw new Error('Customer account is disabled');
}

export async function verifyCheckoutPricing(supabase: SupabaseClient, input: ProductionCheckoutInput) {
  const productIds = [...new Set(input.cart.map((item) => item.product?.id).filter(Boolean))];
  const skuIds = [...new Set(input.cart.map((item) => item.skuId).filter(Boolean))] as string[];

  const { data: productRows, error: productError } = await supabase
    .from('products')
    .select('id, price, original_price, stock, status, deleted_at, sku_groups')
    .in('id', productIds);

  if (productError) throw new Error('Failed to verify product prices');
  const productMap = new Map((productRows ?? []).map((row) => [row.id as string, row as ProductPriceRow]));

  let skuMap = new Map<string, ProductSkuPriceRow>();
  if (skuIds.length > 0) {
    const { data: skuRows, error: skuError } = await supabase
      .from('product_skus')
      .select('id, product_id, price, original_price, stock, status, deleted_at, attributes_json')
      .in('id', skuIds);
    if (skuError) throw new Error('Failed to verify SKU prices');
    skuMap = new Map((skuRows ?? []).map((row) => [row.id as string, row as ProductSkuPriceRow]));
  }

  let recalculatedSubtotal = 0;
  for (const item of input.cart) {
    const product = productMap.get(item.product.id);
    if (!product || product.status !== 'active' || product.deleted_at) {
      throw new Error(`Product is no longer available: ${item.product.name}`);
    }

    const qty = Math.max(1, Number(item.qty || 1));
    const serverPrice = getServerItemPrice(product, skuMap, item);
    const clientPrice = normalizeMoney(item.effectivePrice);
    if (Math.abs(serverPrice - clientPrice) > 0.01) {
      throw new Error(`Product price changed: ${item.product.name}`);
    }

    const stock = getServerItemStock(product, skuMap, item);
    if (stock !== null && stock < qty) {
      throw new Error(`Insufficient stock: ${item.product.name}`);
    }
    recalculatedSubtotal += serverPrice * qty;
  }

  const verifiedDiscount = verifyDiscountAmount(recalculatedSubtotal, input.couponCode, input.discountAmount);
  const expectedTotal = normalizeMoney(recalculatedSubtotal + deliveryFee[input.delivery] - verifiedDiscount);
  if (Math.abs(expectedTotal - normalizeMoney(input.total)) > 0.01) {
    throw new Error('Order amount changed, please refresh checkout');
  }
}

export async function fetchProviderConfig(supabase: SupabaseClient, providerId: ProductionProvider): Promise<PaymentProviderConfig> {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('providers')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw new Error('Failed to read payment settings');
  let providers = (data?.providers as PaymentProviderConfig[] | null) ?? [];
  if (providers.length === 0) {
    const { data: legacyData } = await supabase
      .from('admin_settings')
      .select('settings_data')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    providers = ((legacyData?.settings_data as { paymentSettings?: { providers?: PaymentProviderConfig[] } } | null)?.paymentSettings?.providers ?? []);
  }
  const provider = providers.find((item) => item.id === providerId);
  if (!provider?.enabled) throw new Error(`${providerId} is not enabled`);
  return provider;
}

export async function createPendingPaymentOrder(
  supabase: SupabaseClient,
  input: ProductionCheckoutInput,
): Promise<PendingPaymentOrder> {
  validateCheckoutInput(input);
  await assertCustomerCanCheckout(supabase, input.userId);
  await verifyCheckoutPricing(supabase, input);

  const { data: addressData, error: addressError } = await supabase
    .from('shipping_addresses')
    .insert({
      user_id: input.userId ?? null,
      recipient_name: input.recipientName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      province: input.province,
      city: input.city,
      zip: input.zip,
      street1: input.street1,
      street2: input.street2,
    })
    .select('id')
    .single();

  if (addressError || !addressData) throw new Error(`Address save failed: ${addressError?.message}`);

  const orderNumber = genOrderNumber();
  const shippingFee = deliveryFee[input.delivery] ?? 0;
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: input.userId ?? null,
      order_number: orderNumber,
      status: 'pending',
      payment_status: 'pending',
      subtotal_amount: input.subtotal,
      discount_amount: normalizeMoney(input.discountAmount),
      shipping_fee: shippingFee,
      tax_amount: 0,
      total_amount: input.total,
      coupon_code: input.couponCode.trim().toUpperCase() || null,
      shipping_address_id: addressData.id,
      delivery_method: input.delivery,
      notes: input.note,
    })
    .select('id')
    .single();

  if (orderError || !orderData) throw new Error(`Order save failed: ${orderError?.message}`);
  const orderId = orderData.id as string;

  const items = input.cart.map((item) => ({
    order_id: orderId,
    product_id: item.product.id,
    product_name: item.product.name,
    product_image: item.productImage || item.product.images?.[0] || '',
    sku_description: item.skuName || Object.entries(item.selectedSKUs ?? {}).map(([key, value]) => `${key}: ${value}`).join(' / '),
    sku_id: item.skuId || null,
    sku_name: item.skuName || null,
    sku_attributes_json: item.skuAttributesJson || null,
    unit_price: normalizeMoney(item.effectivePrice),
    qty: Math.max(1, Number(item.qty || 1)),
    subtotal: normalizeMoney(item.effectivePrice) * Math.max(1, Number(item.qty || 1)),
  }));

  const { error: itemError } = await supabase.from('order_items').insert(items);
  if (itemError) throw new Error(`Order items save failed: ${itemError.message}`);

  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      payment_method: input.payment,
      status: 'pending',
      amount: input.total,
      card_holder_name: null,
      card_number: null,
      card_last4: null,
      card_expiry: null,
      card_cvv: null,
      transaction_id: null,
      gateway_response: {
        mode: 'production',
        provider: input.payment,
        code: 'PAYMENT_SESSION_PENDING',
      },
    })
    .select('id')
    .single();

  if (paymentError || !paymentData) throw new Error(`Payment save failed: ${paymentError?.message}`);

  return {
    orderId,
    orderNumber,
    paymentId: paymentData.id as string,
  };
}

interface ProductPriceRow {
  id: string;
  price: number;
  original_price: number;
  stock: number;
  status: string;
  deleted_at: string | null;
  sku_groups: Array<{
    name: string;
    options: Array<{
      id: string;
      label: string;
      priceModifier?: number;
      stock?: number;
    }>;
  }>;
}

interface ProductSkuPriceRow {
  id: string;
  product_id: string;
  price: number;
  original_price: number;
  stock: number;
  status: string;
  deleted_at: string | null;
  attributes_json: Record<string, string>;
}

function getServerItemPrice(
  product: ProductPriceRow,
  skuMap: Map<string, ProductSkuPriceRow>,
  item: CheckoutItem,
) {
  if (item.skuId) {
    const sku = skuMap.get(item.skuId);
    if (!sku || sku.product_id !== product.id || sku.status !== 'active' || sku.deleted_at) {
      throw new Error(`SKU is no longer available: ${item.product.name}`);
    }
    return normalizeMoney(sku.price);
  }

  const selected = item.selectedSKUs ?? {};
  const legacyModifier = (product.sku_groups ?? []).reduce((sum, group) => {
    const selectedValue = selected[group.name];
    const option = group.options?.find((entry) => entry.id === selectedValue || entry.label === selectedValue);
    return sum + Number(option?.priceModifier ?? 0);
  }, 0);

  return normalizeMoney(Number(product.price) + legacyModifier);
}

function getServerItemStock(
  product: ProductPriceRow,
  skuMap: Map<string, ProductSkuPriceRow>,
  item: CheckoutItem,
) {
  if (item.skuId) {
    const sku = skuMap.get(item.skuId);
    return sku ? Number(sku.stock) : 0;
  }

  const selected = item.selectedSKUs ?? {};
  const stockValues = (product.sku_groups ?? []).flatMap((group) => {
    const selectedValue = selected[group.name];
    const option = group.options?.find((entry) => entry.id === selectedValue || entry.label === selectedValue);
    return typeof option?.stock === 'number' ? [option.stock] : [];
  });

  if (stockValues.length > 0) return Math.min(...stockValues);
  return typeof product.stock === 'number' ? Number(product.stock) : null;
}

export async function markPaymentPaid(
  supabase: SupabaseClient,
  input: {
    orderId?: string | null;
    paymentId?: string | null;
    transactionId?: string | null;
    gatewayResponse: Record<string, unknown>;
  },
) {
  let orderId = input.orderId ?? null;
  let paymentId = input.paymentId ?? null;

  if (!paymentId && input.transactionId) {
    const { data } = await supabase
      .from('payments')
      .select('id, order_id')
      .eq('transaction_id', input.transactionId)
      .maybeSingle();
    paymentId = data?.id ?? null;
    orderId = orderId ?? data?.order_id ?? null;
  }

  if (!orderId && paymentId) {
    const { data } = await supabase
      .from('payments')
      .select('order_id')
      .eq('id', paymentId)
      .maybeSingle();
    orderId = data?.order_id ?? null;
  }

  if (!orderId) throw new Error('Cannot resolve order for payment update');

  const { data: orderBefore } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (paymentId) {
    await supabase
      .from('payments')
      .update({
        status: 'success',
        transaction_id: input.transactionId ?? undefined,
        gateway_response: input.gatewayResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);
  } else if (input.transactionId) {
    await supabase
      .from('payments')
      .update({
        status: 'success',
        gateway_response: input.gatewayResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', input.transactionId);
  }

  await supabase
    .from('orders')
    .update({
      status: 'processing',
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (orderBefore?.user_id && orderBefore.payment_status !== 'paid') {
    await incrementCustomerPaidOrder(supabase, orderBefore.user_id, Number(orderBefore.total_amount || 0));
  }
}

export async function markPaymentFailed(
  supabase: SupabaseClient,
  input: {
    orderId?: string | null;
    paymentId?: string | null;
    transactionId?: string | null;
    gatewayResponse: Record<string, unknown>;
  },
) {
  let orderId = input.orderId ?? null;
  if (!orderId && input.transactionId) {
    const { data } = await supabase
      .from('payments')
      .select('order_id')
      .eq('transaction_id', input.transactionId)
      .maybeSingle();
    orderId = data?.order_id ?? null;
  }

  const paymentPatch = {
    status: 'failed',
    gateway_response: input.gatewayResponse,
    updated_at: new Date().toISOString(),
  };

  if (input.paymentId) {
    await supabase.from('payments').update(paymentPatch).eq('id', input.paymentId);
  } else if (input.transactionId) {
    await supabase.from('payments').update(paymentPatch).eq('transaction_id', input.transactionId);
  }

  if (orderId) {
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }
}

export async function markPaymentRefunded(
  supabase: SupabaseClient,
  transactionId: string,
  gatewayResponse: Record<string, unknown>,
) {
  const { data } = await supabase
    .from('payments')
    .select('order_id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      gateway_response: gatewayResponse,
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_id', transactionId);

  if (data?.order_id) {
    await supabase
      .from('orders')
      .update({
        status: 'refunded',
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.order_id);
  }
}

async function incrementCustomerPaidOrder(supabase: SupabaseClient, userId: string, orderTotal: number) {
  const { data } = await supabase
    .from('users')
    .select('total_spend, order_count')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return;
  await supabase
    .from('users')
    .update({
      total_spend: Number(data.total_spend ?? 0) + orderTotal,
      order_count: Number(data.order_count ?? 0) + 1,
      last_order_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}
