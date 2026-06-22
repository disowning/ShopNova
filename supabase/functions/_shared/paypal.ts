import { getEnvValue, type PaymentProviderConfig } from './payment.ts';

export function getPaypalBaseUrl(provider: PaymentProviderConfig) {
  return provider.environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

export async function getPaypalAccessToken(
  provider: PaymentProviderConfig,
  baseUrl = getPaypalBaseUrl(provider),
  clientSecret?: string,
) {
  const clientId = provider.clientId || Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = clientSecret || getEnvValue(provider.secretKeyRef || 'PAYPAL_CLIENT_SECRET');
  if (!clientId) throw new Error('Missing PayPal client ID');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error_description || 'PayPal access token failed');
  return data.access_token as string;
}
