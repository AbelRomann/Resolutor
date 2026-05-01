import type { Case, CaseAttachment, CaseAttachmentKind, CaseStatus } from '../types/case';
import { supabase } from '../lib/supabase';

const KB = 1024;
const MB = KB * KB;

export const CASE_ATTACHMENT_MAX_SIZE_BYTES = 10 * MB;
export const CASE_ATTACHMENT_MAX_SIZE_LABEL = '10 MB';
export const CASE_ATTACHMENT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export const CASE_ATTACHMENT_ACCEPT_ATTR = [
  '.pdf',
  '.json',
  '.txt',
  '.csv',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
].join(',');

function inferAttachmentKind(mimeType: string, fileName: string): CaseAttachmentKind {
  const lowerMime = mimeType.toLowerCase();
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  if (lowerMime.startsWith('image/')) return 'image';
  if (lowerMime === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (lowerMime === 'application/json' || extension === 'json') return 'json';
  if (lowerMime === 'text/plain' || extension === 'txt') return 'text';
  if (lowerMime === 'text/csv' || extension === 'csv') return 'csv';
  if (
    lowerMime === 'application/vnd.ms-excel'
    || lowerMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || extension === 'xls'
    || extension === 'xlsx'
  ) {
    return 'spreadsheet';
  }

  return 'file';
}

function buildLegacyAttachment(url: string, index: number): CaseAttachment {
  const name = url.split('/').pop() || `adjunto-${index + 1}`;
  return {
    name,
    url,
    mimeType: 'image/*',
    size: 0,
    kind: 'image',
  };
}

function normalizeAttachments(rawAttachments: any, legacyImageUrls: string[] | undefined): CaseAttachment[] {
  if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
    return rawAttachments
      .filter((item) => item && typeof item.url === 'string')
      .map((item, index) => ({
        name: typeof item.name === 'string' && item.name.trim() ? item.name : `adjunto-${index + 1}`,
        url: item.url,
        path: typeof item.path === 'string' ? item.path : undefined,
        mimeType: typeof item.mimeType === 'string' && item.mimeType.trim() ? item.mimeType : 'application/octet-stream',
        size: typeof item.size === 'number' ? item.size : 0,
        kind: inferAttachmentKind(item.mimeType || '', item.name || item.url),
      }));
  }

  return (legacyImageUrls ?? []).map(buildLegacyAttachment);
}

function imageUrlsFromAttachments(attachments: CaseAttachment[] | undefined): string[] {
  return (attachments ?? [])
    .filter((attachment) => attachment.kind === 'image')
    .map((attachment) => attachment.url);
}

// Row <-> Case mapping
function rowToCase(row: any): Case {
  const attachments = normalizeAttachments(row.attachments, row.image_urls ?? []);
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    creatorEmail: row.creator?.email,
    assignedToId: row.assigned_to,
    assignedToEmail: row.assignee?.email,
    title: row.title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    incidentDate: row.incident_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    whatIDid: row.what_i_did ?? '',
    howItWasResolved: row.how_it_was_resolved ?? '',
    solvedFor: row.solved_for ?? undefined,
    tags: row.tags ?? [],
    statusHistory: row.status_history ?? [],
    attachments,
    imageUrls: imageUrlsFromAttachments(attachments),
  };
}

function caseToRow(c: Omit<Case, 'createdAt' | 'updatedAt' | 'userId' | 'creatorEmail' | 'assignedToEmail'>) {
  const attachments = c.attachments ?? [];
  return {
    id: c.id,
    workspace_id: c.workspaceId,
    assigned_to: c.assignedToId || null,
    title: c.title,
    category: c.category,
    status: c.status,
    priority: c.priority,
    incident_date: c.incidentDate,
    what_i_did: c.whatIDid,
    how_it_was_resolved: c.howItWasResolved,
    solved_for: c.solvedFor || null,
    tags: c.tags,
    status_history: c.statusHistory,
    attachments,
    image_urls: imageUrlsFromAttachments(attachments),
  };
}

// CRUD
export async function fetchAllCases(workspaceId: string): Promise<Case[]> {
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      creator:profiles!cases_user_id_fkey(email),
      assignee:profiles!cases_assigned_to_fkey(email)
    `)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToCase);
}

export async function insertCase(c: Omit<Case, 'userId' | 'creatorEmail' | 'assignedToEmail'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('cases').insert({
    ...caseToRow(c),
    user_id: user?.id ?? null,
  });
  if (error) throw error;
}

export async function updateCaseInDb(id: string, fields: Partial<Case>): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.category !== undefined) patch.category = fields.category;
  if ('status' in fields) patch.status = fields.status ?? null;
  if ('priority' in fields) patch.priority = fields.priority ?? null;
  if (fields.incidentDate !== undefined) patch.incident_date = fields.incidentDate;
  if (fields.whatIDid !== undefined) patch.what_i_did = fields.whatIDid;
  if (fields.howItWasResolved !== undefined) patch.how_it_was_resolved = fields.howItWasResolved;
  if (fields.solvedFor !== undefined) patch.solved_for = fields.solvedFor || null;
  if (fields.assignedToId !== undefined) patch.assigned_to = fields.assignedToId || null;
  if (fields.tags !== undefined) patch.tags = fields.tags;
  if (fields.statusHistory !== undefined) patch.status_history = fields.statusHistory;
  if (fields.attachments !== undefined) {
    patch.attachments = fields.attachments;
    patch.image_urls = imageUrlsFromAttachments(fields.attachments);
  } else if (fields.imageUrls !== undefined) {
    patch.image_urls = fields.imageUrls;
  }

  const { error } = await supabase.from('cases').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCaseFromDb(id: string): Promise<void> {
  const { error } = await supabase.from('cases').delete().eq('id', id);
  if (error) throw error;
}

export function generateId(): string {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function buildNewCase(data: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'userId' | 'creatorEmail' | 'assignedToEmail'>): Omit<Case, 'userId' | 'creatorEmail' | 'assignedToEmail'> {
  const now = new Date().toISOString();
  return {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    statusHistory: [],
  };
}

export function applyStatusChange(c: Case, newStatus: CaseStatus, note?: string): Case {
  return {
    ...c,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    statusHistory: [
      ...c.statusHistory,
      { from: c.status, to: newStatus, date: new Date().toISOString(), note },
    ],
  };
}

export function validateCaseAttachment(file: File): void {
  if (!CASE_ATTACHMENT_ACCEPTED_TYPES.includes(file.type as (typeof CASE_ATTACHMENT_ACCEPTED_TYPES)[number])) {
    throw new Error('Tipo de archivo no permitido. Usa PDF, JSON, TXT, Excel, CSV o imagenes.');
  }

  if (file.size > CASE_ATTACHMENT_MAX_SIZE_BYTES) {
    throw new Error(`Cada archivo debe pesar como maximo ${CASE_ATTACHMENT_MAX_SIZE_LABEL}.`);
  }
}

export async function uploadCaseAttachmentToStorage(file: File): Promise<CaseAttachment> {
  validateCaseAttachment(file);

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `case_attachments/${fileName}`;

  const { error } = await supabase.storage
    .from('case-attachments')
    .upload(filePath, file);

  if (error) {
    throw new Error(`Error al subir archivo: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('case-attachments')
    .getPublicUrl(filePath);

  return {
    name: file.name,
    url: publicUrlData.publicUrl,
    path: filePath,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    kind: inferAttachmentKind(file.type, file.name),
  };
}
