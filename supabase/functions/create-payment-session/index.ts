import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  createPendingPaymentOrder,
  fetchProviderConfig,
  formatAmount,
  getFunctionBaseUrl,
  getPublicSiteUrl,
  getSupabaseAdmin,
  toMinorUnit,
  type PaymentProviderConfig,
  type ProductionCheckoutInput,
} from '../_shared/payment.ts';
import { getPaypalAccessToken, getPaypalBaseUrl } from '../_shared/paypal.ts';
import { getPaymentSecret } from '../_shared/secret-store.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const input = await req.json() as ProductionCheckoutInput;
    const supabase = getSupabaseAdmin();
    const provider = await fetchProviderConfig(supabase, input.payment);
    const pending = await createPendingPaymentOrder(supabase, input);
    const siteUrl = getPublicSiteUrl(req);
    const functionBaseUrl = getFunctionBaseUrl(req);

    if (input.payment === 'stripe') {
      const session = await createStripeCheckoutSession({
        supabase,
        provider,
        input,
        siteUrl,
        pending,
      });

      await supabase
        .from('payments')
        .update({
          transaction_id: session.id,
          gateway_response: {
            mode: 'production',
            provider: 'stripe',
            checkout_session_id: session.id,
            checkout_url: session.url,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', pending.paymentId);

      return jsonResponse({
        provider: 'stripe',
        orderId: pending.orderId,
        orderNumber: pending.orderNumber,
        paymentId: pending.paymentId,
        redirectUrl: session.url,
      });
    }

    if (input.payment === 'paypal') {
      const order = await createPaypalOrder({
        supabase,
        provider,
        input,
        siteUrl,
        functionBaseUrl,
        pending,
      });
      const approvalUrl = order.links?.find((link: { rel: string; href: string }) => link.rel === 'approve')?.href;
      if (!approvalUrl) throw new Error('PayPal did not return an approval URL');

      await supabase
        .from('payments')
        .update({
          transaction_id: order.id,
          gateway_response: {
            mode: 'production',
            provider: 'paypal',
            paypal_order_id: order.id,
            status: order.status,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', pending.paymentId);

      return jsonResponse({
        provider: 'paypal',
        orderId: pending.orderId,
        orderNumber: pending.orderNumber,
        paymentId: pending.paymentId,
        redirectUrl: approvalUrl,
      });
    }

    return jsonResponse({ error: 'Unsupported production payment provider' }, { status: 400 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Create payment session failed' }, { status: 400 });
  }
});

async function createStripeCheckoutSession({
  supabase,
  provider,
  input,
  siteUrl,
  pending,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  provider: PaymentProviderConfig;
  input: ProductionCheckoutInput;
  siteUrl: string;
  pending: { orderId: string; orderNumber: string; paymentId: string };
}) {
  const currency = (provider.settlementCurrency || 'USD').toLowerCase();
  const secretKey = await getPaymentSecret(supabase, 'stripe', 'stripe_secret_key', provider.secretKeyRef || 'STRIPE_SECRET_KEY');
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('client_reference_id', pending.orderId);
  params.set('customer_email', input.email);
  params.set('success_url', `${siteUrl}/?checkout_return=success&provider=stripe&orderId=${pending.orderId}&orderNumber=${encodeURIComponent(pending.orderNumber)}&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${siteUrl}/?checkout_return=cancel&provider=stripe&orderId=${pending.orderId}&orderNumber=${encodeURIComponent(pending.orderNumber)}`);
  params.set('metadata[order_id]', pending.orderId);
  params.set('metadata[order_number]', pending.orderNumber);
  params.set('metadata[payment_id]', pending.paymentId);
  params.set('payment_intent_data[metadata][order_id]', pending.orderId);
  params.set('payment_intent_data[metadata][payment_id]', pending.paymentId);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', currency);
  params.set('line_items[0][price_data][unit_amount]', String(toMinorUnit(input.total, currency)));
  params.set('line_items[0][price_data][product_data][name]', `ShopNova ${pending.orderNumber}`);
  params.set('line_items[0][price_data][product_data][description]', `${input.cart.length} item(s), shipping included`);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Stripe Checkout session failed');
  if (!data.url || !data.id) throw new Error('Stripe response missing checkout URL');
  return data as { id: string; url: string };
}

async function createPaypalOrder({
  supabase,
  provider,
  input,
  siteUrl,
  functionBaseUrl,
  pending,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  provider: PaymentProviderConfig;
  input: ProductionCheckoutInput;
  siteUrl: string;
  functionBaseUrl: string;
  pending: { orderId: string; orderNumber: string; paymentId: string };
}) {
  const baseUrl = getPaypalBaseUrl(provider);
  const clientSecret = await getPaymentSecret(supabase, 'paypal', 'paypal_client_secret', provider.secretKeyRef || 'PAYPAL_CLIENT_SECRET');
  const accessToken = await getPaypalAccessToken(provider, baseUrl, clientSecret);
  const currency = (provider.settlementCurrency || 'USD').toUpperCase();
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': pending.orderId,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: pending.orderId,
          invoice_id: pending.orderNumber,
          custom_id: pending.paymentId,
          description: `ShopNova ${pending.orderNumber}`,
          amount: {
            currency_code: currency,
            value: formatAmount(input.total),
          },
        },
      ],
      application_context: {
        brand_name: 'ShopNova',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: `${functionBaseUrl}/paypal-return?shopnovaOrderId=${pending.orderId}&orderNumber=${encodeURIComponent(pending.orderNumber)}&siteUrl=${encodeURIComponent(siteUrl)}`,
        cancel_url: `${siteUrl}/?checkout_return=cancel&provider=paypal&orderId=${pending.orderId}&orderNumber=${encodeURIComponent(pending.orderNumber)}`,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || data?.details?.[0]?.description || 'PayPal order creation failed');
  return data as { id: string; status: string; links?: Array<{ rel: string; href: string }> };
}
