import { useEffect, useState } from 'react';
import type {
  Case,
  CaseAttachment,
  CasePriority,
  CaseStatus,
  WorkspaceMember,
} from '../types/case';
import { STATUS_LABELS } from '../types/case';
import { TagsInput } from '../components/TagsInput';
import { useCases } from '../store/useCasesStore';
import { useCategories } from '../store/useCategoriesStore';
import { useWorkspace } from '../store/useWorkspaceStore';
import { todayISO } from '../utils/date';
import {
  CASE_ATTACHMENT_ACCEPT_ATTR,
  CASE_ATTACHMENT_MAX_SIZE_LABEL,
  uploadCaseAttachmentToStorage,
  validateCaseAttachment,
} from '../utils/storage';

interface CaseFormPageProps {
  editingCase?: Case;
  onNavigate: (page: string, id?: string) => void;
}

type CaseFormValues = Omit<
  Case,
  'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'workspaceId' | 'userId' | 'creatorEmail' | 'assignedToEmail'
>;

const EMPTY = {
  title: '',
  category: 'software',
  status: null as CaseStatus,
  priority: null as CasePriority,
  incidentDate: todayISO(),
  whatIDid: '',
  howItWasResolved: '',
  solvedFor: '',
  assignedToId: '',
  tags: [] as string[],
  attachments: [] as CaseAttachment[],
};

export function CaseFormPage({ editingCase, onNavigate }: CaseFormPageProps) {
  const { addCase, updateCase } = useCases();
  const { fetchMembers, activeWorkspaceId } = useWorkspace();
  const { categories } = useCategories();
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
    attachments: editingCase.attachments || [],
  } : { ...EMPTY });

  interface PendingAttachment {
    file: File;
    preview?: string;
  }
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
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
      let finalAttachments = [...(form.attachments || [])];

      if (pendingAttachments.length > 0) {
        const uploadPromises = pendingAttachments.map((pendingAttachment) => uploadCaseAttachmentToStorage(pendingAttachment.file));
        const newAttachments = await Promise.all(uploadPromises);
        finalAttachments = [...finalAttachments, ...newAttachments];
      }

      const formToSave = { ...form, attachments: finalAttachments };

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

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUploadedAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return 'Tamano no disponible';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const attachmentLabel = (attachment: { kind?: string; mimeType?: string; name: string }) => {
    if (attachment.kind === 'image') return 'Imagen';
    if (attachment.kind === 'pdf') return 'PDF';
    if (attachment.kind === 'json') return 'JSON';
    if (attachment.kind === 'text') return 'TXT';
    if (attachment.kind === 'csv') return 'CSV';
    if (attachment.kind === 'spreadsheet') return 'Excel';
    return attachment.mimeType || 'Archivo';
  };

  const isImageAttachment = (attachment: { kind?: string; mimeType?: string }) => (
    attachment.kind === 'image' || attachment.mimeType?.startsWith('image/')
  );

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
              <select className="form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categories.length === 0 ? (
                  <option value="otro">Otro</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={form.status ?? ''}
                onChange={(e) => set('status', (e.target.value || null) as CaseStatus)}
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

            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select
                className="form-select"
                value={form.priority ?? ''}
                onChange={(e) => set('priority', (e.target.value || null) as CasePriority)}
              >
                <option value="">Sin prioridad</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
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
            <label className="form-label">Adjuntos</label>
            <span className="form-hint" style={{ marginBottom: 8, display: 'block' }}>
              Permite PDF, JSON, TXT, Excel, CSV o imagenes. Maximo {CASE_ATTACHMENT_MAX_SIZE_LABEL} por archivo.
            </span>
            <input
              type="file"
              accept={CASE_ATTACHMENT_ACCEPT_ATTR}
              multiple
              className="form-input"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  try {
                    const newFiles = Array.from(e.target.files).map((file) => {
                      validateCaseAttachment(file);
                      return {
                        file,
                        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                      };
                    });
                    setPendingAttachments((prev) => [...prev, ...newFiles]);
                    setError('');
                  } catch (attachmentError: any) {
                    setError(attachmentError.message ?? 'No se pudo adjuntar el archivo.');
                  }
                }
                e.target.value = '';
              }}
            />

            {(form.attachments && form.attachments.length > 0) || pendingAttachments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {form.attachments?.map((attachment, i) => (
                  <div key={`${attachment.url}-${i}`} className="card card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      {isImageAttachment(attachment) ? (
                        <img src={attachment.url} alt={attachment.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)', flexShrink: 0 }}>
                          {attachmentLabel(attachment)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachment.name}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>
                          {attachmentLabel(attachment)}{attachment.size ? ` - ${formatBytes(attachment.size)}` : ''}
                        </div>
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => removeUploadedAttachment(i)}>
                      Quitar
                    </button>
                  </div>
                ))}
                {pendingAttachments.map((attachment, i) => (
                  <div key={`pending-${attachment.file.name}-${i}`} className="card card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: '1px dashed var(--accent-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      {attachment.preview ? (
                        <img src={attachment.preview} alt={attachment.file.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)', flexShrink: 0 }}>
                          {attachmentLabel({ name: attachment.file.name, mimeType: attachment.file.type })}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachment.file.name}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>
                          Pendiente - {attachmentLabel({ name: attachment.file.name, mimeType: attachment.file.type })} - {formatBytes(attachment.file.size)}
                        </div>
                      </div>
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => removePendingAttachment(i)}>
                      Quitar
                    </button>
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
