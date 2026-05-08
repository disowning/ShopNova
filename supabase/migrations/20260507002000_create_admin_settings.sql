/*
  # Create Admin Settings Table

  Stores demo admin settings for the custom users-table authentication flow.
  The project does not use Supabase Auth, so these policies intentionally allow
  anon reads/writes in dev/test mode, matching the existing users table setup.
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_settings'
      AND policyname = 'Anon can read admin settings (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can read admin settings (dev/test)" ON admin_settings FOR SELECT TO anon USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_settings'
      AND policyname = 'Anon can insert admin settings (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can insert admin settings (dev/test)" ON admin_settings FOR INSERT TO anon WITH CHECK (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_settings'
      AND policyname = 'Anon can update admin settings (dev/test)'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon can update admin settings (dev/test)" ON admin_settings FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON admin_settings(updated_at DESC);
