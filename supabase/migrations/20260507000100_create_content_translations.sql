/*
  # Create unified content translations

  Stores translated business content for products, categories, and tags.
  The original tables remain the source language content, while this table
  stores target locale overrides for translatable fields.
*/

CREATE TABLE IF NOT EXISTS content_translations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL CHECK (entity_type IN ('product', 'category', 'tag')),
  entity_id       text NOT NULL,
  locale          text NOT NULL,
  field_name      text NOT NULL,
  source_locale   text NOT NULL DEFAULT 'zh-CN',
  source_text     text NOT NULL DEFAULT '',
  source_hash     text NOT NULL DEFAULT '',
  translated_text text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'reviewed',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, locale, field_name)
);

ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read content_translations"
  ON content_translations FOR SELECT TO anon USING (true);

CREATE POLICY "anon insert content_translations"
  ON content_translations FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon update content_translations"
  ON content_translations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon delete content_translations"
  ON content_translations FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_content_translations_entity_locale
  ON content_translations(entity_type, locale, entity_id);

CREATE INDEX IF NOT EXISTS idx_content_translations_entity_field
  ON content_translations(entity_type, entity_id, locale, field_name);
