import { useEffect, useMemo, useState } from 'react';
import { useCases } from '../store/useCasesStore';
import { useCategories } from '../store/useCategoriesStore';
import { CaseCard } from '../components/CaseCard';
import { ExportModal } from '../components/ExportModal';
import { useExport } from '../hooks/useExport';
import type { CaseStatus } from '../types/case';
import { STATUS_LABELS } from '../types/case';
import type { ExportField, ExportFormat } from '../utils/exportCases';

interface CaseListProps {
  onNavigate: (page: string, id?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  resuelto: '#16a34a',
  resuelto_sin_problemas: '#15803d',
  resuelto_con_ayuda: '#2563eb',
  en_progreso: '#d97706',
  pendiente: '#ea580c',
  descartado: '#6b7280',
};

const STATUSES = Object.keys(STATUS_COLORS);

export function CaseList({ onNavigate }: CaseListProps) {
  const { cases, loading } = useCases();
  const { categories } = useCategories();
  const { runExport, loading: exportLoading, error: exportError, clearError } = useExport();

  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<CaseStatus>>(new Set());
  const [sortBy, setSortBy] = useState<'updated' | 'incident' | 'created'>('updated');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<{ mode: 'all' | 'selected' | 'single'; ids: string[] }>({
    mode: 'all',
    ids: [],
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; caseId: string } | null>(null);

  const toggleCat = (cat: string) => setSelectedCats((prev) => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  const toggleStatus = (status: CaseStatus) => setSelectedStatuses((prev) => {
    const next = new Set(prev);
    next.has(status) ? next.delete(status) : next.add(status);
    return next;
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
      list = list.filter((item) => (
        item.title.toLowerCase().includes(q)
        || item.whatIDid.toLowerCase().includes(q)
        || item.howItWasResolved.toLowerCase().includes(q)
        || item.tags.some((tag) => tag.toLowerCase().includes(q))
      ));
    }

    if (selectedCats.size > 0) {
      list = list.filter((item) => selectedCats.has(item.category));
    }

    if (selectedStatuses.size > 0) {
      list = list.filter((item) => selectedStatuses.has(item.status));
    }

    list.sort((a, b) => {
      if (sortBy === 'incident') return b.incidentDate.localeCompare(a.incidentDate);
      if (sortBy === 'created') return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return list;
  }, [cases, search, selectedCats, selectedStatuses, sortBy]);

  useEffect(() => {
    setSelectedCaseIds((prev) => new Set([...prev].filter((id) => filtered.some((item) => item.id === id))));
  }, [filtered]);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const selectedCount = selectedCaseIds.size;
  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selectedCaseIds.has(item.id));

  const toggleCaseSelection = (caseId: string, checked: boolean) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(caseId);
      else next.delete(caseId);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((item) => {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  };

  const openExportModal = (mode: 'all' | 'selected' | 'single', ids: string[]) => {
    clearError();
    setContextMenu(null);
    setExportScope({ mode, ids });
    setShowExportModal(true);
  };

  const handleExportSubmit = async (input: {
    format: ExportFormat;
    fields: ExportField[];
    includeTasks: boolean;
    includeNotes: boolean;
  }) => {
    await runExport({
      scope: { type: exportScope.mode, ids: exportScope.ids },
      ...input,
      fileBaseName: exportScope.mode === 'single'
        ? `caso-${exportScope.ids[0]}`
        : exportScope.mode === 'selected'
          ? 'casos-seleccionados'
          : 'casos-workspace',
    });
    setShowExportModal(false);
  };

  const exportCaseCount = exportScope.mode === 'all' ? cases.length : exportScope.ids.length;
  const exportScopeLabel = exportScope.mode === 'all'
    ? 'Todos los casos del workspace'
    : exportScope.mode === 'selected'
      ? 'Casos seleccionados'
      : 'Caso individual';

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Mis Casos</h1>
          <p className="page-subtitle">
            {loading
              ? 'Cargando...'
              : hasFilters
                ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                : `${cases.length} caso${cases.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={() => openExportModal(
              selectedCount > 0 ? 'selected' : 'all',
              selectedCount > 0 ? [...selectedCaseIds] : filtered.map((item) => item.id),
            )}
            disabled={!loading && filtered.length === 0}
          >
            Exportar
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('new')}>
            + Nuevo Caso
          </button>
        </div>
      </div>

      <div className="cases-layout">
        <div className="filter-panel animate-in">
          <div className="filter-title">Filtros</div>

          <div className="filter-section">
            <div className="filter-search-wrap">
              <span className="filter-search-icon">⌕</span>
              <input
                className="filter-search"
                placeholder="Buscar casos..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-label">Categoria</div>
            <div className="filter-checkbox-list">
              {categories.map((category) => {
                const count = cases.filter((item) => item.category === category.key).length;
                if (count === 0) return null;
                return (
                  <label key={category.key} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCats.has(category.key)}
                      onChange={() => toggleCat(category.key)}
                    />
                    <span style={{ flex: 1 }}>{category.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{count}</span>
                  </label>
                );
              })}
              {cases.length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  Sin casos aun.{' '}
                  <button
                    onClick={() => onNavigate('new')}
                    style={{
                      color: 'var(--accent)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Crear uno
                  </button>
                </span>
              )}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-section-label">Estado</div>
            <div className="filter-checkbox-list">
              {STATUSES.map((status) => (
                <label key={status} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(status as CaseStatus)}
                    onChange={() => toggleStatus(status as CaseStatus)}
                  />
                  <div className="filter-dot" style={{ background: STATUS_COLORS[status] ?? '#aaa' }} />
                  <span>{STATUS_LABELS[status]}</span>
                </label>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button
              className="btn btn-outline btn-sm"
              onClick={clearFilters}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="cases-list-area">
          <div className="cases-list-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="count">{filtered.length} caso{filtered.length !== 1 ? 's' : ''}</span>
              {filtered.length > 0 && (
                <label className="case-select-all">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                  />
                  <span>Seleccionar visibles</span>
                </label>
              )}
              {selectedCount > 0 && (
                <span className="count">{selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {selectedCount > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => openExportModal('selected', [...selectedCaseIds])}
                >
                  Exportar seleccionados
                </button>
              )}
              <select
                className="sort-select"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              >
                <option value="updated">Mas reciente</option>
                <option value="incident">Por incidente</option>
                <option value="created">Por creacion</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="skeleton-card" style={{ animationDelay: `${item * 0.05}s` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state animate-in">
              <div className="empty-icon">{cases.length === 0 ? '🗂' : '⌕'}</div>
              <h3>{cases.length === 0 ? 'No se encontraron casos' : 'Sin resultados'}</h3>
              <p>{cases.length === 0 ? 'Crea tu primer caso tecnico.' : 'Intenta con otros filtros.'}</p>
              {cases.length === 0 && (
                <button className="btn btn-primary" onClick={() => onNavigate('new')}>
                  Crear el primer caso
                </button>
              )}
            </div>
          ) : (
            <div className="cases-list">
              {filtered.map((item, index) => (
                <CaseCard
                  key={item.id}
                  c={item}
                  index={index}
                  selectable
                  selected={selectedCaseIds.has(item.id)}
                  onToggleSelect={(checked) => toggleCaseSelection(item.id, checked)}
                  onClick={() => onNavigate('detail', item.id)}
                  onContextMenu={(x, y) => setContextMenu({ x, y, caseId: item.id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => openExportModal('single', [contextMenu.caseId])}
          >
            Exportar caso
          </button>
          <button
            className="context-menu-item"
            onClick={() => onNavigate('detail', contextMenu.caseId)}
          >
            Abrir detalle
          </button>
        </div>
      )}

      <ExportModal
        isOpen={showExportModal}
        scopeLabel={exportScopeLabel}
        caseCount={exportCaseCount}
        loading={exportLoading}
        error={exportError}
        onClose={() => setShowExportModal(false)}
        onSubmit={handleExportSubmit}
      />
    </div>
  );
}
