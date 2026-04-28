export type CaseStatus =
  | 'resuelto'
  | 'resuelto_sin_problemas'
  | 'resuelto_con_ayuda'
  | 'en_progreso'
  | 'pendiente'
  | 'descartado'
  | null;

export type CasePriority = 'alta' | 'media' | 'baja' | null;

// CaseCategory is now a free-form string (the `key` stored in workspace_categories)
export type CaseCategory = string;

export interface WorkspaceCategory {
  id: string;
  workspaceId: string;
  key: string;
  label: string;
  icon: string;
  color?: string;
  position: number;
  createdAt: string;
}

/** Default categories seeded for every new workspace. */
export const DEFAULT_CATEGORIES: Omit<WorkspaceCategory, 'id' | 'workspaceId' | 'createdAt'>[] = [
  { key: 'software',          label: 'Software',        icon: 'SW', position: 0 },
  { key: 'hardware',          label: 'Hardware',        icon: 'HW', position: 1 },
  { key: 'red',               label: 'Red',             icon: 'RD', position: 2 },
  { key: 'conectividad',      label: 'Conectividad',    icon: 'CN', position: 3 },
  { key: 'impresora',         label: 'Impresora',       icon: 'IM', position: 4 },
  { key: 'reimpresion',       label: 'Reimpresión',     icon: 'RP', position: 5 },
  { key: 'sistema_operativo', label: 'Sis. Operativo',  icon: 'SO', position: 6 },
  { key: 'correo',            label: 'Correo',          icon: 'CR', position: 7 },
  { key: 'usuario',           label: 'Usuario',         icon: 'US', position: 8 },
  { key: 'otro',              label: 'Otro',            icon: 'OT', position: 9 },
];

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
  imageUrls?: string[];
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

export const STATUS_LABELS: Record<string, string> = {
  resuelto: 'Resuelto',
  resuelto_sin_problemas: 'Resuelto sin problemas',
  resuelto_con_ayuda: 'Resuelto con ayuda',
  en_progreso: 'En Progreso',
  pendiente: 'Pendiente',
  descartado: 'Descartado',
};

/** @deprecated — use WorkspaceCategory[] from useCategoriesStore instead */
export const CATEGORY_LABELS: Record<string, string> = {
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

export const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};
