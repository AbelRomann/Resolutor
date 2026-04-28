import { useMemo } from 'react';
import { useCases } from '../store/useCasesStore';
import { useCategories } from '../store/useCategoriesStore';
import type { CaseStatus } from '../types/case';
import { STATUS_LABELS } from '../types/case';
import { formatDateTime } from '../utils/date';

interface StatisticsPageProps {
  onNavigate: (page: string, id?: string) => void;
}

export function StatisticsPage({ onNavigate }: StatisticsPageProps) {
  const { cases, loading } = useCases();
  const { categories } = useCategories();
  const categoryLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => { map[cat.key] = cat.label; });
    return map;
  }, [categories]);

  const stats = useMemo(() => {
    const total = cases.length;
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    cases.forEach((currentCase) => {
      byStatus[currentCase.status] = (byStatus[currentCase.status] || 0) + 1;
      byCategory[currentCase.category] = (byCategory[currentCase.category] || 0) + 1;
    });

    const resolved = (byStatus.resuelto || 0)
      + (byStatus.resuelto_sin_problemas || 0)
      + (byStatus.resuelto_con_ayuda || 0);

    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const catEntries = (Object.keys(byCategory))
      .map((key) => ({ key, label: categoryLabelMap[key] ?? key, count: byCategory[key] }))
      .sort((a, b) => b.count - a.count);

    const maxCat = catEntries[0]?.count || 1;

    return { total, byStatus, resolved, resolvedRate, catEntries, maxCat };
  }, [cases]);

  const recent = useMemo(
    () => [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [cases],
  );

  const TopCard = ({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) => (
    <div className="stat-card animate-in">
      <div className="stat-card-top">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-icon">{icon}</div>
      </div>
      {loading
        ? <div className="skeleton" style={{ height: 36, width: 60, marginTop: 8 }} />
        : <div className="stat-card-value">{value}</div>}
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Estadisticas</h1>
          <p className="page-subtitle">Analisis de tus incidentes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          + Nuevo Caso
        </button>
      </div>

      <div className="stats-grid">
        <TopCard label="Total Casos" value={stats.total} icon="TC" />
        <TopCard label="Resueltos" value={stats.resolved} sub={`${stats.resolvedRate}% del total`} icon="OK" />
        <TopCard label="En Progreso" value={stats.byStatus.en_progreso || 0} icon="IP" />
        <TopCard label="Resuelto con Ayuda" value={stats.byStatus.resuelto_con_ayuda || 0} icon="AY" />
      </div>

      <div className="stats-row-2">
        <div className="stats-card-wide animate-in animate-delay-1">
          <div className="stats-card-title">Casos por Categoria</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 18, borderRadius: 4 }} />)}
            </div>
          ) : stats.catEntries.length === 0 ? (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>Sin datos disponibles.</p>
          ) : (
            <div>
              {stats.catEntries.map((entry) => (
                <div key={entry.key} className="cat-row">
                  <span className="cat-name">{entry.label}</span>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${(entry.count / stats.maxCat) * 100}%` }} />
                  </div>
                  <span className="cat-count">{entry.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stats-card-wide animate-in animate-delay-2">
          <div className="stats-card-title">Actividad reciente</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 18, borderRadius: 4 }} />)}
            </div>
          ) : recent.length === 0 ? (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>Sin actividad reciente.</p>
          ) : (
            <div>
              {recent.map((currentCase) => (
                <div key={currentCase.id} className="activity-item" style={{ cursor: 'pointer' }} onClick={() => onNavigate('detail', currentCase.id)}>
                  <div className="activity-title">{currentCase.title}</div>
                  <div className="activity-meta">
                    <span>{STATUS_LABELS[currentCase.status as CaseStatus]}</span>
                    <span>.</span>
                    <span>{formatDateTime(currentCase.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stats-card-wide animate-in animate-delay-3">
        <div className="stats-card-title">Desglose de resolucion</div>
        <div className="resolution-grid">
          {[
            { key: 'resuelto_sin_problemas', label: 'Resuelto sin problemas', color: '#16a34a' },
            { key: 'resuelto_con_ayuda', label: 'Resuelto con ayuda', color: '#2563eb' },
            { key: 'en_progreso', label: 'En progreso', color: '#d97706' },
          ].map((item) => (
            <div key={item.key} className="resolution-item">
              <div
                className="resolution-num"
                style={{ borderColor: item.color, color: item.color }}
              >
                {loading ? '...' : (stats.byStatus[item.key] || 0)}
              </div>
              <div className="resolution-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
