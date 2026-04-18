import { useMemo } from 'react';
import { useCases } from '../store/useCasesStore';
import type { CaseCategory } from '../types/case';
import { CATEGORY_LABELS } from '../types/case';

interface CategoriesPageProps {
  onNavigate: (page: string, id?: string) => void;
}

const CATEGORY_ICONS: Record<CaseCategory, string> = {
  reimpresion: '🖨️',
  conectividad: '📶',
  software: '💻',
  hardware: '🔧',
  red: '🌐',
  sistema_operativo: '🖥️',
  impresora: '🖨️',
  correo: '📧',
  usuario: '👤',
  otro: '📁',
};

export function CategoriesPage({ onNavigate }: CategoriesPageProps) {
  const { cases, loading } = useCases();

  const catStats = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach(c => { map[c.category] = (map[c.category] || 0) + 1; });
    return (Object.keys(CATEGORY_LABELS) as CaseCategory[]).map(key => ({
      key,
      label: CATEGORY_LABELS[key],
      icon: CATEGORY_ICONS[key],
      count: map[key] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [cases]);

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">{catStats.length} categorías disponibles</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          + Nuevo Caso
        </button>
      </div>

      {loading ? (
        <div className="cat-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14, animationDelay: `${i*0.05}s` }} />
          ))}
        </div>
      ) : (
        <div className="cat-grid">
          {catStats.map((cat, i) => (
            <div
              key={cat.key}
              className="cat-card animate-in"
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => onNavigate('cases')}
            >
              <div className="cat-card-icon">{cat.icon}</div>
              <div className="cat-card-name">{cat.label}</div>
              <div className="cat-card-count">
                {cat.count === 0
                  ? 'Sin casos'
                  : `${cat.count} caso${cat.count !== 1 ? 's' : ''}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
