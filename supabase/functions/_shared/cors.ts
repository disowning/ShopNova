export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'stripe-signature',
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time',
  ].join(', '),
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

export function redirectResponse(location: string, status = 303) {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders,
      Location: location,
    },
  });
}
