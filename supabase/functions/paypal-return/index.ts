import { redirectResponse } from '../_shared/cors.ts';
import {
  fetchProviderConfig,
  getPublicSiteUrl,
  getSupabaseAdmin,
  markPaymentFailed,
  markPaymentPaid,
} from '../_shared/payment.ts';
import { getPaypalAccessToken, getPaypalBaseUrl } from '../_shared/paypal.ts';
import { getPaymentSecret } from '../_shared/secret-store.ts';

Deno.serve(async (req) => {
  const supabase = getSupabaseAdmin();
  const fallbackSiteUrl = getPublicSiteUrl(req);
  const url = new URL(req.url);
  const paypalOrderId = url.searchParams.get('token');
  const shopnovaOrderId = url.searchParams.get('shopnovaOrderId');
  const orderNumber = url.searchParams.get('orderNumber') || '';
  const siteUrl = (url.searchParams.get('siteUrl') || fallbackSiteUrl).replace(/\/$/, '');

  if (!paypalOrderId || !shopnovaOrderId) {
    return redirectResponse(`${siteUrl}/?checkout_return=failed&provider=paypal`);
  }

  try {
    const provider = await fetchProviderConfig(supabase, 'paypal');
    const baseUrl = getPaypalBaseUrl(provider);
    const clientSecret = await getPaymentSecret(supabase, 'paypal', 'paypal_client_secret', provider.secretKeyRef || 'PAYPAL_CLIENT_SECRET');
    const accessToken = await getPaypalAccessToken(provider, baseUrl, clientSecret);
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${shopnovaOrderId}-capture`,
      },
    });
    const capture = await response.json();

    if (!response.ok || capture.status !== 'COMPLETED') {
      await markPaymentFailed(supabase, {
        orderId: shopnovaOrderId,
        transactionId: paypalOrderId,
        gatewayResponse: { provider: 'paypal', capture },
      });
      return redirectResponse(`${siteUrl}/?checkout_return=failed&provider=paypal&orderId=${shopnovaOrderId}&orderNumber=${encodeURIComponent(orderNumber)}`);
    }

    await markPaymentPaid(supabase, {
      orderId: shopnovaOrderId,
      transactionId: paypalOrderId,
      gatewayResponse: { provider: 'paypal', capture },
    });

    return redirectResponse(`${siteUrl}/?checkout_return=success&provider=paypal&orderId=${shopnovaOrderId}&orderNumber=${encodeURIComponent(orderNumber)}`);
  } catch (error) {
    await markPaymentFailed(supabase, {
      orderId: shopnovaOrderId,
      transactionId: paypalOrderId,
      gatewayResponse: { provider: 'paypal', error: error instanceof Error ? error.message : 'PayPal capture failed' },
    });
    return redirectResponse(`${siteUrl}/?checkout_return=failed&provider=paypal&orderId=${shopnovaOrderId}&orderNumber=${encodeURIComponent(orderNumber)}`);
  }
});
