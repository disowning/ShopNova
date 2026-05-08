/*
  # Extend Content Translation Entity Types

  Adds translation buckets for admin-managed grouping without changing the
  storefront rendering logic:
  - ui: system interface copy
  - store: store profile/contact/footer copy
  - page: long page content such as about, support, legal, and cookie pages
*/

ALTER TABLE content_translations
  DROP CONSTRAINT IF EXISTS content_translations_entity_type_check;

ALTER TABLE content_translations
  ADD CONSTRAINT content_translations_entity_type_check
  CHECK (entity_type IN ('product', 'category', 'tag', 'ui', 'store', 'page'));
