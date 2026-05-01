-- =====================================================
-- Resolutor v12 - Adjuntos generales por caso
-- Run after v11
-- =====================================================

-- 1. Nueva columna JSONB para adjuntos con metadata.
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Migrar imagenes existentes a adjuntos basicos si el caso aun no tiene adjuntos.
UPDATE public.cases
SET attachments = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', regexp_replace(image_url, '^.*/', ''),
        'url', image_url,
        'mimeType', 'image/*',
        'size', 0,
        'kind', 'image'
      )
    )
    FROM unnest(COALESCE(image_urls, '{}')) AS image_url
  ),
  '[]'::jsonb
)
WHERE COALESCE(jsonb_array_length(attachments), 0) = 0
  AND COALESCE(array_length(image_urls, 1), 0) > 0;

-- 3. Bucket publico para adjuntos generales.
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'case-attachments',
  'case-attachments',
  true,
  false,
  10485760,
  '{
    application/pdf,
    application/json,
    text/plain,
    text/csv,
    application/vnd.ms-excel,
    application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
    image/jpeg,
    image/png,
    image/webp,
    image/gif
  }'
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. Politicas de storage para adjuntos del caso.
DROP POLICY IF EXISTS "Authenticated users can upload case attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload case attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-attachments'
);

DROP POLICY IF EXISTS "Anyone can read case attachments" ON storage.objects;
CREATE POLICY "Anyone can read case attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'case-attachments'
);

DROP POLICY IF EXISTS "Authenticated users can delete case attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete case attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-attachments'
);
