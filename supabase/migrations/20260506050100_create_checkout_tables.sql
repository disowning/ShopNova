/*
  # Create Checkout Tables

  Creates the full checkout data model for ShopNova's simulated payment flow.

  ## New Tables

  ### shipping_addresses
  Stores recipient shipping address details captured at checkout.
  - id (uuid, pk)
  - recipient_name, email, phone
  - country, province, city, zip, street1, street2
  - created_at, updated_at

  ### orders
  Core order record linking a cart submission to fulfillment.
  - id (uuid, pk)
  - user_id (nullable — guest checkout supported)
  - order_number (unique, human-readable e.g. ORD-2026-XXXX)
  - status: pending | paid | cancelled | shipped | completed
  - payment_status: pending | paid | failed | refunded
  - subtotal_amount, discount_amount, shipping_fee, tax_amount, total_amount
  - coupon_code (nullable)
  - shipping_address_id (fk → shipping_addresses)
  - delivery_method: standard | express | nextday
  - notes (buyer order notes)
  - created_at, updated_at

  ### order_items
  Line items for each order, one row per SKU variant.
  - id (uuid, pk)
  - order_id (fk → orders)
  - product_id, product_name, product_image
  - sku_description (e.g. "颜色: 黑色 · 套装: 标准版")
  - unit_price, qty, subtotal
  - created_at

  ### payments
  Simulated payment records. Stores full card data for dev/test mode only.
  - id (uuid, pk)
  - order_id (fk → orders)
  - payment_method: card | stripe | paypal | cod
  - status: success | failed | pending
  - amount
  - card_holder_name, card_number (full, dev/test only), card_last4, card_expiry, card_cvv
  - transaction_id (simulated)
  - gateway_response (jsonb — stores full simulated response)
  - created_at, updated_at

  ## Security
  RLS enabled on all tables with permissive insert/select for anon role
  (appropriate for dev/test mode without auth — production would restrict to auth.uid()).
*/

-- ────────────────────────────────────────────
-- shipping_addresses
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name   text NOT NULL DEFAULT '',
  email            text NOT NULL DEFAULT '',
  phone            text NOT NULL DEFAULT '',
  country          text NOT NULL DEFAULT 'CN',
  province         text NOT NULL DEFAULT '',
  city             text NOT NULL DEFAULT '',
  zip              text NOT NULL DEFAULT '',
  street1          text NOT NULL DEFAULT '',
  street2          text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert shipping_addresses"
  ON shipping_addresses FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select own shipping_addresses"
  ON shipping_addresses FOR SELECT TO anon
  USING (true);

-- ────────────────────────────────────────────
-- orders
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid,
  order_number         text NOT NULL UNIQUE,
  status               text NOT NULL DEFAULT 'paid',
  payment_status       text NOT NULL DEFAULT 'paid',
  subtotal_amount      numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount      numeric(10,2) NOT NULL DEFAULT 0,
  shipping_fee         numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount           numeric(10,2) NOT NULL DEFAULT 0,
  total_amount         numeric(10,2) NOT NULL DEFAULT 0,
  coupon_code          text,
  shipping_address_id  uuid REFERENCES shipping_addresses(id),
  delivery_method      text NOT NULL DEFAULT 'standard',
  notes                text NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert orders"
  ON orders FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select orders"
  ON orders FOR SELECT TO anon
  USING (true);

-- ────────────────────────────────────────────
-- order_items
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       text NOT NULL DEFAULT '',
  product_name     text NOT NULL DEFAULT '',
  product_image    text NOT NULL DEFAULT '',
  sku_description  text NOT NULL DEFAULT '',
  unit_price       numeric(10,2) NOT NULL DEFAULT 0,
  qty              int NOT NULL DEFAULT 1,
  subtotal         numeric(10,2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert order_items"
  ON order_items FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select order_items"
  ON order_items FOR SELECT TO anon
  USING (true);

-- ────────────────────────────────────────────
-- payments
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method      text NOT NULL DEFAULT 'card',
  status              text NOT NULL DEFAULT 'success',
  amount              numeric(10,2) NOT NULL DEFAULT 0,
  card_holder_name    text,
  card_number         text,
  card_last4          text,
  card_expiry         text,
  card_cvv            text,
  transaction_id      text,
  gateway_response    jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert payments"
  ON payments FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select payments"
  ON payments FOR SELECT TO anon
  USING (true);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
