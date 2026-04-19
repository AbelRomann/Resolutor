import { useEffect, useState } from 'react';
import type {
  Case,
  CaseCategory,
  CasePriority,
  CaseStatus,
  WorkspaceMember,
} from '../types/case';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '../types/case';
import { TagsInput } from '../components/TagsInput';
import { useCases } from '../store/useCasesStore';
import { useWorkspace } from '../store/useWorkspaceStore';
import { todayISO } from '../utils/date';

interface CaseFormPageProps {
  editingCase?: Case;
  onNavigate: (page: string, id?: string) => void;
}

type CaseFormValues = Omit<
  Case,
  'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'workspaceId' | 'userId' | 'creatorEmail' | 'assignedToEmail'
>;

const EMPTY: CaseFormValues = {
  title: '',
  category: 'software' as CaseCategory,
  status: 'en_progreso' as CaseStatus,
  priority: 'media' as CasePriority,
  incidentDate: todayISO(),
  whatIDid: '',
  howItWasResolved: '',
  solvedFor: '',
  assignedToId: '',
  tags: [],
};

export function CaseFormPage({ editingCase, onNavigate }: CaseFormPageProps) {
  const { addCase, updateCase } = useCases();
  const { fetchMembers, activeWorkspaceId } = useWorkspace();
  const isEdit = !!editingCase;
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [form, setForm] = useState<CaseFormValues>(isEdit ? {
    title: editingCase.title,
    category: editingCase.category,
    status: editingCase.status,
    priority: editingCase.priority,
    incidentDate: editingCase.incidentDate,
    whatIDid: editingCase.whatIDid,
    howItWasResolved: editingCase.howItWasResolved,
    solvedFor: editingCase.solvedFor || '',
    assignedToId: editingCase.assignedToId || '',
    tags: editingCase.tags,
  } : { ...EMPTY });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setMembers([]);
      return;
    }

    fetchMembers().then(setMembers).catch((memberError: Error) => {
      setError(memberError.message);
    });
  }, [activeWorkspaceId, fetchMembers]);

  const set = <K extends keyof CaseFormValues>(field: K, value: CaseFormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('El titulo es obligatorio.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      if (isEdit) {
        await updateCase(editingCase.id, form);
        onNavigate('detail', editingCase.id);
      } else {
        const created = await addCase(form);
        onNavigate('detail', created.id);
      }
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap form-page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">{isEdit ? 'Editar Caso' : 'Nuevo Caso'}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editando: ${editingCase.title}` : 'Registra un nuevo incidente tecnico'}
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => onNavigate(isEdit ? 'detail' : 'cases', editingCase?.id)}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section animate-in">
          <div className="form-section-title">Informacion basica</div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Titulo del incidente <span>*</span></label>
            <input
              className="form-input"
              placeholder="Ej: Impresora HP no conecta despues de actualizacion de Windows"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Usuario / Departamento (Opcional)</label>
            <input
              className="form-input"
              list="usersList"
              placeholder="Ej: Contabilidad, Juan Perez..."
              value={form.solvedFor}
              onChange={(e) => set('solvedFor', e.target.value)}
            />
            <datalist id="usersList">
              <option value="Contabilidad" />
              <option value="Recursos Humanos" />
              <option value="Ventas" />
              <option value="Gerencia" />
            </datalist>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Asignar a... (Opcional)</label>
            <select
              className="form-select"
              value={form.assignedToId || ''}
              onChange={(e) => set('assignedToId', e.target.value)}
            >
              <option value="">(Sin asignar)</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email}
                  {member.role === 'owner' ? ' (Propietario)' : member.role === 'admin' ? ' (Admin)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid-4">
            <div className="form-group">
              <label className="form-label">Categoria <span>*</span></label>
              <select className="form-select" value={form.category} onChange={(e) => set('category', e.target.value as CaseCategory)}>
                {(Object.keys(CATEGORY_LABELS) as CaseCategory[]).map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado <span>*</span></label>
              <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value as CaseStatus)}>
                {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((status) => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select className="form-select" value={form.priority} onChange={(e) => set('priority', e.target.value as CasePriority)}>
                {(Object.keys(PRIORITY_LABELS) as CasePriority[]).map((priority) => (
                  <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha del incidente <span>*</span></label>
              <input
                className="form-input"
                type="date"
                value={form.incidentDate}
                onChange={(e) => set('incidentDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section animate-in animate-delay-1">
          <div className="form-section-title">Seguimiento del caso</div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Analisis y acciones realizadas</label>
              <span className="form-hint" style={{ marginBottom: 6, display: 'block' }}>Diagnostico, pruebas, pasos ejecutados y evidencia encontrada.</span>
              <textarea
                className="form-textarea"
                placeholder="Ej: Revise el spooler, reinstale el driver y valide conectividad con la impresora."
                value={form.whatIDid}
                onChange={(e) => set('whatIDid', e.target.value)}
                rows={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Resultado, solucion o siguiente paso</label>
              <span className="form-hint" style={{ marginBottom: 6, display: 'block' }}>Indica si quedo resuelto, que solucion se aplico o cual es el siguiente paso.</span>
              <textarea
                className="form-textarea"
                placeholder="Ej: Quedo resuelto con el driver universal HP v8.0.2. Si no, indica que falta o a quien se escalo."
                value={form.howItWasResolved}
                onChange={(e) => set('howItWasResolved', e.target.value)}
                rows={6}
              />
            </div>
          </div>
        </div>

        <div className="form-section animate-in animate-delay-2">
          <div className="form-section-title">Etiquetas</div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <span className="form-hint" style={{ marginBottom: 7, display: 'block' }}>Presiona Enter o coma para agregar.</span>
            <TagsInput tags={form.tags} onChange={(tags) => set('tags', tags)} />
          </div>
        </div>

        {error && <div className="form-error animate-in">! {error}</div>}

        <div className="form-actions animate-in animate-delay-3">
          <button type="button" className="btn btn-outline" onClick={() => onNavigate(isEdit ? 'detail' : 'cases', editingCase?.id)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar caso'}
          </button>
        </div>
      </form>
    </div>
  );
}
