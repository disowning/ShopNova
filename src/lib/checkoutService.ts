import { supabase } from './supabase';
import type { CartItem } from '../storefront/StoreContext';
import type { DeliveryMethod } from '../storefront/checkout/DeliveryMethodSelector';
import type { PaymentMethod, CardData } from '../storefront/checkout/PaymentMethodSelector';

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

export function simulatePayment(_input: CheckoutInput): Promise<SimulatedPaymentResult> {
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
}

export async function submitOrder(input: CheckoutInput): Promise<CheckoutResult> {
  // 1. Simulate payment (always succeeds in dev mode)
  const paymentResult = await simulatePayment(input);

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
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: input.userId ?? null,
      order_number: orderNumber,
      status: 'paid',
      payment_status: 'paid',
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

  // 5. Create payment record (dev/test mode — stores full card data)
  const card = input.cardData;
  const rawNum = card.number.replace(/\s/g, '');
  const { error: payErr } = await supabase.from('payments').insert({
    order_id: orderId,
    payment_method: input.payment,
    status: 'success',
    amount: input.total,
    card_holder_name: card.name || null,
    card_number: rawNum || null,
    card_last4: rawNum.length >= 4 ? rawNum.slice(-4) : null,
    card_expiry: card.expiry || null,
    card_cvv: card.cvv || null,
    transaction_id: paymentResult.transactionId,
    gateway_response: paymentResult.gatewayResponse,
  });

  if (payErr) throw new Error(`Payment save failed: ${payErr.message}`);

  return { orderId, orderNumber };
}
