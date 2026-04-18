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
  title: string;
  category: CaseCategory;
  status: CaseStatus;
  priority: CasePriority;
  incidentDate: string;
  createdAt: string;
  updatedAt: string;
  whatIDid: string;
  howItWasResolved: string;
  tags: string[];
  statusHistory: StatusChange[];
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
