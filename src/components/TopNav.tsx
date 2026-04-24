import { useMemo, useState } from 'react';
import { useAuth } from '../store/useAuthStore';
import { useWorkspace } from '../store/useWorkspaceStore';

type Page = 'dashboard' | 'cases' | 'categories' | 'statistics' | string;

interface TopNavProps {
  currentPage: Page;
  onNavigate: (page: string) => void;
}

const navLinks = [
  { id: 'dashboard', label: 'Inicio' },
  { id: 'cases', label: 'Casos' },
  { id: 'tasks', label: 'Tareas' },
  { id: 'categories', label: 'Categorias' },
  { id: 'statistics', label: 'Estadisticas' },
];

export function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const { user, signOut } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    pendingInvitations,
    notifications,
    setActiveWorkspace,
    inviteMember,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    removeMember,
    acceptInvitation,
    rejectInvitation,
    markNotificationAsRead,
    fetchMembers,
  } = useWorkspace();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [wsError, setWsError] = useState('');
  const [wsSuccess, setWsSuccess] = useState('');

  // Management modal state
  const [showManage, setShowManage] = useState(false);
  const [manageTab, setManageTab] = useState<'rename' | 'members' | 'delete'>('rename');
  const [renameValue, setRenameValue] = useState('');
  const [manageMembers, setManageMembers] = useState<{ userId: string; email: string; role: string; fullName?: string }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [manageError, setManageError] = useState('');
  const [manageSuccess, setManageSuccess] = useState('');

  const activeRoot = currentPage === 'detail' || currentPage === 'edit' || currentPage === 'new'
    ? 'cases'
    : currentPage;

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';
  const unreadCount = pendingInvitations.length + notifications.filter((notification) => !notification.readAt).length;
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces],
  );
  const activeWorkspaceName = activeWorkspace?.name || 'Sin workspace';
  const isOwner = !!(activeWorkspace && user && activeWorkspace.ownerId === user.id);

  const resetMessages = () => {
    setWsError('');
    setWsSuccess('');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    resetMessages();
    try {
      await inviteMember(inviteEmail);
      setWsSuccess('Invitacion enviada. El usuario podra aceptarla desde su panel.');
      setInviteEmail('');
    } catch (err: any) {
      setWsError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    resetMessages();
    try {
      await createWorkspace(newWsName);
      setShowCreate(false);
      setNewWsName('');
    } catch (err: any) {
      setWsError(err.message);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      setWsSuccess('Invitacion aceptada. El workspace ya esta disponible.');
    } catch (err: any) {
      setWsError(err.message);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await rejectInvitation(invitationId);
      setWsSuccess('Invitacion rechazada.');
    } catch (err: any) {
      setWsError(err.message);
    }
  };

  // ── Owner management handlers ────────────────────────────

  const openManage = async () => {
    if (!activeWorkspaceId || !isOwner) return;
    setManageError('');
    setManageSuccess('');
    setDeleteConfirm('');
    setRenameValue(activeWorkspaceName);
    setManageTab('rename');
    setShowManage(true);
    setMembersLoading(true);
    try {
      const members = await fetchMembers();
      setManageMembers(
        members
          .filter((m) => m.userId !== user?.id) // exclude the owner themselves
          .map((m) => ({ userId: m.userId, email: m.email || '', role: m.role, fullName: m.fullName })),
      );
    } catch (err: any) {
      setManageError(err.message);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    setManageError('');
    setManageSuccess('');
    try {
      await renameWorkspace(activeWorkspaceId, renameValue);
      setManageSuccess('Nombre actualizado correctamente.');
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspaceId) return;
    setManageError('');
    setManageSuccess('');
    try {
      await removeMember(activeWorkspaceId, userId);
      setManageMembers((prev) => prev.filter((m) => m.userId !== userId));
      setManageSuccess('Miembro eliminado del workspace.');
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    if (deleteConfirm !== activeWorkspaceName) {
      setManageError('El nombre no coincide. Vuelve a intentarlo.');
      return;
    }
    setManageError('');
    try {
      await deleteWorkspace(activeWorkspaceId);
      setShowManage(false);
    } catch (err: any) {
      setManageError(err.message);
    }
  };

  return (
    <nav className="top-nav">
      <button className="nav-brand" onClick={() => onNavigate('dashboard')}>
        <div className="nav-brand-icon">RS</div>
        Resolutor
      </button>

      <div style={{ marginRight: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          className="form-select"
          style={{ width: 220, padding: '4px 8px', fontSize: '0.8rem', height: '34px' }}
          value={activeWorkspaceId || ''}
          onChange={(e) => {
            if (e.target.value === 'new') {
              setShowCreate(true);
            } else if (e.target.value) {
              setActiveWorkspace(e.target.value);
            }
          }}
        >
          <option value="" disabled hidden>Selecciona workspace...</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
          ))}
          <option value="new">+ Nuevo workspace...</option>
        </select>

        {activeWorkspaceId && (
          <button className="btn btn-outline btn-sm" onClick={() => setShowInvite(true)} title={`Invitar al workspace ${activeWorkspaceName}`}>
            + Invitar
          </button>
        )}

        {isOwner && activeWorkspaceId && (
          <button
            className="btn btn-outline btn-sm"
            onClick={openManage}
            title="Gestionar workspace"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ⚙ Gestionar
          </button>
        )}

        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowNotifications((prev) => !prev)}
          title="Invitaciones pendientes"
          style={{ position: 'relative' }}
        >
          Notificaciones
          {unreadCount > 0 && (
            <span style={{
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              marginLeft: 8,
            }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="nav-links">
        {navLinks.map((link) => (
          <button
            key={link.id}
            className={`nav-link ${activeRoot === link.id ? 'active' : ''}`}
            onClick={() => onNavigate(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="nav-spacer" />

      <div className="nav-user" onClick={signOut} title="Cerrar sesion">
        <div className="nav-user-avatar">{initials}</div>
        <span className="nav-user-email">{user?.email ?? ''}</span>
        <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Salir</span>
      </div>

      {/* ── Notifications modal ───────────────────────────── */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Notificaciones</h3>
            <p>Revisa invitaciones y actividad reciente del workspace.</p>
            {pendingInvitations.length === 0 ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-3)', padding: '8px 0 4px' }}>
                No tienes invitaciones pendientes.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="card card-pad">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{invitation.workspaceName || 'Workspace'}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 12 }}>
                      Invitado por {invitation.invitedByEmail || 'otro usuario'}
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-outline" onClick={() => handleRejectInvitation(invitation.id)}>
                        Rechazar
                      </button>
                      <button className="btn btn-primary" onClick={() => handleAcceptInvitation(invitation.id)}>
                        Aceptar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {notifications.length === 0 ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>
                  Sin actividad reciente.
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className="card card-pad"
                    onClick={() => markNotificationAsRead(notification.id)}
                    style={{
                      textAlign: 'left',
                      border: notification.readAt ? undefined : '1px solid var(--accent)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{notification.title}</div>
                    {notification.body && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{notification.body}</div>
                    )}
                  </button>
                ))
              )}
            </div>
            {wsError && <div className="form-error" style={{ marginTop: 12 }}>{wsError}</div>}
            {wsSuccess && <div style={{ color: 'green', fontSize: '0.8rem', marginTop: 12 }}>{wsSuccess}</div>}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowNotifications(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite modal ──────────────────────────────────── */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Invitar al workspace</h3>
            <p>Se enviara una solicitud interna. La persona podra aceptarla o rechazarla.</p>
            <form onSubmit={handleInvite}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="correo@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              {wsError && <div className="form-error">{wsError}</div>}
              {wsSuccess && <div style={{ color: 'green', fontSize: '0.8rem', marginBottom: 10 }}>{wsSuccess}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowInvite(false);
                    resetMessages();
                  }}
                >
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary">Invitar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create workspace modal ────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nuevo workspace</h3>
            <p>Crea un nuevo espacio para colaborar y asignar trabajo.</p>
            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <input
                  className="form-input"
                  placeholder="Nombre del workspace"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  autoFocus
                />
              </div>
              {wsError && <div className="form-error">{wsError}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowCreate(false);
                    resetMessages();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage workspace modal (owner only) ───────────── */}
      {showManage && (
        <div className="modal-overlay" onClick={() => setShowManage(false)}>
          <div className="modal" style={{ maxWidth: 520, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Gestionar workspace</h3>
            <p style={{ marginBottom: 16, color: 'var(--text-3)', fontSize: '0.85rem' }}>
              {activeWorkspaceName} — solo visible para el dueno del workspace.
            </p>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              {(['rename', 'members', 'delete'] as const).map((tab) => {
                const labels: Record<string, string> = { rename: '✏ Renombrar', members: '👥 Miembros', delete: '🗑 Eliminar' };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setManageTab(tab); setManageError(''); setManageSuccess(''); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: manageTab === tab ? 700 : 400,
                      background: manageTab === tab ? 'var(--accent)' : 'var(--surface-2)',
                      color: manageTab === tab ? '#fff' : 'var(--text-2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* ── Rename tab ── */}
            {manageTab === 'rename' && (
              <form onSubmit={handleRename}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Nuevo nombre del workspace</label>
                  <input
                    className="form-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    maxLength={80}
                  />
                </div>
                {manageSuccess && <div style={{ color: 'var(--success, green)', fontSize: '0.82rem', marginBottom: 10 }}>{manageSuccess}</div>}
                {manageError && <div className="form-error" style={{ marginBottom: 10 }}>{manageError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowManage(false)}>Cerrar</button>
                  <button type="submit" className="btn btn-primary">Guardar nombre</button>
                </div>
              </form>
            )}

            {/* ── Members tab ── */}
            {manageTab === 'members' && (
              <div>
                {membersLoading ? (
                  <div style={{ color: 'var(--text-3)', fontSize: '0.9rem', padding: '12px 0' }}>Cargando miembros...</div>
                ) : manageMembers.length === 0 ? (
                  <div style={{ color: 'var(--text-3)', fontSize: '0.9rem', padding: '12px 0' }}>
                    No hay otros miembros en este workspace.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {manageMembers.map((member) => (
                      <div key={member.userId} className="card card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{member.fullName || member.email}</div>
                          {member.fullName && <div style={{ fontSize: '0.77rem', color: 'var(--text-3)' }}>{member.email}</div>}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2, textTransform: 'capitalize' }}>{member.role}</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger, #e55)', borderColor: 'var(--danger, #e55)', flexShrink: 0 }}
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {manageSuccess && <div style={{ color: 'var(--success, green)', fontSize: '0.82rem', marginBottom: 10 }}>{manageSuccess}</div>}
                {manageError && <div className="form-error" style={{ marginBottom: 10 }}>{manageError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowManage(false)}>Cerrar</button>
                </div>
              </div>
            )}

            {/* ── Delete tab ── */}
            {manageTab === 'delete' && (
              <form onSubmit={handleDeleteWorkspace}>
                <div style={{
                  background: 'var(--danger-bg, #fff0f0)',
                  border: '1px solid var(--danger, #e55)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                  fontSize: '0.85rem',
                  color: 'var(--danger, #c33)',
                }}>
                  ⚠ Esta accion es <strong>permanente</strong>. Se eliminaran todos los casos, tareas y miembros de este workspace.
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">
                    Escribe el nombre del workspace para confirmar:&nbsp;
                    <strong>{activeWorkspaceName}</strong>
                  </label>
                  <input
                    className="form-input"
                    placeholder={activeWorkspaceName}
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {manageError && <div className="form-error" style={{ marginBottom: 10 }}>{manageError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowManage(false)}>Cancelar</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: 'var(--danger, #d33)', borderColor: 'var(--danger, #d33)' }}
                    disabled={deleteConfirm !== activeWorkspaceName}
                  >
                    Eliminar workspace
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
