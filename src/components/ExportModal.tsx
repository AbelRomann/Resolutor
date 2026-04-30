import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_EXPORT_FIELDS,
  EXPORT_FIELD_LABELS,
  type ExportField,
  type ExportFormat,
} from '../utils/exportCases';

interface ExportModalProps {
  isOpen: boolean;
  scopeLabel: string;
  caseCount: number;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: {
    format: ExportFormat;
    fields: ExportField[];
    includeTasks: boolean;
    includeNotes: boolean;
  }) => Promise<void> | void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'json', label: 'JSON' },
];

export function ExportModal({
  isOpen,
  scopeLabel,
  caseCount,
  loading = false,
  error,
  onClose,
  onSubmit,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [fields, setFields] = useState<ExportField[]>(DEFAULT_EXPORT_FIELDS);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setFormat('pdf');
    setFields(DEFAULT_EXPORT_FIELDS);
    setIncludeTasks(true);
    setIncludeNotes(true);
  }, [isOpen]);

  const visibleFieldOptions = useMemo(() => {
    return DEFAULT_EXPORT_FIELDS.filter((field) => {
      if (field === 'tasks') return includeTasks;
      if (field === 'notes') return includeNotes;
      return true;
    });
  }, [includeNotes, includeTasks]);

  const toggleField = (field: ExportField) => {
    setFields((prev) => (
      prev.includes(field)
        ? prev.filter((current) => current !== field)
        : [...prev, field]
    ));
  };

  useEffect(() => {
    setFields((prev) => prev.filter((field) => {
      if (field === 'tasks') return includeTasks;
      if (field === 'notes') return includeNotes;
      return true;
    }));
  }, [includeNotes, includeTasks]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="modal-panel export-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Exportar casos</div>
            <div className="export-modal-subtitle">
              {scopeLabel} · {caseCount} caso{caseCount !== 1 ? 's' : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="modal-body export-modal-body">
          <div className="export-section">
            <div className="export-section-title">Formato</div>
            <div className="export-format-grid">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`export-format-card ${format === option.value ? 'active' : ''}`}
                  onClick={() => setFormat(option.value)}
                >
                  <strong>{option.label}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="export-section">
            <div className="export-section-head">
              <div className="export-section-title">Contenido</div>
              <div className="export-inline-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFields(visibleFieldOptions)}
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFields([])}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="export-option-grid">
              {visibleFieldOptions.map((field) => (
                <label key={field} className="export-check">
                  <input
                    type="checkbox"
                    checked={fields.includes(field)}
                    onChange={() => toggleField(field)}
                  />
                  <span>{EXPORT_FIELD_LABELS[field]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="export-section">
            <div className="export-section-title">Opciones</div>
            <div className="export-toggle-list">
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={includeTasks}
                  onChange={(event) => setIncludeTasks(event.target.checked)}
                />
                <span>Incluir tareas</span>
              </label>
              <label className="export-check">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(event) => setIncludeNotes(event.target.checked)}
                />
                <span>Incluir notas/comentarios</span>
              </label>
            </div>
          </div>

          {error && <div className="form-error" style={{ marginBottom: 0 }}>{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={loading || fields.length === 0}
            onClick={() => onSubmit({ format, fields, includeTasks, includeNotes })}
          >
            {loading ? 'Generando...' : 'Descargar'}
          </button>
        </div>
      </div>
    </div>
  );
}
