import { useState, useMemo } from 'react';
import { useCases } from '../store/useCasesStore';
import { useCategories } from '../store/useCategoriesStore';
import type { WorkspaceCategory } from '../types/case';

interface CategoriesPageProps {
  onNavigate: (page: string, id?: string) => void;
}

// ─── Small inline modal ───────────────────────────────────────────────────────

interface CategoryModalProps {
  initial?: WorkspaceCategory;
  onSave: (data: { key: string; label: string; icon: string; color?: string }) => Promise<void>;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#c96534', '#e05a77', '#8b5cf6', '#3b82f6',
  '#06b6d4', '#10b981', '#f59e0b', '#6b7280',
];

function CategoryModal({ initial, onSave, onClose }: CategoryModalProps) {
  const [key, setKey]     = useState(initial?.key ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon, setIcon]   = useState(initial?.icon ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const isEdit = !!initial;

  const handleSave = async () => {
    setError('');
    if (!label.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!icon.trim())  { setError('El ícono (2 letras) es obligatorio.'); return; }
    if (!isEdit && !key.trim()) { setError('El identificador es obligatorio.'); return; }

    setSaving(true);
    try {
      await onSave({ key: key.trim().toLowerCase().replace(/\s+/g, '_'), label, icon, color: color || undefined });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel animate-in" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!isEdit && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Identificador <span>*</span></label>
              <input
                className="form-input"
                placeholder="ej: soporte_remoto"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
              />
              <span className="form-hint">Solo letras, números y guiones bajos. No se puede cambiar después.</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Nombre <span>*</span></label>
            <input
              className="form-input"
              placeholder="ej: Soporte Remoto"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus={isEdit}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Ícono (2 letras) <span>*</span></label>
            <input
              className="form-input"
              maxLength={2}
              placeholder="ej: SR"
              value={icon}
              onChange={(e) => setIcon(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', letterSpacing: 2, maxWidth: 80 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 6 }}>
            <label className="form-label">Color de acento (opcional)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? '' : c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid var(--text-1)' : '2px solid transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'transform 0.15s',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => setColor('')}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  border: !color ? '3px solid var(--text-1)' : '2px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: 'var(--text-3)',
                }}
                title="Sin color"
              >✕</button>
            </div>
          </div>

          {error && <div className="form-error" style={{ marginTop: 10 }}>! {error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmProps {
  category: WorkspaceCategory;
  caseCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function DeleteConfirm({ category, caseCount, onConfirm, onClose }: DeleteConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel animate-in" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--error)' }}>Eliminar categoría</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-2)', marginBottom: 10 }}>
            ¿Estás seguro de que quieres eliminar <strong>{category.label}</strong>?
          </p>
          {caseCount > 0 && (
            <div className="form-error">
              ⚠ Hay {caseCount} caso{caseCount !== 1 ? 's' : ''} con esta categoría.
              Los casos existentes conservarán el valor original, pero ya no podrás crear casos con esta categoría.
            </div>
          )}
          {error && <div className="form-error" style={{ marginTop: 8 }}>! {error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className="btn"
            style={{ background: 'var(--error)', color: '#fff', fontWeight: 600 }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CategoriesPage({ onNavigate }: CategoriesPageProps) {
  const { cases } = useCases();
  const { categories, loading, error, addCategory, updateCategory, deleteCategory } = useCategories();

  const [showAdd, setShowAdd]         = useState(false);
  const [editing, setEditing]         = useState<WorkspaceCategory | null>(null);
  const [deleting, setDeleting]       = useState<WorkspaceCategory | null>(null);
  const [actionError, setActionError] = useState('');

  // Count cases per category key
  const caseCountByKey = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [cases]);

  const handleAdd = async (data: { key: string; label: string; icon: string; color?: string }) => {
    setActionError('');
    await addCategory(data);
  };

  const handleUpdate = async (data: { key: string; label: string; icon: string; color?: string }) => {
    if (!editing) return;
    setActionError('');
    await updateCategory(editing.id, { label: data.label, icon: data.icon, color: data.color });
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteCategory(deleting.id);
  };

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">{categories.length} categoría{categories.length !== 1 ? 's' : ''} en este workspace</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { setActionError(''); setShowAdd(true); }}>
            + Nueva categoría
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('new')}>
            + Nuevo caso
          </button>
        </div>
      </div>

      {actionError && <div className="form-error animate-in">{actionError}</div>}
      {error       && <div className="form-error animate-in">{error}</div>}

      {loading ? (
        <div className="cat-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="skeleton" style={{ height: 110, borderRadius: 14, animationDelay: `${item * 0.05}s` }} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
          <p>No hay categorías aún. Crea la primera.</p>
        </div>
      ) : (
        <div className="cat-grid">
          {categories.map((cat, index) => {
            const count = caseCountByKey[cat.key] || 0;
            const accentColor = cat.color || 'var(--accent)';
            return (
              <div
                key={cat.id}
                className="cat-card animate-in"
                style={{ animationDelay: `${index * 0.04}s`, cursor: 'default' }}
              >
                {/* Icon */}
                <div
                  className="cat-card-icon"
                  style={{ background: accentColor, boxShadow: `0 4px 12px ${accentColor}44` }}
                >
                  {cat.icon}
                </div>

                {/* Label & count */}
                <div className="cat-card-name">{cat.label}</div>
                <div className="cat-card-count">
                  {count === 0 ? 'Sin casos' : `${count} caso${count !== 1 ? 's' : ''}`}
                </div>

                {/* Key badge */}
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-3)',
                  background: 'var(--surface-2)',
                  borderRadius: 4,
                  padding: '1px 5px',
                  marginTop: 4,
                  fontFamily: 'monospace',
                }}>
                  {cat.key}
                </div>

                {/* Actions */}
                <div className="cat-card-actions">
                  <button
                    className="cat-card-action-btn"
                    title="Ver casos"
                    onClick={() => onNavigate('cases')}
                  >
                    👁
                  </button>
                  <button
                    className="cat-card-action-btn"
                    title="Editar"
                    onClick={() => setEditing(cat)}
                  >
                    ✏️
                  </button>
                  <button
                    className="cat-card-action-btn cat-card-action-btn--danger"
                    title="Eliminar"
                    onClick={() => setDeleting(cat)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <CategoryModal
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <CategoryModal
          initial={editing}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          category={deleting}
          caseCount={caseCountByKey[deleting.key] || 0}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
