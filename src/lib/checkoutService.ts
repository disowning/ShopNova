import { supabase } from './supabase';
import type { CartItem } from '../storefront/StoreContext';
import type { DeliveryMethod } from '../storefront/checkout/DeliveryMethodSelector';
import type { PaymentMethod, CardData } from '../storefront/checkout/PaymentMethodSelector';
import { fetchPublicCustomerRules, getMemberLevelByRules } from './customerRules';
import { createCheckoutRiskOrder } from './riskService';
import { fetchStorefrontPaymentOptions } from './paymentSettings';

export interface CheckoutInput {
  // Auth
  userId?: string;
  // Contact
  email: string;
  phone: string;
  // Address
  recipientName: string;
  country: string;
  province: string;
  city: string;
  zip: string;
  street1: string;
  street2: string;
  // Options
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  cardData: CardData;
  // Pricing
  subtotal: number;
  discountAmount: number;
  couponCode: string;
  shippingFee: number;
  total: number;
  // Cart
  cart: CartItem[];
  // Notes
  note: string;
}

export interface SimulatedPaymentResult {
  success: true;
  transactionId: string;
  gatewayResponse: Record<string, unknown>;
}

export function simulatePayment(): Promise<SimulatedPaymentResult> {
  // DEV/TEST MODE: always returns success after a brief delay.
  // Replace this function body with a real payment gateway call before going live.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `SIM-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        gatewayResponse: {
          mode: 'simulation',
          code: 'PAYMENT_SUCCESS',
          message: 'Simulated payment approved',
          timestamp: new Date().toISOString(),
        },
      });
    }, 800);
  });
}

function genOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}-${rand}`;
}

const deliveryFee: Record<DeliveryMethod, number> = {
  standard: 0,
  express: 29,
  nextday: 59,
};

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  redirectUrl?: string;
}

async function syncCustomerOrderSummary(userId: string | undefined, orderTotal: number, isPaid: boolean) {
  if (!userId) return;

  const { data } = await supabase
    .from('users')
    .select('total_spend, order_count')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return;

  const nextSpend = Number(data.total_spend ?? 0) + (isPaid ? orderTotal : 0);
  const nextOrderCount = Number(data.order_count ?? 0) + 1;
  const customerRules = await fetchPublicCustomerRules();

  await supabase
    .from('users')
    .update({
      total_spend: nextSpend,
      order_count: nextOrderCount,
      last_order_at: new Date().toISOString(),
      member_level: getMemberLevelByRules(nextOrderCount, nextSpend, customerRules),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function assertCustomerCanCheckout(userId: string | undefined) {
  if (!userId) return;

  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error('无法验证客户状态，请稍后重试。');
  if (data?.status === '已封禁') throw new Error('账号已被封禁，无法继续下单。');
}

async function assertPaymentMethodAvailable(payment: PaymentMethod) {
  const options = await fetchStorefrontPaymentOptions();
  if (!options.some((option) => option.id === payment)) {
    throw new Error('当前支付方式未启用，请返回结算页重新选择可用支付方式。');
  }
}

export async function submitOrder(input: CheckoutInput): Promise<CheckoutResult> {
  await assertCustomerCanCheckout(input.userId);
  await assertPaymentMethodAvailable(input.payment);

  if (input.payment === 'stripe' || input.payment === 'paypal') {
    return createProductionPaymentSession(input);
  }

  // 1. Dev/test card payment stays simulated. Real gateways must be completed by
  // a server-side payment session and webhook before marking the order as paid.
  const isCashOnDelivery = input.payment === 'cod';
  const isDevTestCard = input.payment === 'card';
  const paymentResult = isDevTestCard ? await simulatePayment() : null;

  // 2. Save shipping address
  const { data: addressData, error: addrErr } = await supabase
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

  if (addrErr || !addressData) throw new Error(`Address save failed: ${addrErr?.message}`);

  // 3. Create order
  const orderNumber = genOrderNumber();
  const shippingFee = deliveryFee[input.delivery];
  const paymentStatus = isCashOnDelivery ? 'pending' : 'paid';
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: input.userId ?? null,
      order_number: orderNumber,
      status: isCashOnDelivery ? 'pending' : 'processing',
      payment_status: paymentStatus,
      subtotal_amount: input.subtotal,
      discount_amount: input.discountAmount,
      shipping_fee: shippingFee,
      tax_amount: 0,
      total_amount: input.total,
      coupon_code: input.couponCode || null,
      shipping_address_id: addressData.id,
      delivery_method: input.delivery,
      notes: input.note,
    })
    .select('id')
    .single();

  if (orderErr || !orderData) throw new Error(`Order save failed: ${orderErr?.message}`);
  const orderId = orderData.id;

  // 4. Create order items (with SKU snapshot)
  const items = input.cart.map((item) => ({
    order_id: orderId,
    product_id: item.product.id,
    product_name: item.product.name,
    product_image: item.productImage || item.product.images[0] || '',
    sku_description: item.skuName || Object.entries(item.selectedSKUs).map(([k, v]) => `${k}: ${v}`).join(' / '),
    sku_id: item.skuId || null,
    sku_name: item.skuName || null,
    sku_attributes_json: item.skuAttributesJson || null,
    unit_price: item.effectivePrice,
    qty: item.qty,
    subtotal: item.effectivePrice * item.qty,
  }));

  const { error: itemsErr } = await supabase.from('order_items').insert(items);
  if (itemsErr) throw new Error(`Order items save failed: ${itemsErr.message}`);

  // 5. Create payment record (dev/test mode only stores card details)
  const card = input.cardData;
  const rawNum = card.number.replace(/\s/g, '');
  const { error: payErr } = await supabase.from('payments').insert({
    order_id: orderId,
    payment_method: input.payment,
    status: isCashOnDelivery ? 'pending' : 'success',
    amount: input.total,
    card_holder_name: card.name || null,
    card_number: rawNum || null,
    card_last4: rawNum.length >= 4 ? rawNum.slice(-4) : null,
    card_expiry: card.expiry || null,
    card_cvv: card.cvv || null,
    transaction_id: paymentResult?.transactionId ?? null,
    gateway_response: paymentResult?.gatewayResponse ?? { mode: 'cash_on_delivery', code: 'PAYMENT_PENDING' },
  });

  if (payErr) throw new Error(`Payment save failed: ${payErr.message}`);

  let finalPaymentStatus = paymentStatus;
  try {
    const riskResult = await createCheckoutRiskOrder(orderId, input, paymentStatus);
    finalPaymentStatus = riskResult.paymentStatus ?? paymentStatus;
  } catch {
    finalPaymentStatus = paymentStatus;
  }

  await syncCustomerOrderSummary(input.userId, input.total, finalPaymentStatus === 'paid');

  return { orderId, orderNumber };
}

async function createProductionPaymentSession(input: CheckoutInput): Promise<CheckoutResult> {
  const { data, error } = await supabase.functions.invoke('create-payment-session', {
    body: input,
  });

  if (error) throw new Error(error.message || '创建真实支付会话失败');
  const result = data as Partial<CheckoutResult>;
  if (!result.orderId || !result.orderNumber || !result.redirectUrl) {
    throw new Error('真实支付会话返回数据不完整');
  }
  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    redirectUrl: result.redirectUrl,
  };
}
