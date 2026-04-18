import { useState } from 'react';
import type { Case, CaseStatus, CaseCategory, CasePriority } from '../types/case';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '../types/case';
import { useCases } from '../store/useCasesStore';
import { TagsInput } from '../components/TagsInput';
import { todayISO } from '../utils/date';

interface CaseFormPageProps {
  editingCase?: Case;
  onNavigate: (page: string, id?: string) => void;
}

const EMPTY: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> = {
  title: '',
  category: 'software' as CaseCategory,
  status: 'en_progreso' as CaseStatus,
  priority: 'media' as CasePriority,
  incidentDate: todayISO(),
  whatIDid: '',
  howItWasResolved: '',
  tags: [],
};

export function CaseFormPage({ editingCase, onNavigate }: CaseFormPageProps) {
  const { addCase, updateCase } = useCases();
  const isEdit = !!editingCase;

  const [form, setForm] = useState(isEdit ? {
    title: editingCase.title,
    category: editingCase.category,
    status: editingCase.status,
    priority: editingCase.priority,
    incidentDate: editingCase.incidentDate,
    whatIDid: editingCase.whatIDid,
    howItWasResolved: editingCase.howItWasResolved,
    tags: editingCase.tags,
  } : { ...EMPTY });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    setError(''); setSaving(true);
    try {
      if (isEdit) {
        await updateCase(editingCase.id, form);
        onNavigate('detail', editingCase.id);
      } else {
        const c = await addCase(form);
        onNavigate('detail', c.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-wrap form-page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">{isEdit ? 'Editar Caso' : 'Nuevo Caso'}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editando: ${editingCase.title}` : 'Registra un nuevo incidente técnico'}
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => onNavigate(isEdit ? 'detail' : 'cases', editingCase?.id)}>
          ← Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic info */}
        <div className="form-section animate-in">
          <div className="form-section-title">Información básica</div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Título del incidente <span>*</span></label>
            <input
              className="form-input"
              placeholder="Ej: Impresora HP no conecta después de actualización de Windows"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-grid-4">
            <div className="form-group">
              <label className="form-label">Categoría <span>*</span></label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {(Object.keys(CATEGORY_LABELS) as CaseCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado <span>*</span></label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {(Object.keys(STATUS_LABELS) as CaseStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {(Object.keys(PRIORITY_LABELS) as CasePriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha del incidente <span>*</span></label>
              <input
                className="form-input"
                type="date"
                value={form.incidentDate}
                onChange={e => set('incidentDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="form-section animate-in animate-delay-1">
          <div className="form-section-title">Descripción</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">¿Qué hice?</label>
              <span className="form-hint" style={{ marginBottom: 6, display: 'block' }}>Pasos, herramientas, diagnóstico.</span>
              <textarea
                className="form-textarea"
                placeholder="Desinstalé el driver, reinicié el Print Spooler…"
                value={form.whatIDid}
                onChange={e => set('whatIDid', e.target.value)}
                rows={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Cómo se resolvió?</label>
              <span className="form-hint" style={{ marginBottom: 6, display: 'block' }}>Solución final o estado actual.</span>
              <textarea
                className="form-textarea"
                placeholder="Instalé el driver universal HP v8.0.2…"
                value={form.howItWasResolved}
                onChange={e => set('howItWasResolved', e.target.value)}
                rows={6}
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="form-section animate-in animate-delay-2">
          <div className="form-section-title">Etiquetas</div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <span className="form-hint" style={{ marginBottom: 7, display: 'block' }}>Presiona Enter o coma para agregar.</span>
            <TagsInput tags={form.tags} onChange={tags => set('tags', tags)} />
          </div>
        </div>

        {error && <div className="form-error animate-in">⚠️ {error}</div>}

        <div className="form-actions animate-in animate-delay-3">
          <button type="button" className="btn btn-outline" onClick={() => onNavigate(isEdit ? 'detail' : 'cases', editingCase?.id)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? '⏳ Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar caso'}
          </button>
        </div>
      </form>
    </div>
  );
}
