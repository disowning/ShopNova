/*
  # Create risk_orders table for fraud detection tracking

  1. New Tables
    - `risk_orders`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `user_email` (text) - email of the customer
      - `amount` (numeric) - order amount
      - `country` (text) - source country code
      - `risk_score` (integer) - 0-100 risk score
      - `risk_level` (text) - '极高', '高', '中', '低'
      - `flags` (jsonb) - array of risk flag strings
      - `ip_address` (text) - masked IP address
      - `device_info` (text) - device/browser info
      - `review_status` (text) - '待审核', '已拒绝', '已通过'
      - `reviewed_by` (uuid) - admin who reviewed
      - `reviewed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `risk_orders` table
    - Add policy for authenticated admin access
*/

CREATE TABLE IF NOT EXISTS risk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  user_email text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  country text DEFAULT '',
  risk_score integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT '低',
  flags jsonb DEFAULT '[]'::jsonb,
  ip_address text DEFAULT '',
  device_info text DEFAULT '',
  review_status text NOT NULL DEFAULT '待审核',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE risk_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view risk orders"
  ON risk_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update risk orders"
  ON risk_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert risk orders"
  ON risk_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
