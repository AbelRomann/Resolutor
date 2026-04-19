import type { Task, TaskStatus } from '../types/case';
import { supabase } from '../lib/supabase';

function rowToTask(row: any): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    caseId: row.case_id ?? undefined,
    caseTitle: row.case_record?.title ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    executionType: row.execution_type,
    status: row.status,
    assigneeUserId: row.assignee_user_id ?? undefined,
    assigneeEmail: row.assignee?.email ?? undefined,
    assigneeAgent: row.assignee_agent ?? undefined,
    requiredCapability: row.required_capability ?? undefined,
    resolutionOutput: row.resolution_output ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchWorkspaceTasks(workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assignee_user_id_fkey(email),
      case_record:cases(title)
    `)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToTask);
}

export async function createTask(input: {
  workspaceId: string;
  caseId?: string;
  title: string;
  description?: string;
  executionType: Task['executionType'];
  assigneeUserId?: string;
  assigneeAgent?: string;
  requiredCapability?: string;
}): Promise<void> {
  const { error } = await supabase.from('tasks').insert({
    workspace_id: input.workspaceId,
    case_id: input.caseId ?? null,
    title: input.title,
    description: input.description ?? null,
    execution_type: input.executionType,
    status: input.executionType === 'automation' ? 'queued' : 'pending',
    assignee_user_id: input.assigneeUserId || null,
    assignee_agent: input.assigneeAgent || null,
    required_capability: input.requiredCapability || null,
  });

  if (error) throw error;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);

  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}
