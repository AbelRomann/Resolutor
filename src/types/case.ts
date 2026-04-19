export type CaseStatus =
  | 'resuelto'
  | 'resuelto_sin_problemas'
  | 'resuelto_con_ayuda'
  | 'en_progreso'
  | 'pendiente'
  | 'descartado';

export type CasePriority = 'alta' | 'media' | 'baja';

export type CaseCategory =
  | 'reimpresion'
  | 'conectividad'
  | 'software'
  | 'hardware'
  | 'red'
  | 'sistema_operativo'
  | 'impresora'
  | 'correo'
  | 'usuario'
  | 'otro';

export interface StatusChange {
  from: CaseStatus;
  to: CaseStatus;
  date: string;
  note?: string;
}

export interface Case {
  id: string;
  workspaceId: string;
  userId: string;
  creatorEmail?: string;
  assignedToId?: string;
  assignedToEmail?: string;
  title: string;
  category: CaseCategory;
  status: CaseStatus;
  priority: CasePriority;
  incidentDate: string;
  createdAt: string;
  updatedAt: string;
  whatIDid: string;
  howItWasResolved: string;
  solvedFor?: string;
  tags: string[];
  statusHistory: StatusChange[];
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  email?: string;
  fullName?: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'revoked';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  email: string;
  invitedBy: string;
  invitedByEmail?: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

export interface AppNotification {
  id: string;
  type: 'workspace_invitation' | 'task_assigned' | 'case_updated' | 'system';
  title: string;
  body?: string;
  readAt?: string;
  createdAt: string;
  invitationId?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
}

export type TaskExecutionType = 'automation' | 'human' | 'hybrid';
export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'blocked'
  | 'done'
  | 'canceled';

export interface Task {
  id: string;
  workspaceId: string;
  caseId?: string;
  caseTitle?: string;
  title: string;
  description?: string;
  executionType: TaskExecutionType;
  status: TaskStatus;
  assigneeUserId?: string;
  assigneeEmail?: string;
  assigneeAgent?: string;
  requiredCapability?: string;
  resolutionOutput?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  resuelto: 'Resuelto',
  resuelto_sin_problemas: 'Resuelto sin problemas',
  resuelto_con_ayuda: 'Resuelto con ayuda',
  en_progreso: 'En Progreso',
  pendiente: 'Pendiente',
  descartado: 'Descartado',
};

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  reimpresion: 'Reimpresión',
  conectividad: 'Conectividad',
  software: 'Software',
  hardware: 'Hardware',
  red: 'Red',
  sistema_operativo: 'Sis. Operativo',
  impresora: 'Impresora',
  correo: 'Correo',
  usuario: 'Usuario',
  otro: 'Otro',
};

export const PRIORITY_LABELS: Record<CasePriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};
