-- =====================================================
-- Resolutor v9 - Workspace-level Custom Categories
-- Run after v8
-- =====================================================

-- -------------------------------------------------------
-- Table: workspace_categories
-- Each workspace can define its own set of case categories.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,          -- internal key (slug), e.g. "software"
  label       TEXT NOT NULL,          -- display name, e.g. "Software"
  icon        TEXT NOT NULL DEFAULT 'OT',  -- 2-char abbreviation
  color       TEXT,                   -- optional accent color (hex)
  position    INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, key)
);

-- Enable RLS
ALTER TABLE public.workspace_categories ENABLE ROW LEVEL SECURITY;

-- Members can read their workspace categories
DROP POLICY IF EXISTS "Members can read workspace categories" ON public.workspace_categories;
CREATE POLICY "Members can read workspace categories" ON public.workspace_categories
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Members can insert categories into their workspace
DROP POLICY IF EXISTS "Members can insert workspace categories" ON public.workspace_categories;
CREATE POLICY "Members can insert workspace categories" ON public.workspace_categories
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Members can update categories in their workspace
DROP POLICY IF EXISTS "Members can update workspace categories" ON public.workspace_categories;
CREATE POLICY "Members can update workspace categories" ON public.workspace_categories
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Members can delete categories from their workspace
DROP POLICY IF EXISTS "Members can delete workspace categories" ON public.workspace_categories;
CREATE POLICY "Members can delete workspace categories" ON public.workspace_categories
  FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- -------------------------------------------------------
-- Helper: seed default categories for a new workspace
-- Call this after creating a workspace, or run manually
-- for existing workspaces that have no categories yet.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_categories(target_workspace UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.workspace_categories (workspace_id, key, label, icon, position)
  VALUES
    (target_workspace, 'software',         'Software',         'SW',  0),
    (target_workspace, 'hardware',         'Hardware',         'HW',  1),
    (target_workspace, 'red',              'Red',              'RD',  2),
    (target_workspace, 'conectividad',     'Conectividad',     'CN',  3),
    (target_workspace, 'impresora',        'Impresora',        'IM',  4),
    (target_workspace, 'reimpresion',      'Reimpresión',      'RP',  5),
    (target_workspace, 'sistema_operativo','Sis. Operativo',   'SO',  6),
    (target_workspace, 'correo',           'Correo',           'CR',  7),
    (target_workspace, 'usuario',          'Usuario',          'US',  8),
    (target_workspace, 'otro',             'Otro',             'OT',  9)
  ON CONFLICT (workspace_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- Seed defaults for ALL existing workspaces that have 0
-- categories yet (safe to run multiple times thanks to
-- ON CONFLICT DO NOTHING inside the function).
-- -------------------------------------------------------
DO $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    PERFORM public.seed_default_categories(ws.id);
  END LOOP;
END;
$$;

-- -------------------------------------------------------
-- NOTE: If you want new workspaces to auto-seed categories
-- you can add a trigger on the workspaces table or call
-- seed_default_categories() from your application layer
-- right after INSERT into workspaces.
-- -------------------------------------------------------
