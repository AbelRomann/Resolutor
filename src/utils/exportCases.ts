import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx' | 'json';

export type ExportField =
  | 'id'
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'category'
  | 'assignedTo'
  | 'createdAt'
  | 'updatedAt'
  | 'resolvedAt'
  | 'tags'
  | 'tasks'
  | 'notes'
  | 'attachments';

export interface ExportTaskItem {
  id: string;
  title: string;
  description?: string;
  type: 'human' | 'automation' | 'hybrid';
  status: string;
  assignedTo?: string;
  assignedAgent?: string;
}

export interface ExportNoteItem {
  id: string;
  content: string;
  author?: string;
  createdAt?: string;
}

export interface ExportAttachmentItem {
  name: string;
  url: string;
}

export interface ExportCaseRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
  tags: string[];
  tasks: ExportTaskItem[];
  notes: ExportNoteItem[];
  attachments: ExportAttachmentItem[];
}

export interface ExportMeta {
  workspaceName: string;
  exportedAt: string;
  exportedBy: string;
  scopeLabel: string;
  caseCount: number;
}

export interface ExportOptions {
  format: ExportFormat;
  fields: ExportField[];
  includeTasks: boolean;
  includeNotes: boolean;
  fileBaseName?: string;
  meta: ExportMeta;
}

export const EXPORT_FIELD_LABELS: Record<ExportField, string> = {
  id: 'ID del caso',
  title: 'Titulo',
  description: 'Descripcion',
  status: 'Estado',
  priority: 'Prioridad',
  category: 'Categoria',
  assignedTo: 'Asignado a',
  createdAt: 'Fecha de creacion',
  updatedAt: 'Fecha de actualizacion',
  resolvedAt: 'Fecha de resolucion',
  tags: 'Etiquetas',
  tasks: 'Tareas asociadas',
  notes: 'Notas/comentarios',
  attachments: 'Adjuntos',
};

export const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'category',
  'assignedTo',
  'createdAt',
  'updatedAt',
  'resolvedAt',
  'tags',
  'tasks',
  'notes',
  'attachments',
];

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' | ');
  if (/[",;]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileExtension(format: ExportFormat): string {
  if (format === 'xlsx') return 'xlsx';
  return format;
}

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'casos';
}

function formatMeta(meta: ExportMeta): string[] {
  return [
    `Workspace: ${meta.workspaceName}`,
    `Exportado por: ${meta.exportedBy}`,
    `Fecha de exportacion: ${meta.exportedAt}`,
    `Alcance: ${meta.scopeLabel}`,
    `Cantidad de casos: ${meta.caseCount}`,
  ];
}

function serializeTasks(tasks: ExportTaskItem[]): string {
  if (tasks.length === 0) return '';
  return tasks
    .map((task) => {
      const assignee = task.assignedTo || task.assignedAgent || 'Sin asignar';
      const description = task.description ? ` - ${task.description}` : '';
      return `${task.title} [${task.type}/${task.status}] (${assignee})${description}`;
    })
    .join('\n');
}

function serializeNotes(notes: ExportNoteItem[]): string {
  if (notes.length === 0) return '';
  return notes
    .map((note) => {
      const author = note.author || 'Sistema';
      const created = note.createdAt ? ` (${note.createdAt})` : '';
      return `${author}${created}: ${note.content}`;
    })
    .join('\n');
}

function serializeAttachments(attachments: ExportAttachmentItem[]): string {
  if (attachments.length === 0) return '';
  return attachments.map((attachment) => `${attachment.name}: ${attachment.url}`).join('\n');
}

