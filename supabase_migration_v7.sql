-- =====================================================
-- Resolutor v7 - Imágenes de Casos
-- Run after v6
-- =====================================================

-- 1. Añadir columna a tabla cases
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 2. Crear el Bucket en Supabase Storage
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'case-images',
  'case-images',
  true, -- Público para facilitar la lectura local
  false,
  5242880, -- 5 MB en bytes
  '{image/jpeg, image/png, image/webp}'
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Crear Políticas de Seguridad RLS para los registros de Storage

-- Los usuarios logueados pueden subir imágenes al bucket case-images.
DROP POLICY IF EXISTS "Authenticated users can upload case images" ON storage.objects;
CREATE POLICY "Authenticated users can upload case images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-images'
);

-- Todos pueden leer las imágenes del bucket (dado que el bucket es public, es necesario tener una read policy)
DROP POLICY IF EXISTS "Anyone can read case images" ON storage.objects;
CREATE POLICY "Anyone can read case images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'case-images'
);

-- Los usuarios pueden borrar archivos (opcional, pero util por si a caso)
DROP POLICY IF EXISTS "Authenticated users can delete case images" ON storage.objects;
CREATE POLICY "Authenticated users can delete case images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-images'
);
