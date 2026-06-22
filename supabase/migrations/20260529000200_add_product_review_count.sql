/*
  # Add product review count

  Separates sales volume from review volume. `sold_count` remains sales count,
  while `review_count` is the storefront review total shown beside ratings.
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS review_count int NOT NULL DEFAULT 0;

UPDATE products
SET review_count = GREATEST(
  review_count,
  COALESCE((
    SELECT COUNT(*)::int
    FROM product_reviews
    WHERE product_reviews.product_id = products.id
      AND product_reviews.status = 'active'
  ), 0)
);
