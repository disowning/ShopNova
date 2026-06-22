/*
  # Create media assets table

  Moves image library records out of admin_settings JSON and into a shared table.
*/

CREATE TABLE IF NOT EXISTS media_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url          text NOT NULL DEFAULT '',
  name         text NOT NULL DEFAULT '',
  provider     text NOT NULL DEFAULT 'supabase' CHECK (provider IN ('supabase', 'r2', 'external')),
  bucket       text,
  path         text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT 'image/*',
  size         bigint NOT NULL DEFAULT 0,
  usage        text NOT NULL DEFAULT 'products' CHECK (usage IN ('products', 'brand', 'content', 'other')),
  alt_text     text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND policyname = 'Anon can read media assets (dev/test)'
  ) THEN
    CREATE POLICY "Anon can read media assets (dev/test)"
      ON media_assets FOR SELECT TO anon
      USING (deleted_at IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND policyname = 'Anon can insert media assets (dev/test)'
  ) THEN
    CREATE POLICY "Anon can insert media assets (dev/test)"
      ON media_assets FOR INSERT TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND policyname = 'Anon can update media assets (dev/test)'
  ) THEN
    CREATE POLICY "Anon can update media assets (dev/test)"
      ON media_assets FOR UPDATE TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'media_assets'
      AND policyname = 'Anon can delete media assets (dev/test)'
  ) THEN
    CREATE POLICY "Anon can delete media assets (dev/test)"
      ON media_assets FOR DELETE TO anon
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_media_assets_usage ON media_assets(usage);
CREATE INDEX IF NOT EXISTS idx_media_assets_provider ON media_assets(provider);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_deleted_at ON media_assets(deleted_at);

INSERT INTO media_assets (
  id,
  url,
  name,
  provider,
  bucket,
  path,
  content_type,
  size,
  usage,
  alt_text,
  created_at
)
SELECT
  CASE
    WHEN COALESCE(asset->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (asset->>'id')::uuid
    ELSE gen_random_uuid()
  END,
  COALESCE(asset->>'url', ''),
  COALESCE(asset->>'name', ''),
  COALESCE(asset->>'provider', 'external'),
  CASE WHEN asset->>'provider' = 'supabase' THEN 'shopnova-media' ELSE NULL END,
  COALESCE(asset->>'path', ''),
  COALESCE(asset->>'contentType', 'image/*'),
  COALESCE((asset->>'size')::bigint, 0),
  COALESCE(asset->>'usage', 'products'),
  COALESCE(asset->>'altText', ''),
  COALESCE((asset->>'createdAt')::timestamptz, now())
FROM admin_settings,
LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(settings_data->'mediaAssets') = 'array' THEN settings_data->'mediaAssets'
    ELSE '[]'::jsonb
  END
) AS asset
WHERE COALESCE(asset->>'url', '') <> ''
ON CONFLICT (id) DO NOTHING;

UPDATE admin_settings
SET
  settings_data = settings_data - 'mediaAssets',
  updated_at = now()
WHERE settings_data ? 'mediaAssets';
