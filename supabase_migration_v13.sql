-- =====================================================
-- Resolutor v13 - Stop auto-seeding workspace categories
-- Existing categories are preserved.
-- =====================================================

DROP FUNCTION IF EXISTS public.seed_default_categories(UUID);