function caseValueByField(record: ExportCaseRecord, field: ExportField): string {
  switch (field) {
    case 'id':
      return record.id;
    case 'title':
      return record.title;
    case 'description':
      return record.description;
    case 'status':
      return record.status;
    case 'priority':
      return record.priority;
    case 'category':
      return record.category;
    case 'assignedTo':
      return record.assignedTo;
    case 'createdAt':
      return record.createdAt;
    case 'updatedAt':
      return record.updatedAt;
    case 'resolvedAt':
      return record.resolvedAt;
    case 'tags':
      return record.tags.join(', ');
    case 'tasks':
      return serializeTasks(record.tasks);
    case 'notes':
      return serializeNotes(record.notes);
    case 'attachments':
      return serializeAttachments(record.attachments);
    default:
      return '';
  }
}

function toFlatRow(record: ExportCaseRecord, fields: ExportField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[EXPORT_FIELD_LABELS[field]] = caseValueByField(record, field);
    return acc;
  }, {});
}

function exportJson(records: ExportCaseRecord[], options: ExportOptions, fileName: string) {
  const payload = {
    meta: options.meta,
    fields: options.fields,
    cases: records.map((record) => ({
      ...record,
      tasks: options.includeTasks ? record.tasks : [],
      notes: options.includeNotes ? record.notes : [],
    })),
  };

  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    fileName,
  );
}

function exportCsv(records: ExportCaseRecord[], options: ExportOptions, fileName: string) {
  const metaLines = formatMeta(options.meta).map((line) => escapeCsvCell(line));
  const headers = options.fields.map((field) => escapeCsvCell(EXPORT_FIELD_LABELS[field])).join(';');
  const rows = records
    .map((record) => options.fields.map((field) => escapeCsvCell(caseValueByField(record, field))).join(';'));
  const csvContent = [...metaLines, '', headers, ...rows].join('\n');
  triggerDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }), fileName);
}

function exportXlsx(records: ExportCaseRecord[], options: ExportOptions, fileName: string) {
  const workbook = XLSX.utils.book_new();
  const metaSheet = XLSX.utils.json_to_sheet(
    formatMeta(options.meta).map((line) => {
      const [label, ...rest] = line.split(': ');
      return { Campo: label, Valor: rest.join(': ') };
    }),
  );
  const casesSheet = XLSX.utils.json_to_sheet(records.map((record) => toFlatRow(record, options.fields)));
  XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');
  XLSX.utils.book_append_sheet(workbook, casesSheet, 'Casos');
  XLSX.writeFile(workbook, fileName);
}

function exportPdf(records: ExportCaseRecord[], options: ExportOptions, fileName: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineHeight = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (extraHeight: number) => {
    if (y + extraHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Exportacion de casos', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  formatMeta(options.meta).forEach((line) => {
    ensureSpace(lineHeight);
    doc.text(line, margin, y);
    y += lineHeight;
  });

  y += 10;

  records.forEach((record, index) => {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${record.title || 'Sin titulo'}`, margin, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    options.fields.forEach((field) => {
      const label = EXPORT_FIELD_LABELS[field];
      const value = caseValueByField(record, field) || 'N/A';
      const wrapped = doc.splitTextToSize(`${label}: ${value}`, contentWidth);
      ensureSpace(wrapped.length * lineHeight + 6);
      doc.text(wrapped, margin, y);
      y += wrapped.length * lineHeight + 4;
    });

    y += 8;
  });

  doc.save(fileName);
}

export async function exportCases(records: ExportCaseRecord[], options: ExportOptions): Promise<void> {
  const trimmedFields = options.fields.filter((field) => {
    if (field === 'tasks') return options.includeTasks;
    if (field === 'notes') return options.includeNotes;
    return true;
  });
  const fileName = `${sanitizeFileName(options.fileBaseName || `casos-${options.meta.workspaceName}`)}.${fileExtension(options.format)}`;
  const normalizedOptions = { ...options, fields: trimmedFields };

  if (options.format === 'json') {
    exportJson(records, normalizedOptions, fileName);
    return;
  }

  if (options.format === 'csv') {
    exportCsv(records, normalizedOptions, fileName);
    return;
  }

  if (options.format === 'xlsx') {
    exportXlsx(records, normalizedOptions, fileName);
    return;
  }

  exportPdf(records, normalizedOptions, fileName);
}
