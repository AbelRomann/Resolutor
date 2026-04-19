import { useMemo } from 'react';
import { useCases } from '../store/useCasesStore';
import type { CaseCategory } from '../types/case';
import { CATEGORY_LABELS } from '../types/case';

interface CategoriesPageProps {
  onNavigate: (page: string, id?: string) => void;
}

const CATEGORY_ICONS: Record<CaseCategory, string> = {
  reimpresion: 'RP',
  conectividad: 'CN',
  software: 'SW',
  hardware: 'HW',
  red: 'RD',
  sistema_operativo: 'SO',
  impresora: 'IM',
  correo: 'CR',
  usuario: 'US',
  otro: 'OT',
};

export function CategoriesPage({ onNavigate }: CategoriesPageProps) {
  const { cases, loading } = useCases();

  const catStats = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach((currentCase) => {
      counts[currentCase.category] = (counts[currentCase.category] || 0) + 1;
    });

    return (Object.keys(CATEGORY_LABELS) as CaseCategory[]).map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      icon: CATEGORY_ICONS[key],
      count: counts[key] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [cases]);

  return (
    <div className="page-wrap">
      <div className="page-header animate-in">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">{catStats.length} categorias disponibles</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new')}>
          + Nuevo Caso
        </button>
      </div>

      {loading ? (
        <div className="cat-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="skeleton" style={{ height: 100, borderRadius: 14, animationDelay: `${item * 0.05}s` }} />
          ))}
        </div>
      ) : (
        <div className="cat-grid">
          {catStats.map((category, index) => (
            <div
              key={category.key}
              className="cat-card animate-in"
              style={{ animationDelay: `${index * 0.04}s` }}
              onClick={() => onNavigate('cases')}
            >
              <div className="cat-card-icon">{category.icon}</div>
              <div className="cat-card-name">{category.label}</div>
              <div className="cat-card-count">
                {category.count === 0 ? 'Sin casos' : `${category.count} caso${category.count !== 1 ? 's' : ''}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
