-- =====================================================
-- Resolutor v6 - Invitation acceptance visibility
-- Run after v5
-- =====================================================

DROP FUNCTION IF EXISTS public.accept_workspace_invitation(UUID);

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_id_input UUID)
RETURNS UUID AS $$
DECLARE
  invitation_record public.workspace_invitations%ROWTYPE;
  workspace_name TEXT;
  invitee_email TEXT;
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

  SELECT name INTO workspace_name
  FROM public.workspaces
  WHERE id = invitation_record.workspace_id;

  SELECT email INTO invitee_email
  FROM public.profiles
  WHERE id = auth.uid();

  INSERT INTO public.notifications (
    recipient_user_id,
    workspace_id,
    type,
    title,
    body,
    payload
  )
  VALUES (
    invitation_record.invited_by,
    invitation_record.workspace_id,
    'system',
    'Invitacion aceptada',
    coalesce(invitee_email, 'Un usuario') || ' acepto la invitacion a "' || coalesce(workspace_name, 'tu workspace') || '".',
    jsonb_build_object(
      'invitation_id', invitation_record.id,
      'workspace_id', invitation_record.workspace_id,
      'status', 'accepted'
    )
  );

  RETURN invitation_record.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_invitation_rejected()
RETURNS TRIGGER AS $$
DECLARE
  workspace_name TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    SELECT name INTO workspace_name
    FROM public.workspaces
    WHERE id = NEW.workspace_id;

    INSERT INTO public.notifications (
      recipient_user_id,
      workspace_id,
      type,
      title,
      body,
      payload
    )
    VALUES (
      NEW.invited_by,
      NEW.workspace_id,
      'system',
      'Invitacion rechazada',
      coalesce(NEW.email, 'Un usuario') || ' rechazo la invitacion a "' || coalesce(workspace_name, 'tu workspace') || '".',
      jsonb_build_object(
        'invitation_id', NEW.id,
        'workspace_id', NEW.workspace_id,
        'status', 'rejected'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_invitation_rejected ON public.workspace_invitations;
CREATE TRIGGER on_workspace_invitation_rejected
  AFTER UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE PROCEDURE public.notify_invitation_rejected();
