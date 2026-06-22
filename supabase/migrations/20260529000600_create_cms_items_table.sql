/*
  # Create CMS items table

  Moves editable storefront CMS content out of admin_settings JSON and into a
  shared table that both admin and storefront can read consistently.
*/

CREATE TABLE IF NOT EXISTS cms_items (
  id          text PRIMARY KEY,
  item_group  text NOT NULL DEFAULT 'home' CHECK (item_group IN ('home', 'service', 'about', 'policy', 'marketing')),
  title       text NOT NULL DEFAULT '',
  path        text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  summary     text NOT NULL DEFAULT '',
  surface     text NOT NULL DEFAULT '',
  fields      jsonb NOT NULL DEFAULT '[]'::jsonb,
  modules     jsonb NOT NULL DEFAULT '[]'::jsonb,
  system      boolean NOT NULL DEFAULT false,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE cms_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_items'
      AND policyname = 'Anon can read cms items (dev/test)'
  ) THEN
    CREATE POLICY "Anon can read cms items (dev/test)"
      ON cms_items FOR SELECT TO anon
      USING (deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_items'
      AND policyname = 'Anon can insert cms items (dev/test)'
  ) THEN
    CREATE POLICY "Anon can insert cms items (dev/test)"
      ON cms_items FOR INSERT TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_items'
      AND policyname = 'Anon can update cms items (dev/test)'
  ) THEN
    CREATE POLICY "Anon can update cms items (dev/test)"
      ON cms_items FOR UPDATE TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_items'
      AND policyname = 'Anon can delete cms items (dev/test)'
  ) THEN
    CREATE POLICY "Anon can delete cms items (dev/test)"
      ON cms_items FOR DELETE TO anon
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cms_items_group ON cms_items(item_group);
CREATE INDEX IF NOT EXISTS idx_cms_items_status ON cms_items(status);
CREATE INDEX IF NOT EXISTS idx_cms_items_updated_at ON cms_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_items_deleted_at ON cms_items(deleted_at);

WITH latest_settings AS (
  SELECT settings_data
  FROM admin_settings
  WHERE jsonb_typeof(settings_data #> '{cmsContent,items}') = 'array'
  ORDER BY updated_at DESC
  LIMIT 1
),
legacy_items AS (
  SELECT
    item,
    ordinality::int AS sort_order
  FROM latest_settings,
  LATERAL jsonb_array_elements(settings_data #> '{cmsContent,items}') WITH ORDINALITY AS entry(item, ordinality)
)
INSERT INTO cms_items (
  id,
  item_group,
  title,
  path,
  status,
  summary,
  surface,
  fields,
  modules,
  system,
  sort_order,
  updated_at
)
SELECT
  item->>'id',
  COALESCE(NULLIF(item->>'group', ''), 'home'),
  COALESCE(item->>'title', ''),
  COALESCE(item->>'path', ''),
  CASE
    WHEN item->>'status' IN ('draft', 'ready', 'published') THEN item->>'status'
    ELSE 'draft'
  END,
  COALESCE(item->>'summary', ''),
  COALESCE(item->>'surface', ''),
  CASE WHEN jsonb_typeof(item->'fields') = 'array' THEN item->'fields' ELSE '[]'::jsonb END,
  CASE WHEN jsonb_typeof(item->'modules') = 'array' THEN item->'modules' ELSE '[]'::jsonb END,
  CASE
    WHEN COALESCE(item->>'system', '') IN ('true', 'false') THEN (item->>'system')::boolean
    ELSE false
  END,
  sort_order,
  CASE
    WHEN COALESCE(item->>'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (item->>'updatedAt')::date::timestamptz
    ELSE now()
  END
FROM legacy_items
WHERE COALESCE(item->>'id', '') <> ''
ON CONFLICT (id) DO UPDATE
SET
  item_group = EXCLUDED.item_group,
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  status = EXCLUDED.status,
  summary = EXCLUDED.summary,
  surface = EXCLUDED.surface,
  fields = EXCLUDED.fields,
  modules = EXCLUDED.modules,
  system = EXCLUDED.system,
  sort_order = EXCLUDED.sort_order,
  updated_at = EXCLUDED.updated_at,
  deleted_at = NULL;

UPDATE admin_settings
SET
  settings_data = settings_data - 'cmsContent',
  updated_at = now()
WHERE settings_data ? 'cmsContent';
