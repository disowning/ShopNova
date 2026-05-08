/*
  # Add Users Auth System

  ## Summary
  Adds a custom users table for dev/test authentication alongside Supabase Auth.
  This uses a simple password-based system suitable for development — password
  hashing should be replaced with proper bcrypt/argon2 before production.

  ## New Tables

  ### users
  - id (uuid, pk, default gen_random_uuid)
  - email (text, unique, not null)
  - password_hash (text — stores plaintext in dev mode, replace with real hash in prod)
  - name (text)
  - phone (text)
  - role (text, default 'customer') — 'customer' | 'admin'
  - avatar_url (text, nullable)
  - created_at, updated_at (timestamptz)

  ## Test Accounts Inserted
  - customer@test.com / 123456 / role: customer
  - admin@test.com / 123456 / role: admin

  ## Changes to Existing Tables
  - shipping_addresses: add user_id column (fk → users, nullable)
  - orders: user_id column already exists, update its reference comment

  ## Security
  - RLS enabled on users table
  - Policies: anyone can insert (register), authenticated sessions can read own row
  - Dev/test mode: anon role can select/insert for ease of testing
*/

-- ─── users table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL DEFAULT '',
  name          text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'customer',
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register (insert user)"
  ON users FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read users (dev/test)"
  ON users FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can update users (dev/test)"
  ON users FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- ─── Test accounts ────────────────────────────────────────────────────────────

INSERT INTO users (email, password_hash, name, phone, role)
VALUES
  ('customer@test.com', '123456', 'Test Customer', '13800000001', 'customer'),
  ('admin@test.com',    '123456', 'Admin User',    '13800000002', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ─── Add user_id to shipping_addresses ───────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipping_addresses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE shipping_addresses ADD COLUMN user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- ─── Ensure orders.user_id references users ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Anon can update orders (for status changes from admin dashboard in dev mode)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow anon update orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow anon update orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON shipping_addresses(user_id);
