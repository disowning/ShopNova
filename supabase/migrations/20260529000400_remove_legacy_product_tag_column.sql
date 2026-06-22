/*
  # Remove legacy product tag column

  Product labels now live in product_tags and product_tag_relations.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'tag'
  ) THEN
    INSERT INTO product_tag_relations (product_id, tag_id)
    SELECT p.id, t.id
    FROM products AS p
    JOIN product_tags AS t ON t.name = p.tag
    WHERE p.tag IS NOT NULL
    ON CONFLICT (product_id, tag_id) DO NOTHING;

    ALTER TABLE products DROP COLUMN tag;
  END IF;
END $$;
