/*
  Create the default public storage bucket for ShopNova media uploads.
  This keeps the first media provider usable without adding another backend.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shopnova-media',
  'shopnova-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon can read ShopNova media'
  ) THEN
    CREATE POLICY "Anon can read ShopNova media"
      ON storage.objects FOR SELECT TO anon
      USING (bucket_id = 'shopnova-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon can upload ShopNova media'
  ) THEN
    CREATE POLICY "Anon can upload ShopNova media"
      ON storage.objects FOR INSERT TO anon
      WITH CHECK (bucket_id = 'shopnova-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon can update ShopNova media'
  ) THEN
    CREATE POLICY "Anon can update ShopNova media"
      ON storage.objects FOR UPDATE TO anon
      USING (bucket_id = 'shopnova-media')
      WITH CHECK (bucket_id = 'shopnova-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Anon can delete ShopNova media'
  ) THEN
    CREATE POLICY "Anon can delete ShopNova media"
      ON storage.objects FOR DELETE TO anon
      USING (bucket_id = 'shopnova-media');
  END IF;
END $$;
