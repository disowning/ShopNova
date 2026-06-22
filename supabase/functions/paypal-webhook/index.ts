import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  fetchProviderConfig,
  getSupabaseAdmin,
  markPaymentFailed,
  markPaymentPaid,
  markPaymentRefunded,
} from '../_shared/payment.ts';
import { getPaypalAccessToken, getPaypalBaseUrl } from '../_shared/paypal.ts';
import { getPaymentSecret } from '../_shared/secret-store.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const supabase = getSupabaseAdmin();
    const provider = await fetchProviderConfig(supabase, 'paypal');
    const baseUrl = getPaypalBaseUrl(provider);
    const clientSecret = await getPaymentSecret(supabase, 'paypal', 'paypal_client_secret', provider.secretKeyRef || 'PAYPAL_CLIENT_SECRET');
    const accessToken = await getPaypalAccessToken(provider, baseUrl, clientSecret);
    const event = await req.json() as PaypalWebhookEvent;

    await verifyPaypalWebhook(req, event, provider, baseUrl, accessToken);

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
      await markPaymentPaid(supabase, {
        transactionId: paypalOrderId,
        gatewayResponse: { provider: 'paypal', event },
      });
    }

    if (event.event_type === 'PAYMENT.CAPTURE.DENIED' || event.event_type === 'CHECKOUT.ORDER.VOIDED') {
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id;
      await markPaymentFailed(supabase, {
        transactionId: paypalOrderId,
        gatewayResponse: { provider: 'paypal', event },
      });
    }

    if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id;
      if (paypalOrderId) await markPaymentRefunded(supabase, paypalOrderId, { provider: 'paypal', event });
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'PayPal webhook failed' }, { status: 400 });
  }
});

interface PaypalWebhookEvent {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}

async function verifyPaypalWebhook(
  req: Request,
  event: PaypalWebhookEvent,
  provider: { webhookSecretRef?: string },
  baseUrl: string,
  accessToken: string,
) {
  const supabase = getSupabaseAdmin();
  const webhookId = await getPaymentSecret(supabase, 'paypal', 'paypal_webhook_id', provider.webhookSecretRef || 'PAYPAL_WEBHOOK_ID');
  const body = {
    auth_algo: req.headers.get('paypal-auth-algo') || '',
    cert_url: req.headers.get('paypal-cert-url') || '',
    transmission_id: req.headers.get('paypal-transmission-id') || '',
    transmission_sig: req.headers.get('paypal-transmission-sig') || '',
    transmission_time: req.headers.get('paypal-transmission-time') || '',
    webhook_id: webhookId,
    webhook_event: event,
  };

  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.verification_status !== 'SUCCESS') {
    throw new Error('PayPal webhook signature verification failed');
  }
}
