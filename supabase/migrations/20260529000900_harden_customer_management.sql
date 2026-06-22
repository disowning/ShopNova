/*
  # Harden customer management

  ## Summary
  - Move customer membership rules into a dedicated table.
  - Add soft delete support to custom users.
  - Remove the dev/test anonymous customer delete policy.
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_role_deleted_at ON public.users(role, deleted_at);

CREATE TABLE IF NOT EXISTS public.customer_rules (
  id text PRIMARY KEY DEFAULT 'default',
  vip_spend_threshold numeric NOT NULL DEFAULT 3000,
  vip_order_threshold integer NOT NULL DEFAULT 5,
  high_vip_spend_threshold numeric NOT NULL DEFAULT 10000,
  high_vip_order_threshold integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_rules_id_default CHECK (id = 'default'),
  CONSTRAINT customer_rules_thresholds_non_negative CHECK (
    vip_spend_threshold >= 0
    AND vip_order_threshold >= 0
    AND high_vip_spend_threshold >= 0
    AND high_vip_order_threshold >= 0
  )
);

ALTER TABLE public.customer_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'customer_rules'
      AND policyname = 'Anyone can read customer rules'
  ) THEN
    CREATE POLICY "Anyone can read customer rules"
      ON public.customer_rules FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

INSERT INTO public.customer_rules (
  id,
  vip_spend_threshold,
  vip_order_threshold,
  high_vip_spend_threshold,
  high_vip_order_threshold
)
SELECT
  'default',
  COALESCE(NULLIF(settings_data #>> '{customerRules,vipSpendThreshold}', '')::numeric, 3000),
  COALESCE(NULLIF(settings_data #>> '{customerRules,vipOrderThreshold}', '')::integer, 5),
  COALESCE(NULLIF(settings_data #>> '{customerRules,highVipSpendThreshold}', '')::numeric, 10000),
  COALESCE(NULLIF(settings_data #>> '{customerRules,highVipOrderThreshold}', '')::integer, 20)
FROM public.admin_settings
WHERE settings_data ? 'customerRules'
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  vip_spend_threshold = EXCLUDED.vip_spend_threshold,
  vip_order_threshold = EXCLUDED.vip_order_threshold,
  high_vip_spend_threshold = EXCLUDED.high_vip_spend_threshold,
  high_vip_order_threshold = EXCLUDED.high_vip_order_threshold,
  updated_at = now();

INSERT INTO public.customer_rules (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Anon can delete customer users (dev/test)'
  ) THEN
    DROP POLICY "Anon can delete customer users (dev/test)" ON public.users;
  END IF;
END $$;
