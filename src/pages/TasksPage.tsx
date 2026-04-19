import { useMemo, useState } from 'react';
import type { TaskExecutionType, TaskStatus } from '../types/case';
import { useTasks } from '../store/useTasksStore';

interface TasksPageProps {
  onNavigate: (page: string, id?: string) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  queued: 'En cola',
  in_progress: 'En progreso',
  blocked: 'Bloqueada',
  done: 'Completada',
  canceled: 'Cancelada',
};

const EXECUTION_LABELS: Record<TaskExecutionType, string> = {
  automation: 'Automatizable',
  human: 'Humana',
  hybrid: 'Hibrida',
};

const STATUS_FLOW: TaskStatus[] = ['pending', 'queued', 'in_progress', 'blocked', 'done', 'canceled'];

export function TasksPage({ onNavigate }: TasksPageProps) {
  const { tasks, loading, changeTaskStatus, removeTask } = useTasks();
  const [filter, setFilter] = useState<'all' | TaskExecutionType>('all');

  const visibleTasks = useMemo(() => (
    filter === 'all' ? tasks : tasks.filter((task) => task.executionType === filter)
  ), [filter, tasks]);

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">
            {loading ? 'Cargando...' : `${visibleTasks.length} tarea${visibleTasks.length !== 1 ? 's' : ''} en este workspace`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">Todas</option>
            <option value="automation">Automatizables</option>
            <option value="human">Humanas</option>
            <option value="hybrid">Hibridas</option>
          </select>
          <button className="btn btn-primary" onClick={() => onNavigate('cases')}>
            Ver casos
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((item) => <div key={item} className="skeleton-card" />)}
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="empty-state animate-in">
          <div className="empty-icon">TK</div>
          <h3>Sin tareas todavia</h3>
          <p>Crea tareas desde el detalle de un caso para separar trabajo humano y automatizado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleTasks.map((task) => (
            <div key={task.id} className="card card-pad animate-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{task.title}</div>
                  {task.description && (
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-3)', marginTop: 6 }}>{task.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <span className="tag">{EXECUTION_LABELS[task.executionType]}</span>
                    <span className="tag">{STATUS_LABELS[task.status]}</span>
                    {task.caseTitle && <span className="tag">Caso: {task.caseTitle}</span>}
                    {task.assigneeEmail && <span className="tag">Asignado a: {task.assigneeEmail}</span>}
                    {task.assigneeAgent && <span className="tag">Agente: {task.assigneeAgent}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="form-select"
                    value={task.status}
                    onChange={(e) => changeTaskStatus(task.id, e.target.value as TaskStatus)}
                  >
                    {STATUS_FLOW.map((status) => (
                      <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline btn-sm" onClick={() => removeTask(task.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
