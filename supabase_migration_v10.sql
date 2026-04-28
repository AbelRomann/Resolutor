-- =====================================================
-- Resolutor v10 - Priority nullable
-- Run after v9
-- =====================================================

-- Allow priority to be NULL (cases with no priority assigned).
-- Also add/replace the CHECK constraint to only accept the
-- three valid values or NULL.

ALTER TABLE public.cases
  ALTER COLUMN priority DROP NOT NULL;

-- Drop old check constraint if it exists (name may vary)
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_priority_check;

-- Re-add with explicit name and NULL-friendly definition
ALTER TABLE public.cases
  ADD CONSTRAINT cases_priority_check
    CHECK (priority IS NULL OR priority IN ('alta', 'media', 'baja'));
