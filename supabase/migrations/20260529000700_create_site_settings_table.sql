/*
  # Create site settings table

  Moves storefront site configuration out of admin_settings JSON into a single
  global row that the admin and storefront can read consistently.
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id                    text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  store_form            jsonb NOT NULL DEFAULT '{}'::jsonb,
  store_switches        jsonb NOT NULL DEFAULT '{}'::jsonb,
  header_nav_links      jsonb NOT NULL DEFAULT '[]'::jsonb,
  footer_link_sections  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'Anon can read site settings (dev/test)'
  ) THEN
    CREATE POLICY "Anon can read site settings (dev/test)"
      ON site_settings FOR SELECT TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'Anon can insert site settings (dev/test)'
  ) THEN
    CREATE POLICY "Anon can insert site settings (dev/test)"
      ON site_settings FOR INSERT TO anon
      WITH CHECK (id = 'global');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'Anon can update site settings (dev/test)'
  ) THEN
    CREATE POLICY "Anon can update site settings (dev/test)"
      ON site_settings FOR UPDATE TO anon
      USING (id = 'global')
      WITH CHECK (id = 'global');
  END IF;
END $$;

WITH latest_settings AS (
  SELECT settings_data
  FROM admin_settings
  WHERE settings_data ?| ARRAY['storeForm', 'storeSwitches', 'headerNavLinks', 'footerLinkSections']
  ORDER BY updated_at DESC
  LIMIT 1
)
INSERT INTO site_settings (
  id,
  store_form,
  store_switches,
  header_nav_links,
  footer_link_sections,
  updated_at
)
SELECT
  'global',
  CASE WHEN jsonb_typeof(settings_data->'storeForm') = 'object' THEN settings_data->'storeForm' ELSE '{}'::jsonb END,
  CASE WHEN jsonb_typeof(settings_data->'storeSwitches') = 'object' THEN settings_data->'storeSwitches' ELSE '{}'::jsonb END,
  CASE WHEN jsonb_typeof(settings_data->'headerNavLinks') = 'array' THEN settings_data->'headerNavLinks' ELSE '[]'::jsonb END,
  CASE WHEN jsonb_typeof(settings_data->'footerLinkSections') = 'array' THEN settings_data->'footerLinkSections' ELSE '[]'::jsonb END,
  now()
FROM latest_settings
ON CONFLICT (id) DO UPDATE
SET
  store_form = EXCLUDED.store_form,
  store_switches = EXCLUDED.store_switches,
  header_nav_links = EXCLUDED.header_nav_links,
  footer_link_sections = EXCLUDED.footer_link_sections,
  updated_at = now();

UPDATE admin_settings
SET
  settings_data = settings_data - 'storeForm' - 'storeSwitches' - 'headerNavLinks' - 'footerLinkSections',
  updated_at = now()
WHERE settings_data ?| ARRAY['storeForm', 'storeSwitches', 'headerNavLinks', 'footerLinkSections'];
