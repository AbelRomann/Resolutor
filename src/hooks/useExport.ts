import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuthStore';
import { useWorkspace } from '../store/useWorkspaceStore';
import type { Case, StatusChange, Task } from '../types/case';
import {
  exportCases,
  type ExportAttachmentItem,
  type ExportCaseRecord,
  type ExportField,
  type ExportFormat,
} from '../utils/exportCases';

interface ExportScope {
  type: 'all' | 'selected' | 'single';
  ids?: string[];
}

interface RunExportInput {
  scope: ExportScope;
  format: ExportFormat;
  fields: ExportField[];
  includeTasks: boolean;
  includeNotes: boolean;
  fileBaseName?: string;
}

function mapRowToCase(row: any): Case {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    creatorEmail: row.creator?.email,
    assignedToId: row.assigned_to ?? undefined,
    assignedToEmail: row.assignee?.email ?? undefined,
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
    imageUrls: row.image_urls ?? [],
  };
}

function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    caseId: row.case_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    executionType: row.execution_type,
    status: row.status,
    assigneeUserId: row.assignee_user_id ?? undefined,
    assigneeEmail: row.assignee?.email ?? undefined,
    assigneeAgent: row.assignee_agent ?? undefined,
    requiredCapability: row.required_capability ?? undefined,
    resolutionOutput: row.resolution_output ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeStatus(status: Case['status']): string {
  if (status === 'en_progreso') return 'in_progress';
  if (status === 'descartado') return 'closed';
  if (status === 'resuelto' || status === 'resuelto_sin_problemas' || status === 'resuelto_con_ayuda') {
    return 'resolved';
  }
  return 'open';
}

function inferResolvedAt(status: Case['status'], history: StatusChange[]): string {
  if (status !== 'resuelto' && status !== 'resuelto_sin_problemas' && status !== 'resuelto_con_ayuda') {
    return '';
  }

  const resolvedChange = [...history].reverse().find((entry) => (
    entry.to === 'resuelto' || entry.to === 'resuelto_sin_problemas' || entry.to === 'resuelto_con_ayuda'
  ));
  return resolvedChange?.date ?? '';
}

function buildDescription(c: Case): string {
  const sections = [
    c.whatIDid ? `Analisis y acciones:\n${c.whatIDid}` : '',
    c.howItWasResolved ? `Resultado o siguiente paso:\n${c.howItWasResolved}` : '',
  ].filter(Boolean);
  return sections.join('\n\n');
}

function attachmentNameFromUrl(url: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || `adjunto-${index + 1}`;
  } catch {
    return `adjunto-${index + 1}`;
  }
}

function buildAttachments(imageUrls: string[] | undefined): ExportAttachmentItem[] {
  return (imageUrls ?? []).map((url, index) => ({
    name: attachmentNameFromUrl(url, index),
    url,
  }));
}

export function useExport() {
  const { user } = useAuth();
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runExport = async ({
    scope,
    format,
    fields,
    includeTasks,
    includeNotes,
    fileBaseName,
  }: RunExportInput) => {
    if (!activeWorkspaceId) {
      throw new Error('No hay un workspace activo para exportar.');
    }

    if ((scope.type === 'selected' || scope.type === 'single') && (!scope.ids || scope.ids.length === 0)) {
      throw new Error('No hay casos seleccionados para exportar.');
    }

    setLoading(true);
    setError(null);

    try {
      let casesQuery = supabase
        .from('cases')
        .select(`
          *,
          creator:profiles!cases_user_id_fkey(email),
          assignee:profiles!cases_assigned_to_fkey(email)
        `)
        .eq('workspace_id', activeWorkspaceId)
        .order('updated_at', { ascending: false });

      if ((scope.type === 'selected' || scope.type === 'single') && scope.ids && scope.ids.length > 0) {
        casesQuery = casesQuery.in('id', scope.ids);
      }

      const { data: caseRows, error: casesError } = await casesQuery;
      if (casesError) throw casesError;

      const cases = (caseRows ?? []).map(mapRowToCase);
      const caseIds = cases.map((item) => item.id);

      let tasksByCase = new Map<string, Task[]>();

      if (includeTasks && caseIds.length > 0) {
        const { data: taskRows, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            *,
            assignee:profiles!tasks_assignee_user_id_fkey(email)
          `)
          .eq('workspace_id', activeWorkspaceId)
          .in('case_id', caseIds);

        if (tasksError) throw tasksError;

        tasksByCase = (taskRows ?? [])
          .map(mapRowToTask)
          .reduce<Map<string, Task[]>>((acc, task) => {
            if (!task.caseId) return acc;
            const existing = acc.get(task.caseId) ?? [];
            acc.set(task.caseId, [...existing, task]);
            return acc;
          }, new Map());
      }

      const records: ExportCaseRecord[] = cases.map((item) => ({
        id: item.id,
        title: item.title || 'Sin titulo',
        description: buildDescription(item),
        status: normalizeStatus(item.status),
        priority: item.priority ?? '',
        category: item.category ?? '',
        assignedTo: item.assignedToEmail ?? '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        resolvedAt: inferResolvedAt(item.status, item.statusHistory),
        tags: item.tags ?? [],
        tasks: (tasksByCase.get(item.id) ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.executionType,
          status: task.status,
          assignedTo: task.assigneeEmail,
          assignedAgent: task.assigneeAgent,
        })),
        notes: includeNotes ? [] : [],
        attachments: buildAttachments(item.imageUrls),
      }));

      const workspaceName = workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.name ?? 'Workspace';
      const scopeLabel = scope.type === 'single'
        ? 'Caso individual'
        : scope.type === 'selected'
          ? `Casos seleccionados (${records.length})`
          : 'Todos los casos del workspace';

      await exportCases(records, {
        format,
        fields,
        includeTasks,
        includeNotes,
        fileBaseName,
        meta: {
          workspaceName,
          exportedAt: new Date().toISOString(),
          exportedBy: user?.email ?? 'Usuario actual',
          scopeLabel,
          caseCount: records.length,
        },
      });
    } catch (exportError: any) {
      const nextError = exportError.message ?? 'No se pudo exportar los casos.';
      setError(nextError);
      throw exportError;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    clearError: () => setError(null),
    runExport,
  };
}
