import { useMemo } from 'react';
import { CaseCard } from '../components/CaseCard';
import { useAuth } from '../store/useAuthStore';
import { useCases } from '../store/useCasesStore';
import { useTasks } from '../store/useTasksStore';
import { formatDate } from '../utils/date';

interface DashboardProps {
  onNavigate: (page: string, id?: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const { cases, loading } = useCases();
  const { tasks, loading: tasksLoading } = useTasks();

  const stats = useMemo(() => ({
    total: cases.length,
    resueltos: cases.filter((c) => c.status.startsWith('resuelto')).length,
    enProgreso: cases.filter((c) => c.status === 'en_progreso').length,
    pendientes: cases.filter((c) => c.status === 'pendiente').length,
    conAyuda: cases.filter((c) => c.status === 'resuelto_con_ayuda').length,
    misAsignados: cases.filter((c) => c.assignedToId === user?.id).length,
  }), [cases, user?.id]);

  const taskStats = useMemo(() => ({
    total: tasks.length,
    automatizables: tasks.filter((task) => task.executionType === 'automation').length,
    humanas: tasks.filter((task) => task.executionType === 'human').length,
    mias: tasks.filter((task) => task.assigneeUserId === user?.id).length,
  }), [tasks, user?.id]);

  const recentCases = useMemo(
    () => [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [cases],
  );

  const resolvedRate = stats.total > 0
    ? Math.round((stats.resueltos / stats.total) * 100)
    : 0;

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Inicio</h1>
          <p className="page-subtitle">
            {loading ? 'Cargando...' : `${stats.total} caso${stats.total !== 1 ? 's' : ''} registrado${stats.total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          + Nuevo Caso
        </button>
      </div>

      <div className="dash-grid animate-in animate-delay-1">
        {[
          { label: 'Total Casos', val: stats.total, sub: '', onClick: () => onNavigate('cases') },
          { label: 'Resueltos', val: stats.resueltos, sub: `${resolvedRate}% del total`, onClick: () => onNavigate('cases') },
          { label: 'En Progreso', val: stats.enProgreso, sub: stats.pendientes > 0 ? `+${stats.pendientes} pendiente${stats.pendientes !== 1 ? 's' : ''}` : '', onClick: () => onNavigate('cases') },
          { label: 'Mi Trabajo', val: stats.misAsignados, sub: 'Casos asignados a mi', onClick: () => onNavigate('cases') },
          { label: 'Tareas', val: taskStats.total, sub: tasksLoading ? '' : `${taskStats.automatizables} automatizables`, onClick: () => onNavigate('tasks') },
        ].map((card, index) => (
          <div
            key={card.label}
            className="dash-stat animate-in"
            style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            onClick={card.onClick}
          >
            <div className="dash-stat-label">{card.label}</div>
            {(loading || (card.label === 'Tareas' && tasksLoading))
              ? <div className="skeleton" style={{ height: 40, width: 60, marginTop: 8 }} />
              : <div className="dash-stat-val">{card.val}</div>}
            {card.sub && <div className="dash-stat-sub">{card.sub}</div>}
          </div>
        ))}
      </div>

      <div className="recent-section animate-in animate-delay-2">
        <div className="recent-header">
          <span className="recent-title">Casos recientes</span>
          {cases.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('cases')}>Ver todos</button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((item) => <div key={item} className="skeleton-card" style={{ animationDelay: `${item * 0.05}s` }} />)}
          </div>
        ) : recentCases.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div className="empty-icon">CS</div>
            <h3 style={{ fontSize: '0.92rem', color: 'var(--text-2)', marginBottom: 6 }}>Sin casos aun</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 16 }}>Registra tu primer incidente tecnico.</p>
            <button className="btn btn-primary" onClick={() => onNavigate('new')}>+ Crear primer caso</button>
          </div>
        ) : (
          <div className="recent-list">
            {recentCases.map((currentCase, index) => (
              <CaseCard key={currentCase.id} c={currentCase} index={index} onClick={() => onNavigate('detail', currentCase.id)} />
            ))}
          </div>
        )}
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }} className="animate-in animate-delay-3">
          {recentCases[0] && (
            <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Ultimo incidente</div>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(recentCases[0].incidentDate)}</div>
            </div>
          )}
          <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Resueltos con ayuda</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{stats.conAyuda}</div>
          </div>
          <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Tareas humanas</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{taskStats.humanas}</div>
          </div>
          <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Tareas mias</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{taskStats.mias}</div>
          </div>
        </div>
      )}
    </div>
  );
}
