import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type {
  AppNotification,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from '../types/case';
import { useAuth } from './useAuthStore';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  pendingInvitations: WorkspaceInvitation[];
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  inviteMember: (email: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  fetchMembers: () => Promise<WorkspaceMember[]>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<WorkspaceInvitation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setLoading(false);
      return;
    }

    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      const workspaceIds = [...new Set((memberships || []).map((membership: any) => membership.workspace_id))];
      if (workspaceIds.length === 0) {
        setWorkspaces([]);
        setActiveWorkspaceId(null);
        setError(null);
        setLoading(false);
        return;
      }

      const { data: workspaceRows, error: workspacesError } = await supabase
        .from('workspaces')
        .select('id, name, owner_id, created_at')
        .in('id', workspaceIds)
        .order('created_at', { ascending: true });

      if (workspacesError) throw workspacesError;

      const formatted: Workspace[] = (workspaceRows || []).map((workspace: any) => ({
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.owner_id,
        createdAt: workspace.created_at,
      }));

      setWorkspaces(formatted);
      setActiveWorkspaceId((prev) => {
        if (prev && formatted.some((workspace) => workspace.id === prev)) return prev;
        return formatted.length > 0 ? formatted[0].id : null;
      });
      setError(null);
    } catch (fetchError: any) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchInvitations = useCallback(async () => {
    if (!user?.email) {
      setPendingInvitations([]);
      return;
    }

    const { data, error: err } = await supabase
      .from('workspace_invitations')
      .select(`
        id,
        workspace_id,
        email,
        invited_by,
        status,
        created_at,
        responded_at,
        expires_at,
        workspaces(name),
        inviter:profiles!workspace_invitations_invited_by_fkey(email)
      `)
      .ilike('email', user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (err) throw err;

    const formatted: WorkspaceInvitation[] = (data || []).map((invitation: any) => ({
      id: invitation.id,
      workspaceId: invitation.workspace_id,
      workspaceName: invitation.workspaces?.name,
      email: invitation.email,
      invitedBy: invitation.invited_by,
      invitedByEmail: invitation.inviter?.email,
      status: invitation.status,
      createdAt: invitation.created_at,
      respondedAt: invitation.responded_at ?? undefined,
      expiresAt: invitation.expires_at ?? undefined,
    }));

    setPendingInvitations(formatted);
  }, [user?.email]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const { data, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, type, title, body, payload, read_at, created_at, workspace_id')
      .eq('recipient_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (notificationsError) throw notificationsError;

    const formatted: AppNotification[] = (data || []).map((notification: any) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? undefined,
      payload: notification.payload ?? undefined,
      readAt: notification.read_at ?? undefined,
      createdAt: notification.created_at,
      workspaceId: notification.workspace_id ?? undefined,
      invitationId: notification.payload?.invitation_id ?? undefined,
    }));

    setNotifications(formatted);
  }, [user?.id]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    fetchInvitations().catch((e: any) => setError(e.message));
    fetchNotifications().catch((e: any) => setError(e.message));
  }, [fetchInvitations, fetchNotifications]);

  const createWorkspace = async (name: string) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: data.id, user_id: user.id, role: 'owner' });

    if (memberError) throw memberError;

    const newWorkspace: Workspace = {
      id: data.id,
      name: data.name,
      ownerId: data.owner_id,
      createdAt: data.created_at,
    };

    setWorkspaces((prev) => [...prev, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
    return newWorkspace;
  };

  const inviteMember = async (email: string) => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    if (!user?.id) throw new Error('Not authenticated');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Correo invalido');

    const { data: existingInvitation, error: existingInvitationError } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('workspace_id', activeWorkspaceId)
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitationError) throw existingInvitationError;
    if (existingInvitation) throw new Error('Ya existe una invitacion pendiente para este correo.');

    const { data: existingMember, error: existingMemberError } = await supabase.rpc('lookup_user_by_email', {
      lookup_email: cleanEmail,
    });

    if (existingMemberError) throw existingMemberError;

    if (existingMember) {
      const { data: membershipRows, error: membershipError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', existingMember);

      if (membershipError) throw membershipError;
      if ((membershipRows || []).length > 0) {
        throw new Error('Ese usuario ya es miembro de este workspace.');
      }
    }

    const { error: invitationError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: activeWorkspaceId,
        email: cleanEmail,
        invited_by: user.id,
        status: 'pending',
      });

    if (invitationError) throw invitationError;
    await fetchNotifications();
  };

  const acceptInvitation = async (invitationId: string) => {
    const { data: workspaceId, error: rpcError } = await supabase.rpc('accept_workspace_invitation', {
      invitation_id_input: invitationId,
    });

    if (rpcError) throw rpcError;

    await Promise.all([fetchWorkspaces(), fetchInvitations(), fetchNotifications()]);

    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
    }
  };

  const rejectInvitation = async (invitationId: string) => {
    const { error: rejectError } = await supabase
      .from('workspace_invitations')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (rejectError) throw rejectError;
    await Promise.all([fetchInvitations(), fetchNotifications()]);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (updateError) throw updateError;

    setNotifications((prev) => prev.map((notification) => (
      notification.id === notificationId
        ? { ...notification, readAt: new Date().toISOString() }
        : notification
    )));
  };

  const fetchMembers = async () => {
    if (!activeWorkspaceId) return [];

    const { data, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, role, created_at, profiles!workspace_members_user_id_fkey(email, full_name)')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: true });

    if (membersError) throw membersError;

    return (data || []).map((member: any) => ({
      workspaceId: activeWorkspaceId,
      userId: member.user_id,
      role: member.role,
      createdAt: member.created_at,
      email: member.profiles?.email,
      fullName: member.profiles?.full_name ?? undefined,
    }));
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspaceId,
      pendingInvitations,
      notifications,
      loading,
      error,
      setActiveWorkspace: setActiveWorkspaceId,
      createWorkspace,
      inviteMember,
      acceptInvitation,
      rejectInvitation,
      markNotificationAsRead,
      refreshWorkspaces: fetchWorkspaces,
      refreshInvitations: fetchInvitations,
      refreshNotifications: fetchNotifications,
      fetchMembers,
    }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
