/*
  # Product Reviews

  Product reviews are managed content for storefront trust building. They can be
  seeded as demo/marketing reviews and later connected to real order reviews.
*/

CREATE TABLE IF NOT EXISTS product_reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name  text NOT NULL DEFAULT '',
  avatar_text    text NOT NULL DEFAULT '',
  avatar_color   text NOT NULL DEFAULT 'from-blue-500 to-cyan-500',
  rating         numeric(2,1) NOT NULL DEFAULT 5.0 CHECK (rating >= 1 AND rating <= 5),
  title          text NOT NULL DEFAULT '',
  content        text NOT NULL DEFAULT '',
  review_date    date NOT NULL DEFAULT CURRENT_DATE,
  status         text NOT NULL DEFAULT 'active',
  is_featured    boolean NOT NULL DEFAULT false,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active product reviews"
  ON product_reviews FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "Anon can insert product reviews (dev/test)"
  ON product_reviews FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update product reviews (dev/test)"
  ON product_reviews FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete product reviews (dev/test)"
  ON product_reviews FOR DELETE TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_featured ON product_reviews(is_featured);

INSERT INTO product_reviews
  (product_id, customer_name, avatar_text, avatar_color, rating, title, content, review_date, status, is_featured, sort_order)
SELECT product_id, customer_name, avatar_text, avatar_color, rating, title, content, review_date::date, status, is_featured, sort_order
FROM (VALUES
  ('p1', 'Ava Carter', 'A', 'from-blue-500 to-cyan-500', 5.0, 'Exactly what I needed', 'The product feels polished, the packaging looked premium, and setup only took a few minutes.', '2026-05-12', 'active', true, 1),
  ('p1', 'Liam Brooks', 'L', 'from-violet-500 to-fuchsia-500', 4.8, 'Great daily upgrade', 'I bought it for daily work and travel. Battery life and build quality are both better than expected.', '2026-05-09', 'active', false, 2),
  ('p2', 'Mia Chen', 'M', 'from-emerald-500 to-teal-500', 5.0, 'Looks better in person', 'The color is clean and modern. It matches the product photos and feels durable in hand.', '2026-05-16', 'active', true, 3),
  ('p3', 'Noah Wilson', 'N', 'from-orange-500 to-rose-500', 4.9, 'Fast shipping and solid quality', 'The order arrived quickly. I would happily buy from this store again.', '2026-05-18', 'active', true, 4),
  ('p4', 'Sophia Lee', 'S', 'from-slate-700 to-slate-500', 4.7, 'Good value', 'The quality is very good for the price, and the details make it feel like a higher-end product.', '2026-05-20', 'active', false, 5)
) AS seed(product_id, customer_name, avatar_text, avatar_color, rating, title, content, review_date, status, is_featured, sort_order)
WHERE EXISTS (SELECT 1 FROM products WHERE products.id = seed.product_id);
