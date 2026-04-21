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
import { uploadCaseImageToStorage } from '../utils/storage';

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
  imageUrls: [],
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
    imageUrls: editingCase.imageUrls || [],
  } : { ...EMPTY });
  
  interface PendingImage {
    file: File;
    preview: string;
  }
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
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
      let finalImageUrls = [...(form.imageUrls || [])];
      
      if (pendingImages.length > 0) {
        const uploadPromises = pendingImages.map(p => uploadCaseImageToStorage(p.file));
        const newUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...newUrls];
      }
      
      const formToSave = { ...form, imageUrls: finalImageUrls };

      if (isEdit) {
        await updateCase(editingCase.id, formToSave);
        onNavigate('detail', editingCase.id);
      } else {
        const created = await addCase(formToSave);
        onNavigate('detail', created.id);
      }
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeUploadedImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((_, i) => i !== index)
    }));
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
          <div className="form-section-title">Archivos y Etiquetas</div>
          
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Imagenes adjuntas</label>
            <span className="form-hint" style={{ marginBottom: 8, display: 'block' }}>Sube capturas de pantalla o fotos del error (Max 5MB por imagen).</span>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="form-input"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const newFiles = Array.from(e.target.files).map(file => ({
                    file,
                    preview: URL.createObjectURL(file)
                  }));
                  setPendingImages(prev => [...prev, ...newFiles]);
                }
                e.target.value = ''; // reset
              }}
            />
            
            {(form.imageUrls && form.imageUrls.length > 0) || pendingImages.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                {form.imageUrls?.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={url} alt={`Adjunto ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeUploadedImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>&times;</button>
                  </div>
                ))}
                {pendingImages.map((imgObj, i) => (
                  <div key={`pending-${i}`} style={{ position: 'relative', width: 80, height: 80, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--primary)' }}>
                    <img src={imgObj.preview} alt={`Pendiente ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                    <button type="button" onClick={() => removePendingImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>&times;</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

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
