/*
  # Add SKU snapshot columns to order_items

  1. Modified Tables
    - `order_items`
      - `sku_id` (uuid, nullable) — references the product_skus.id at time of order
      - `sku_name` (text, nullable) — snapshot of SKU name
      - `sku_attributes_json` (jsonb, nullable) — snapshot of SKU attributes

  2. Important Notes
    - Existing order_items rows will have NULL for these new columns
    - These are snapshot fields: they preserve historical data even if SKU is later modified/deleted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'sku_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN sku_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'sku_name'
  ) THEN
    ALTER TABLE order_items ADD COLUMN sku_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'sku_attributes_json'
  ) THEN
    ALTER TABLE order_items ADD COLUMN sku_attributes_json jsonb;
  END IF;
END $$;
