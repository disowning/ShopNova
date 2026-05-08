/*
  # Extend Product Catalog v2

  ## Summary
  Extends the product catalog with full multi-image, SKU, attribute, tag, and
  category hierarchy support. All new tables follow the same RLS pattern as
  existing tables (anon full access for dev/test mode).

  ## Changes to Existing Tables

  ### product_categories
  - Add: parent_id, status, deleted_at

  ### products
  - Add: subtitle, detail_description, main_image_url, is_flash_sale, seo_title, seo_description

  ## New Tables
  - product_images, product_skus, product_attributes, product_tags, product_tag_relations
*/

-- ─── Extend product_categories ────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_categories' AND column_name='parent_id') THEN
    ALTER TABLE product_categories ADD COLUMN parent_id text REFERENCES product_categories(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_categories' AND column_name='status') THEN
    ALTER TABLE product_categories ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_categories' AND column_name='deleted_at') THEN
    ALTER TABLE product_categories ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- ─── Extend products ──────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='subtitle') THEN
    ALTER TABLE products ADD COLUMN subtitle text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='detail_description') THEN
    ALTER TABLE products ADD COLUMN detail_description text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='main_image_url') THEN
    ALTER TABLE products ADD COLUMN main_image_url text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_flash_sale') THEN
    ALTER TABLE products ADD COLUMN is_flash_sale boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='seo_title') THEN
    ALTER TABLE products ADD COLUMN seo_title text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='seo_description') THEN
    ALTER TABLE products ADD COLUMN seo_description text NOT NULL DEFAULT '';
  END IF;
END $$;

UPDATE products SET main_image_url = image_url WHERE main_image_url = '' AND image_url != '';

-- ─── product_images ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url   text NOT NULL DEFAULT '',
  alt_text    text NOT NULL DEFAULT '',
  sort_order  int NOT NULL DEFAULT 0,
  is_main     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read product_images"   ON product_images FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert product_images" ON product_images FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update product_images" ON product_images FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete product_images" ON product_images FOR DELETE TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- ─── product_skus ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_skus (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code         text NOT NULL DEFAULT '',
  sku_name         text NOT NULL DEFAULT '',
  price            numeric(10,2) NOT NULL DEFAULT 0,
  original_price   numeric(10,2) NOT NULL DEFAULT 0,
  stock            int NOT NULL DEFAULT 0,
  image_url        text NOT NULL DEFAULT '',
  attributes_json  jsonb NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'active',
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read product_skus"   ON product_skus FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert product_skus" ON product_skus FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update product_skus" ON product_skus FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete product_skus" ON product_skus FOR DELETE TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_product_skus_product_id ON product_skus(product_id);

-- ─── product_attributes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_attributes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  value       text NOT NULL DEFAULT '',
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read product_attributes"   ON product_attributes FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert product_attributes" ON product_attributes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update product_attributes" ON product_attributes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete product_attributes" ON product_attributes FOR DELETE TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);

-- ─── product_tags ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE DEFAULT '',
  color       text NOT NULL DEFAULT '#3b82f6',
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read product_tags"   ON product_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert product_tags" ON product_tags FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update product_tags" ON product_tags FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete product_tags" ON product_tags FOR DELETE TO anon USING (true);

-- ─── product_tag_relations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_tag_relations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, tag_id)
);

ALTER TABLE product_tag_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read product_tag_relations"   ON product_tag_relations FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert product_tag_relations" ON product_tag_relations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon delete product_tag_relations" ON product_tag_relations FOR DELETE TO anon USING (true);
CREATE INDEX IF NOT EXISTS idx_product_tag_relations_product_id ON product_tag_relations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tag_relations_tag_id ON product_tag_relations(tag_id);

-- ─── Seed tags ────────────────────────────────────────────────────────────────

INSERT INTO product_tags (name, slug, color, description) VALUES
  ('热卖',   'hot-sale',    '#ef4444', '热卖商品标签'),
  ('新品',   'new-arrival', '#8b5cf6', '新品上架标签'),
  ('限时折扣','flash-sale',  '#f59e0b', '限时折扣标签'),
  ('免运费', 'free-ship',   '#10b981', '免运费标签'),
  ('高评分', 'top-rated',   '#3b82f6', '高评分标签'),
  ('官方正品','authentic',  '#6b7280', '官方正品标签'),
  ('库存紧张','low-stock',  '#f97316', '库存紧张标签')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed product_images from existing images jsonb ──────────────────────────

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_main)
SELECT
  p.id,
  img_val,
  p.name,
  img_ord - 1,
  img_ord = 1
FROM products p,
     LATERAL (
       SELECT value::text AS img_val, ordinality::int AS img_ord
       FROM jsonb_array_elements_text(p.images) WITH ORDINALITY
     ) img_data
WHERE p.images != '[]'
ON CONFLICT DO NOTHING;

-- ─── Seed product_attributes from existing specs jsonb ───────────────────────

INSERT INTO product_attributes (product_id, name, value, sort_order)
SELECT
  p.id,
  spec->>'label',
  spec->>'value',
  (spec_ord - 1)::int
FROM products p,
     LATERAL (
       SELECT value AS spec, ordinality::int AS spec_ord
       FROM jsonb_array_elements(p.specs) WITH ORDINALITY
     ) spec_data
WHERE p.specs != '[]'
ON CONFLICT DO NOTHING;

-- ─── Seed product_skus from existing sku_groups jsonb ────────────────────────

INSERT INTO product_skus (product_id, sku_code, sku_name, price, original_price, stock, attributes_json, sort_order)
SELECT
  p.id,
  p.id || '-' || grp_ord || '-' || opt_ord,
  (grp_val->>'name') || ': ' || (opt_val->>'label'),
  CASE WHEN (opt_val->>'priceModifier') IS NOT NULL
    THEN p.price + (opt_val->>'priceModifier')::numeric
    ELSE p.price END,
  p.original_price,
  COALESCE((opt_val->>'stock')::int, 100),
  jsonb_build_object(grp_val->>'name', opt_val->>'label'),
  (grp_ord - 1) * 10 + (opt_ord - 1)
FROM products p,
     LATERAL (
       SELECT value AS grp_val, ordinality::int AS grp_ord
       FROM jsonb_array_elements(p.sku_groups) WITH ORDINALITY
     ) grp_data,
     LATERAL (
       SELECT value AS opt_val, ordinality::int AS opt_ord
       FROM jsonb_array_elements(grp_data.grp_val->'options') WITH ORDINALITY
     ) opt_data
WHERE p.sku_groups != '[]'
ON CONFLICT DO NOTHING;

-- ─── Seed product_tag_relations for existing tag field ───────────────────────

INSERT INTO product_tag_relations (product_id, tag_id)
SELECT p.id, t.id
FROM products p
JOIN product_tags t ON t.name = p.tag
WHERE p.tag IS NOT NULL
ON CONFLICT (product_id, tag_id) DO NOTHING;
