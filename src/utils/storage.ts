import type { Case, CaseStatus } from '../types/case';
import { supabase } from '../lib/supabase';

// Row <-> Case mapping
function rowToCase(row: any): Case {
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
  };
}

function caseToRow(c: Omit<Case, 'createdAt' | 'updatedAt' | 'userId' | 'creatorEmail' | 'assignedToEmail'>) {
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
  if (fields.status !== undefined) patch.status = fields.status;
  if (fields.priority !== undefined) patch.priority = fields.priority;
  if (fields.incidentDate !== undefined) patch.incident_date = fields.incidentDate;
  if (fields.whatIDid !== undefined) patch.what_i_did = fields.whatIDid;
  if (fields.howItWasResolved !== undefined) patch.how_it_was_resolved = fields.howItWasResolved;
  if (fields.solvedFor !== undefined) patch.solved_for = fields.solvedFor || null;
  if (fields.assignedToId !== undefined) patch.assigned_to = fields.assignedToId || null;
  if (fields.tags !== undefined) patch.tags = fields.tags;
  if (fields.statusHistory !== undefined) patch.status_history = fields.statusHistory;

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
