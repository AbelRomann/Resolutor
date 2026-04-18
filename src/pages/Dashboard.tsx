import { useMemo } from 'react';
import { useCases } from '../store/useCasesStore';
import { CaseCard } from '../components/CaseCard';
import { formatDate } from '../utils/date';

interface DashboardProps {
  onNavigate: (page: string, id?: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { cases, loading } = useCases();

  const stats = useMemo(() => ({
    total: cases.length,
    resueltos: cases.filter(c => c.status.startsWith('resuelto')).length,
    enProgreso: cases.filter(c => c.status === 'en_progreso').length,
    pendientes: cases.filter(c => c.status === 'pendiente').length,
    conAyuda: cases.filter(c => c.status === 'resuelto_con_ayuda').length,
  }), [cases]);

  const recent = useMemo(
    () => [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [cases]
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
            {loading ? 'Cargando…' : `${stats.total} caso${stats.total !== 1 ? 's' : ''} registrado${stats.total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          + Nuevo Caso
        </button>
      </div>

      {/* Quick stats */}
      <div className="dash-grid animate-in animate-delay-1">
        {[
          { label: 'Total Casos', val: stats.total, sub: '', onClick: () => onNavigate('cases') },
          { label: 'Resueltos', val: stats.resueltos, sub: `${resolvedRate}% del total`, onClick: () => onNavigate('cases') },
          { label: 'En Progreso', val: stats.enProgreso, sub: stats.pendientes > 0 ? `+${stats.pendientes} pendiente${stats.pendientes !== 1 ? 's' : ''}` : '', onClick: () => onNavigate('cases') },
        ].map((s, i) => (
          <div key={s.label} className="dash-stat animate-in" style={{ animationDelay: `${0.1 + i * 0.05}s` }} onClick={s.onClick}>
            <div className="dash-stat-label">{s.label}</div>
            {loading ? <div className="skeleton" style={{ height: 40, width: 60, marginTop: 8 }} /> : <div className="dash-stat-val">{s.val}</div>}
            {s.sub && <div className="dash-stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Recent cases */}
      <div className="recent-section animate-in animate-delay-2">
        <div className="recent-header">
          <span className="recent-title">Casos recientes</span>
          {cases.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('cases')}>Ver todos →</button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-card" style={{ animationDelay: `${i*0.05}s` }} />)}
          </div>
        ) : recent.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div className="empty-icon">📭</div>
            <h3 style={{ fontSize: '0.92rem', color: 'var(--text-2)', marginBottom: 6 }}>Sin casos aún</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 16 }}>Registra tu primer incidente técnico.</p>
            <button className="btn btn-primary" onClick={() => onNavigate('new')}>+ Crear primer caso</button>
          </div>
        ) : (
          <div className="recent-list">
            {recent.map((c, i) => (
              <CaseCard key={c.id} c={c} index={i} onClick={() => onNavigate('detail', c.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Summary row */}
      {!loading && cases.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }} className="animate-in animate-delay-3">
          <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Último incidente</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{formatDate(recent[0]?.incidentDate)}</div>
          </div>
          <div className="card card-pad" style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Resueltos con ayuda</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{stats.conAyuda}</div>
          </div>
        </div>
      )}
    </div>
  );
}
