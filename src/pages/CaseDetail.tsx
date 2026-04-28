import { useMemo, useState } from 'react';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { useCases } from '../store/useCasesStore';
import { useCategories } from '../store/useCategoriesStore';
import { useTasks } from '../store/useTasksStore';
import { useWorkspace } from '../store/useWorkspaceStore';
import type { CaseStatus, TaskExecutionType, TaskStatus } from '../types/case';
import { STATUS_LABELS } from '../types/case';
import { formatDate, formatDateTime } from '../utils/date';

interface CaseDetailProps {
  caseId: string;
  onNavigate: (page: string, id?: string) => void;
}

function ConfirmModal({ title, message, confirmLabel, dangerConfirm, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  dangerConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${dangerConfirm ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function StatusModal({ currentStatus, onConfirm, onCancel }: {
  currentStatus: CaseStatus;
  onConfirm: (status: CaseStatus, note: string) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<CaseStatus>(currentStatus);
  const [note, setNote] = useState('');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Cambiar estado</h3>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Nuevo estado</label>
          <select
            className="form-select"
            value={status ?? ''}
            onChange={(e) => setStatus((e.target.value || null) as CaseStatus)}
          >
            <option value="">Sin estado</option>
            <option value="en_progreso">En Progreso</option>
            <option value="pendiente">Pendiente</option>
            <option value="resuelto">Resuelto</option>
            <option value="resuelto_sin_problemas">Resuelto sin problemas</option>
            <option value="resuelto_con_ayuda">Resuelto con ayuda</option>
            <option value="descartado">Descartado</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Nota (opcional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explica por que cambia el estado"
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onConfirm(status, note)}>Actualizar</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ onCancel, onSubmit, memberOptions }: {
  onCancel: () => void;
  onSubmit: (input: {
    title: string;
    description?: string;
    executionType: TaskExecutionType;
    assigneeUserId?: string;
    assigneeAgent?: string;
    requiredCapability?: string;
  }) => Promise<void>;
  memberOptions: { userId: string; email?: string; role: string }[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [executionType, setExecutionType] = useState<TaskExecutionType>('human');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeAgent, setAssigneeAgent] = useState('resolver_ai');
  const [requiredCapability, setRequiredCapability] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El titulo de la tarea es obligatorio.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSubmit({
        title,
        description: description || undefined,
        executionType,
        assigneeUserId: executionType !== 'automation' ? assigneeUserId || undefined : undefined,
        assigneeAgent: executionType !== 'human' ? assigneeAgent || undefined : undefined,
        requiredCapability: requiredCapability || undefined,
      });
    } catch (submitError: any) {
      setError(submitError.message ?? 'No se pudo crear la tarea');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nueva tarea</h3>
        <p>Usa tareas para separar trabajo automatizable del trabajo humano.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Titulo</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Reiniciar servicio y validar impresora" />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Descripcion</label>
            <textarea className="form-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objetivo o contexto de la tarea" />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Tipo de ejecucion</label>
            <select className="form-select" value={executionType} onChange={(e) => setExecutionType(e.target.value as TaskExecutionType)}>
              <option value="human">Humana</option>
              <option value="automation">Automatizable</option>
              <option value="hybrid">Hibrida</option>
            </select>
          </div>

          {executionType !== 'automation' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Asignar a</label>
              <select className="form-select" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
                <option value="">Sin asignar</option>
                {memberOptions.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.email} {member.role === 'owner' ? '(Propietario)' : member.role === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {executionType !== 'human' && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Agente o backend</label>
              <input className="form-input" value={assigneeAgent} onChange={(e) => setAssigneeAgent(e.target.value)} placeholder="resolver_ai, queue_worker, automation_rule" />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label">Capacidad requerida (opcional)</label>
            <input className="form-input" value={requiredCapability} onChange={(e) => setRequiredCapability(e.target.value)} placeholder="networking, printer_reset, user_contact" />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear tarea'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  queued: 'En cola',
  in_progress: 'En progreso',
  blocked: 'Bloqueada',
  done: 'Completada',
  canceled: 'Cancelada',
};

const EXECUTION_LABELS: Record<TaskExecutionType, string> = {
  automation: 'Automatizable',
  human: 'Humana',
  hybrid: 'Hibrida',
};

export function CaseDetail({ caseId, onNavigate }: CaseDetailProps) {
  const { getCase, deleteCase, changeStatus } = useCases();
  const { categories } = useCategories();
  const { getTasksForCase, addTask, changeTaskStatus } = useTasks();
  const { fetchMembers } = useWorkspace();
  const currentCase = getCase(caseId);
  const categoryLabel = currentCase
    ? (categories.find((cat) => cat.key === currentCase.category)?.label)
    : undefined;
  const [showDelete, setShowDelete] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [memberOptions, setMemberOptions] = useState<{ userId: string; email?: string; role: string }[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const caseTasks = useMemo(
    () => (currentCase ? getTasksForCase(currentCase.id) : []),
    [currentCase, getTasksForCase],
  );

  if (!currentCase) {
    return (
      <div className="page-wrap">
        <div className="empty-state animate-in">
          <div className="empty-icon">NA</div>
          <h3>Caso no encontrado</h3>
          <p>El caso que buscas no existe o fue eliminado.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('cases')}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    await deleteCase(currentCase.id);
    onNavigate('cases');
  };

  const handleStatus = async (status: CaseStatus, note: string) => {
    await changeStatus(currentCase.id, status, note);
    setShowStatus(false);
  };

  const openTaskModal = async () => {
    const members = await fetchMembers();
    setMemberOptions(members.map((member) => ({
      userId: member.userId,
      email: member.email,
      role: member.role,
    })));
    setShowTaskModal(true);
  };

  const createCaseTask = async (input: {
    title: string;
    description?: string;
    executionType: TaskExecutionType;
    assigneeUserId?: string;
    assigneeAgent?: string;
    requiredCapability?: string;
  }) => {
    await addTask({
      ...input,
      caseId: currentCase.id,
    });
    setShowTaskModal(false);
  };

  const Block = ({ label, content }: { label: string; content: string }) => {
    if (!content?.trim()) return null;
    return (
      <div className="card card-pad detail-section animate-in">
        <div className="detail-section-label">{label}</div>
        <div className="detail-text">{content}</div>
      </div>
    );
  };

  return (
    <div className="page-wrap detail-wrap">
      <div className="page-header animate-in">
        <button className="btn btn-ghost" onClick={() => onNavigate('cases')}>Volver a casos</button>
        <div className="detail-actions">
          <button className="btn btn-outline btn-sm" onClick={() => openTaskModal()}>+ Tarea</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowStatus(true)}>Estado</button>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('edit', currentCase.id)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)} disabled={deleting}>
            {deleting ? '...' : 'Eliminar'}
          </button>
        </div>
      </div>

      <div className="card detail-header animate-in">
        <div className="detail-title">{currentCase.title}</div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {currentCase.creatorEmail && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
              Creado por: <strong style={{ color: 'var(--text-2)' }}>{currentCase.creatorEmail}</strong>
            </div>
          )}
          {currentCase.assignedToEmail && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
              Asignado a: <strong style={{ color: 'var(--text-2)' }}>{currentCase.assignedToEmail}</strong>
            </div>
          )}
          {currentCase.solvedFor && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
              Resuelto para: <strong>{currentCase.solvedFor}</strong>
            </div>
          )}
        </div>
        <div className="detail-badges">
          <StatusBadge status={currentCase.status} />
          <CategoryBadge category={currentCase.category} categoryLabel={categoryLabel} />
          <PriorityBadge priority={currentCase.priority} />
          {currentCase.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
        <div className="detail-dates">
          <div className="detail-date-item">Incidente: <strong style={{ color: 'var(--text)' }}>{formatDate(currentCase.incidentDate)}</strong></div>
          <div className="detail-date-item">Registrado: {formatDateTime(currentCase.createdAt)}</div>
          <div className="detail-date-item">Actualizado: {formatDateTime(currentCase.updatedAt)}</div>
        </div>
      </div>

      <div className={currentCase.whatIDid && currentCase.howItWasResolved ? 'detail-grid' : ''}>
        <Block label="Analisis y acciones realizadas" content={currentCase.whatIDid} />
        <Block label="Resultado, solucion o siguiente paso" content={currentCase.howItWasResolved} />
      </div>

      <div className="card card-pad detail-section animate-in">
        <div className="detail-section-label">Tareas derivadas</div>
        <p style={{ marginTop: 0, color: 'var(--text-3)', fontSize: '0.86rem' }}>
          Usa tareas para decidir si este caso lo resuelve una persona, una automatizacion o ambos.
        </p>
        {caseTasks.length === 0 ? (
          <div style={{ fontSize: '0.86rem', color: 'var(--text-3)' }}>Este caso aun no tiene tareas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {caseTasks.map((task) => (
              <div key={task.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: '0.84rem', color: 'var(--text-3)', marginTop: 5 }}>{task.description}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <span className="tag">{EXECUTION_LABELS[task.executionType]}</span>
                      {task.assigneeEmail && <span className="tag">{task.assigneeEmail}</span>}
                      {task.assigneeAgent && <span className="tag">{task.assigneeAgent}</span>}
                    </div>
                  </div>
                  <select
                    className="form-select"
                    value={task.status}
                    onChange={(e) => changeTaskStatus(task.id, e.target.value as TaskStatus)}
                  >
                    {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((status) => (
                      <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {currentCase.imageUrls && currentCase.imageUrls.length > 0 && (
        <div className="card card-pad detail-section animate-in">
          <div className="detail-section-label">Imagenes adjuntas</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {currentCase.imageUrls.map((url, index) => (
              <div 
                key={index} 
                className="card"
                onClick={() => setViewingImage(url)}
                style={{ 
                  width: 100, height: 100, overflow: 'hidden', cursor: 'pointer', 
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}
              >
                <img src={url} alt={`Adjunto ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {currentCase.statusHistory.length > 0 && (
        <div className="card card-pad detail-section animate-in">
          <div className="detail-section-label">Historial de estados</div>
          <div className="timeline">
            {[...currentCase.statusHistory].reverse().map((item, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <div className="timeline-text">
                    <span style={{ color: 'var(--text-3)' }}>{item.from ? STATUS_LABELS[item.from] : 'Sin estado'}</span>
                    {' -> '}
                    <strong>{item.to ? STATUS_LABELS[item.to] : 'Sin estado'}</strong>
                    {item.note && <em style={{ color: 'var(--text-3)', marginLeft: 6 }}>"{item.note}"</em>}
                  </div>
                  <div className="timeline-date">{formatDateTime(item.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDelete && (
        <ConfirmModal
          title="Eliminar caso?"
          message={`"${currentCase.title}" sera eliminado permanentemente.`}
          confirmLabel="Si, eliminar"
          dangerConfirm
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {showStatus && (
        <StatusModal currentStatus={currentCase.status} onConfirm={handleStatus} onCancel={() => setShowStatus(false)} />
      )}

      {showTaskModal && (
        <TaskModal onCancel={() => setShowTaskModal(false)} onSubmit={createCaseTask} memberOptions={memberOptions} />
      )}

      {viewingImage && (
        <div className="modal-overlay" onClick={() => setViewingImage(null)}>
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column' }}
          >
            <button 
              className="btn btn-outline" 
              onClick={() => setViewingImage(null)} 
              style={{ position: 'absolute', top: -40, right: 0, background: 'var(--bg)', zIndex: 10 }}
            >
              Cerrar
            </button>
            <img src={viewingImage} alt="Visor de adjunto" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
