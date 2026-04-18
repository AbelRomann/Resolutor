import { useState } from 'react';
import { useCases } from '../store/useCasesStore';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../components/Badges';
import type { CaseStatus } from '../types/case';
import { STATUS_LABELS } from '../types/case';
import { formatDate, formatDateTime } from '../utils/date';

interface CaseDetailProps {
  caseId: string;
  onNavigate: (page: string, id?: string) => void;
}

function ConfirmModal({ title, message, confirmLabel, dangerConfirm, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
  dangerConfirm?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
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
  currentStatus: CaseStatus; onConfirm: (s: CaseStatus, note: string) => void; onCancel: () => void;
}) {
  const [status, setStatus] = useState<CaseStatus>(currentStatus);
  const [note, setNote] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Cambiar estado</h3>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Nuevo estado</label>
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value as CaseStatus)}>
            {(Object.keys(STATUS_LABELS) as CaseStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Nota (opcional)</label>
          <textarea className="form-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="¿Por qué cambias el estado?" />
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onConfirm(status, note)}>Actualizar</button>
        </div>
      </div>
    </div>
  );
}

export function CaseDetail({ caseId, onNavigate }: CaseDetailProps) {
  const { getCase, deleteCase, changeStatus } = useCases();
  const c = getCase(caseId);
  const [showDelete, setShowDelete] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!c) {
    return (
      <div className="page-wrap">
        <div className="empty-state animate-in">
          <div className="empty-icon">🔍</div>
          <h3>Caso no encontrado</h3>
          <p>El caso que buscas no existe o fue eliminado.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('cases')}>
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    await deleteCase(c.id);
    onNavigate('cases');
  };

  const handleStatus = async (status: CaseStatus, note: string) => {
    await changeStatus(c.id, status, note);
    setShowStatus(false);
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
        <button className="btn btn-ghost" onClick={() => onNavigate('cases')}>← Mis Casos</button>
        <div className="detail-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowStatus(true)}>🔄 Estado</button>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('edit', c.id)}>✏️ Editar</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)} disabled={deleting}>
            {deleting ? '…' : '🗑️'} Eliminar
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="card detail-header animate-in">
        <div className="detail-title">{c.title}</div>
        <div className="detail-badges">
          <StatusBadge status={c.status} />
          <CategoryBadge category={c.category} />
          <PriorityBadge priority={c.priority} />
          {c.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
        <div className="detail-dates">
          <div className="detail-date-item">📅 Incidente: <strong style={{ color: 'var(--text)' }}>{formatDate(c.incidentDate)}</strong></div>
          <div className="detail-date-item">🕐 Registrado: {formatDateTime(c.createdAt)}</div>
          <div className="detail-date-item">🔄 Actualizado: {formatDateTime(c.updatedAt)}</div>
        </div>
      </div>

      {/* Content */}
      <div className={c.whatIDid && c.howItWasResolved ? 'detail-grid' : ''}>
        <Block label="¿Qué hice?" content={c.whatIDid} />
        <Block label="¿Cómo se resolvió?" content={c.howItWasResolved} />
      </div>

      {/* History */}
      {c.statusHistory.length > 0 && (
        <div className="card card-pad detail-section animate-in">
          <div className="detail-section-label">Historial de estados</div>
          <div className="timeline">
            {[...c.statusHistory].reverse().map((h, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <div className="timeline-text">
                    <span style={{ color: 'var(--text-3)' }}>{STATUS_LABELS[h.from]}</span>
                    {' → '}
                    <strong>{STATUS_LABELS[h.to]}</strong>
                    {h.note && <em style={{ color: 'var(--text-3)', marginLeft: 6 }}>"{h.note}"</em>}
                  </div>
                  <div className="timeline-date">{formatDateTime(h.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDelete && (
        <ConfirmModal
          title="¿Eliminar este caso?"
          message={`"${c.title}" será eliminado permanentemente.`}
          confirmLabel="Sí, eliminar"
          dangerConfirm
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
      {showStatus && (
        <StatusModal currentStatus={c.status} onConfirm={handleStatus} onCancel={() => setShowStatus(false)} />
      )}
    </div>
  );
}
