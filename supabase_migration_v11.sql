-- =====================================================
-- Resolutor v11 - Status nullable
-- Run after v10
-- =====================================================

-- Allow status to be NULL (cases with no status assigned).
-- Also add/replace the CHECK constraint to only accept the
-- six valid values or NULL.

ALTER TABLE public.cases
  ALTER COLUMN status DROP NOT NULL;

-- Drop old check constraint if it exists
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_status_check;

-- Re-add with explicit name and NULL-friendly definition
ALTER TABLE public.cases
  ADD CONSTRAINT cases_status_check
    CHECK (
      status IS NULL OR status IN (
        'resuelto',
        'resuelto_sin_problemas',
        'resuelto_con_ayuda',
        'en_progreso',
        'pendiente',
        'descartado'
      )
    );
