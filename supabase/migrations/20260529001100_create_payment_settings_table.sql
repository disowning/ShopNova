/*
  # Move payment settings out of admin_settings

  Payment provider settings are public configuration metadata. Real secrets stay
  in payment_secrets, encrypted and available only to Edge Functions.
*/

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id text PRIMARY KEY DEFAULT 'default',
  providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_id_default CHECK (id = 'default')
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_settings'
      AND policyname = 'Anyone can read payment settings'
  ) THEN
    CREATE POLICY "Anyone can read payment settings"
      ON public.payment_settings FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

INSERT INTO public.payment_settings (id, providers, updated_at)
SELECT
  'default',
  settings_data #> '{paymentSettings,providers}',
  now()
FROM public.admin_settings
WHERE jsonb_typeof(settings_data #> '{paymentSettings,providers}') = 'array'
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  providers = EXCLUDED.providers,
  updated_at = now();

INSERT INTO public.payment_settings (id, providers)
VALUES (
  'default',
  '[
    {
      "id": "dev_card",
      "enabled": true,
      "environment": "test",
      "label": "开发测试卡支付",
      "settlementCurrency": "USD",
      "publicKey": "",
      "clientId": "",
      "merchantId": "",
      "appId": "",
      "gatewayMerchantId": "",
      "webhookUrl": "",
      "secretKeyRef": "",
      "webhookSecretRef": "",
      "certificateRef": "",
      "countries": "",
      "maxAmount": "",
      "notes": "开发测试支付方式保留，用于本地演示与验收。"
    },
    {
      "id": "stripe",
      "enabled": false,
      "environment": "test",
      "label": "Stripe 银行卡",
      "settlementCurrency": "USD",
      "publicKey": "",
      "clientId": "",
      "merchantId": "",
      "appId": "",
      "gatewayMerchantId": "",
      "webhookUrl": "",
      "secretKeyRef": "",
      "webhookSecretRef": "",
      "certificateRef": "",
      "countries": "",
      "maxAmount": "",
      "notes": ""
    },
    {
      "id": "paypal",
      "enabled": false,
      "environment": "test",
      "label": "PayPal",
      "settlementCurrency": "USD",
      "publicKey": "",
      "clientId": "",
      "merchantId": "",
      "appId": "",
      "gatewayMerchantId": "",
      "webhookUrl": "",
      "secretKeyRef": "",
      "webhookSecretRef": "",
      "certificateRef": "",
      "countries": "",
      "maxAmount": "",
      "notes": ""
    },
    {
      "id": "cod",
      "enabled": true,
      "environment": "test",
      "label": "货到付款",
      "settlementCurrency": "USD",
      "publicKey": "",
      "clientId": "",
      "merchantId": "",
      "appId": "",
      "gatewayMerchantId": "",
      "webhookUrl": "",
      "secretKeyRef": "",
      "webhookSecretRef": "",
      "certificateRef": "",
      "countries": "CN",
      "maxAmount": "2000",
      "notes": "需后台人工确认收款。"
    }
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.admin_settings
SET
  settings_data = settings_data - 'paymentSettings',
  updated_at = now()
WHERE settings_data ? 'paymentSettings';
