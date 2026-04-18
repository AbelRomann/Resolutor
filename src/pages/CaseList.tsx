import { useState, useMemo } from 'react';
import { useCases } from '../store/useCasesStore';
import { CaseCard } from '../components/CaseCard';
import type { CaseStatus, CaseCategory } from '../types/case';
import { CATEGORY_LABELS, STATUS_LABELS } from '../types/case';

interface CaseListProps {
  onNavigate: (page: string, id?: string) => void;
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  resuelto: '#16a34a',
  resuelto_sin_problemas: '#15803d',
  resuelto_con_ayuda: '#2563eb',
  en_progreso: '#d97706',
  pendiente: '#ea580c',
  descartado: '#6b7280',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as CaseCategory[];
const STATUSES = Object.keys(STATUS_LABELS) as CaseStatus[];

export function CaseList({ onNavigate }: CaseListProps) {
  const { cases, loading } = useCases();

  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<CaseCategory>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<CaseStatus>>(new Set());
  const [sortBy, setSortBy] = useState<'updated' | 'incident' | 'created'>('updated');

  const toggleCat = (cat: CaseCategory) => setSelectedCats(prev => {
    const s = new Set(prev);
    s.has(cat) ? s.delete(cat) : s.add(cat);
    return s;
  });

  const toggleStatus = (st: CaseStatus) => setSelectedStatuses(prev => {
    const s = new Set(prev);
    s.has(st) ? s.delete(st) : s.add(st);
    return s;
  });

  const clearFilters = () => {
    setSearch('');
    setSelectedCats(new Set());
    setSelectedStatuses(new Set());
  };

  const hasFilters = search || selectedCats.size > 0 || selectedStatuses.size > 0;

  const filtered = useMemo(() => {
    let list = [...cases];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.whatIDid.toLowerCase().includes(q) ||
        c.howItWasResolved.toLowerCase().includes(q) ||
        c.tags.some(t => t.includes(q))
      );
    }
    if (selectedCats.size > 0) list = list.filter(c => selectedCats.has(c.category));
    if (selectedStatuses.size > 0) list = list.filter(c => selectedStatuses.has(c.status));
    list.sort((a, b) => {
      if (sortBy === 'incident') return b.incidentDate.localeCompare(a.incidentDate);
      if (sortBy === 'created') return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [cases, search, selectedCats, selectedStatuses, sortBy]);

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Mis Casos</h1>
          <p className="page-subtitle">
            {loading
              ? 'Cargando…'
              : hasFilters
                ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                : `${cases.length} caso${cases.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          + Nuevo Caso
        </button>
      </div>

      <div className="cases-layout">
        {/* ── Filter Panel ── */}
        <div className="filter-panel animate-in">
          <div className="filter-title">Filtros</div>

          {/* Search */}
          <div className="filter-section">
            <div className="filter-search-wrap">
              <span className="filter-search-icon">🔍</span>
              <input
                className="filter-search"
                placeholder="Buscar casos…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div className="filter-section">
            <div className="filter-section-label">Categoría</div>
            <div className="filter-checkbox-list">
              {CATEGORIES.map(cat => {
                const count = cases.filter(c => c.category === cat).length;
                if (count === 0) return null;
                return (
                  <label key={cat} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCats.has(cat)}
                      onChange={() => toggleCat(cat)}
                    />
                    <span style={{ flex: 1 }}>{CATEGORY_LABELS[cat]}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{count}</span>
                  </label>
                );
              })}
              {cases.length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  Sin casos aún.{' '}
                  <button
                    onClick={() => onNavigate('new')}
                    style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Crear uno
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="filter-section">
            <div className="filter-section-label">Estado</div>
            <div className="filter-checkbox-list">
              {STATUSES.map(st => (
                <label key={st} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(st)}
                    onChange={() => toggleStatus(st)}
                  />
                  <div className="filter-dot" style={{ background: STATUS_COLORS[st] }} />
                  <span>{STATUS_LABELS[st]}</span>
                </label>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ width: '100%', justifyContent: 'center' }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Cases Area ── */}
        <div className="cases-list-area">
          <div className="cases-list-header">
            <span className="count">{filtered.length} caso{filtered.length !== 1 ? 's' : ''}</span>
            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="updated">Más reciente</option>
              <option value="incident">Por incidente</option>
              <option value="created">Por creación</option>
            </select>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton-card" style={{ animationDelay: `${i*0.05}s` }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state animate-in">
              <div className="empty-icon">{cases.length === 0 ? '📭' : '🔍'}</div>
              <h3>{cases.length === 0 ? 'No cases found' : 'Sin resultados'}</h3>
              <p>{cases.length === 0 ? 'Crea tu primer caso técnico.' : 'Intenta con otros filtros.'}</p>
              {cases.length === 0 && (
                <button className="btn btn-primary" onClick={() => onNavigate('new')}>
                  Create your first case
                </button>
              )}
            </div>
          ) : (
            <div className="cases-list">
              {filtered.map((c, i) => (
                <CaseCard key={c.id} c={c} index={i} onClick={() => onNavigate('detail', c.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
