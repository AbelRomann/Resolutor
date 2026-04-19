-- =====================================================
-- Resolutor v5 - Invitations, Notifications and Tasks
-- Run after v4
-- =====================================================

-- -----------------------------------------------------
-- Profiles improvements
-- -----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- -----------------------------------------------------
-- Helper functions for RLS
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace
      AND wm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(target_workspace UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = target_workspace
      AND w.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- Workspace invitations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_unique_pending_email
  ON public.workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx
  ON public.workspace_invitations (lower(email));

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace admins can create invitations" ON public.workspace_invitations;
CREATE POLICY "Workspace admins can create invitations" ON public.workspace_invitations
  FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Workspace actors can read invitations" ON public.workspace_invitations;
CREATE POLICY "Workspace actors can read invitations" ON public.workspace_invitations
  FOR SELECT
  USING (
    public.is_workspace_member(workspace_id)
    OR public.is_workspace_admin(workspace_id)
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

DROP POLICY IF EXISTS "Invitees and admins can update invitations" ON public.workspace_invitations;
CREATE POLICY "Invitees and admins can update invitations" ON public.workspace_invitations
  FOR UPDATE
  USING (
    public.is_workspace_admin(workspace_id)
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

-- -----------------------------------------------------
-- Notifications
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_type_check
    CHECK (type IN ('workspace_invitation', 'task_assigned', 'case_updated', 'system'))
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON public.notifications (recipient_user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their notifications" ON public.notifications;
CREATE POLICY "Users can read their notifications" ON public.notifications
  FOR SELECT
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- -----------------------------------------------------
-- Tasks
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id TEXT REFERENCES public.cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  execution_type TEXT NOT NULL DEFAULT 'human',
  status TEXT NOT NULL DEFAULT 'pending',
  assignee_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_agent TEXT,
  required_capability TEXT,
  resolution_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_execution_type_check
    CHECK (execution_type IN ('automation', 'human', 'hybrid')),
  CONSTRAINT tasks_status_check
    CHECK (status IN ('pending', 'queued', 'in_progress', 'blocked', 'done', 'canceled'))
);

CREATE INDEX IF NOT EXISTS tasks_workspace_status_idx
  ON public.tasks (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS tasks_assignee_idx
  ON public.tasks (assignee_user_id, status, updated_at DESC);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can read tasks" ON public.tasks;
CREATE POLICY "Workspace members can read tasks" ON public.tasks
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can insert tasks" ON public.tasks;
CREATE POLICY "Workspace members can insert tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can update tasks" ON public.tasks;
CREATE POLICY "Workspace members can update tasks" ON public.tasks
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace admins can delete tasks" ON public.tasks;
CREATE POLICY "Workspace admins can delete tasks" ON public.tasks
  FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- -----------------------------------------------------
-- Membership listing policy update
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
CREATE POLICY "Members can view workspace memberships" ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Owners can insert members" ON public.workspace_members;
CREATE POLICY "Admins can insert members" ON public.workspace_members
  FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Owners can update members" ON public.workspace_members;
CREATE POLICY "Admins can update members" ON public.workspace_members
  FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Owners can delete members" ON public.workspace_members;
CREATE POLICY "Admins can delete members" ON public.workspace_members
  FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- -----------------------------------------------------
-- Invitation workflow
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  workspace_name TEXT;
  inviter_email TEXT;
BEGIN
  SELECT p.id INTO target_user_id
  FROM public.profiles p
  WHERE lower(p.email) = lower(NEW.email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT w.name INTO workspace_name
  FROM public.workspaces w
  WHERE w.id = NEW.workspace_id;

  SELECT p.email INTO inviter_email
  FROM public.profiles p
  WHERE p.id = NEW.invited_by;

  INSERT INTO public.notifications (
    recipient_user_id,
    workspace_id,
    type,
    title,
    body,
    payload
  )
  VALUES (
    target_user_id,
    NEW.workspace_id,
    'workspace_invitation',
    'Nueva invitacion de workspace',
    coalesce(inviter_email, 'Un usuario') || ' te invito a "' || coalesce(workspace_name, 'un workspace') || '".',
    jsonb_build_object('invitation_id', NEW.id, 'workspace_id', NEW.workspace_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_invitation_created ON public.workspace_invitations;
CREATE TRIGGER on_workspace_invitation_created
  AFTER INSERT ON public.workspace_invitations
  FOR EACH ROW EXECUTE PROCEDURE public.create_invitation_notification();

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_id_input UUID)
RETURNS VOID AS $$
DECLARE
  invitation_record public.workspace_invitations%ROWTYPE;
BEGIN
  SELECT *
  INTO invitation_record
  FROM public.workspace_invitations wi
  WHERE wi.id = invitation_id_input
    AND wi.status = 'pending'
    AND lower(wi.email) = lower(coalesce(auth.jwt()->>'email', ''))
  LIMIT 1;

  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or not available for this user';
  END IF;

  IF invitation_record.expires_at IS NOT NULL AND invitation_record.expires_at < NOW() THEN
    UPDATE public.workspace_invitations
    SET status = 'expired',
        responded_at = NOW()
    WHERE id = invitation_record.id;

    RAISE EXCEPTION 'Invitation expired';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (invitation_record.workspace_id, auth.uid(), 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invitations
  SET status = 'accepted',
      responded_at = NOW()
  WHERE id = invitation_record.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional helper for task assignment notifications
CREATE OR REPLACE FUNCTION public.touch_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_tasks_updated ON public.tasks;
CREATE TRIGGER on_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.touch_task_updated_at();
