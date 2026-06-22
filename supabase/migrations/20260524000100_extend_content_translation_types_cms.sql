ALTER TABLE content_translations
  DROP CONSTRAINT IF EXISTS content_translations_entity_type_check;

ALTER TABLE content_translations
  ADD CONSTRAINT content_translations_entity_type_check
  CHECK (entity_type IN ('product', 'category', 'tag', 'ui', 'store', 'page', 'cms'));
