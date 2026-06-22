import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  fetchProviderConfig,
  getSupabaseAdmin,
  markPaymentFailed,
  markPaymentPaid,
  markPaymentRefunded,
} from '../_shared/payment.ts';
import { getPaymentSecret } from '../_shared/secret-store.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabase = getSupabaseAdmin();
    const provider = await fetchProviderConfig(supabase, 'stripe');
    const endpointSecret = await getPaymentSecret(supabase, 'stripe', 'stripe_webhook_secret', provider.webhookSecretRef || 'STRIPE_WEBHOOK_SECRET');
    const signature = req.headers.get('stripe-signature') || '';
    const rawBody = await req.text();

    await verifyStripeSignature(rawBody, signature, endpointSecret);
    const event = JSON.parse(rawBody) as StripeEvent;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeCheckoutSession;
      await markPaymentPaid(supabase, {
        orderId: session.metadata?.order_id ?? session.client_reference_id,
        paymentId: session.metadata?.payment_id,
        transactionId: session.payment_intent || session.id,
        gatewayResponse: { provider: 'stripe', event },
      });
    }

    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const object = event.data.object as StripeCheckoutSession;
      await markPaymentFailed(supabase, {
        orderId: object.metadata?.order_id ?? object.client_reference_id,
        paymentId: object.metadata?.payment_id,
        transactionId: object.id,
        gatewayResponse: { provider: 'stripe', event },
      });
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as { payment_intent?: string; id: string };
      await markPaymentRefunded(supabase, charge.payment_intent || charge.id, { provider: 'stripe', event });
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Stripe webhook failed' }, { status: 400 });
  }
});

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
}

interface StripeCheckoutSession {
  id: string;
  payment_intent?: string;
  client_reference_id?: string;
  metadata?: {
    order_id?: string;
    payment_id?: string;
  };
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, item) => {
    const [key, value] = item.split('=');
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] ?? []), value];
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) throw new Error('Missing Stripe signature');

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error('Stripe signature timestamp outside tolerance');

  const signedPayload = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  if (!signatures.some((signature) => timingSafeEqual(signature, expected))) {
    throw new Error('Stripe signature verification failed');
  }
}

async function hmacSha256Hex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}
