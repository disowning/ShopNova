/*
  # Open risk_orders policies for the custom dev auth flow

  The project currently uses a custom `users` table session in the browser, not
  Supabase Auth. These policies match the rest of the dev/test dashboard tables
  so the admin UI can read/update risk orders and checkout can insert risk flags.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'risk_orders'
      AND policyname = 'Anon can read risk orders (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can read risk orders (dev/test)" ON risk_orders FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'risk_orders'
      AND policyname = 'Anon can insert risk orders (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can insert risk orders (dev/test)" ON risk_orders FOR INSERT TO anon WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'risk_orders'
      AND policyname = 'Anon can update risk orders (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can update risk orders (dev/test)" ON risk_orders FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_risk_orders_review_status ON risk_orders(review_status);
CREATE INDEX IF NOT EXISTS idx_risk_orders_order_id ON risk_orders(order_id);
