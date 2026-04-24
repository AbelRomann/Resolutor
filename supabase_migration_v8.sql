-- =====================================================
-- Resolutor v8 - Workspace Owner Management
-- Run after v7
-- =====================================================

-- Helper: check if the current user is the owner of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_workspace UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = target_workspace
      AND w.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -------------------------------------------------------
-- Allow owners to rename their workspace
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can update their workspace" ON public.workspaces;
CREATE POLICY "Owners can update their workspace" ON public.workspaces
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- -------------------------------------------------------
-- Allow owners to delete their workspace
-- (All related rows cascade via FK: cases, tasks,
--  workspace_members, workspace_invitations, notifications)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can delete their workspace" ON public.workspaces;
CREATE POLICY "Owners can delete their workspace" ON public.workspaces
  FOR DELETE
  USING (owner_id = auth.uid());

-- -------------------------------------------------------
-- Allow owners to remove members from their workspace
-- (The existing "Admins can delete members" policy already
--  covers this, but we add an explicit owner-scoped policy
--  as belt-and-suspenders)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can remove members" ON public.workspace_members;
CREATE POLICY "Owners can remove members" ON public.workspace_members
  FOR DELETE
  USING (public.is_workspace_owner(workspace_id) AND user_id <> auth.uid());
