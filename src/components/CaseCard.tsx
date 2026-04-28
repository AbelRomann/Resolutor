import type { Case } from '../types/case';
import { StatusBadge, CategoryBadge, PriorityBadge } from './Badges';
import { formatDate } from '../utils/date';
import { useCategories } from '../store/useCategoriesStore';

interface CaseCardProps {
  c: Case;
  onClick: () => void;
  index?: number;
}

export function CaseCard({ c, onClick, index = 0 }: CaseCardProps) {
  const { categories } = useCategories();
  const preview = c.whatIDid || c.howItWasResolved || '';
  const categoryLabel = categories.find((cat) => cat.key === c.category)?.label;

  return (
    <div
      className="case-card animate-in"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="case-card-header">
        <div className="case-card-title">{c.title || 'Sin titulo'}</div>
        <StatusBadge status={c.status} />
      </div>

      {c.assignedToEmail && (
        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: 6, fontWeight: 500 }}>
          Asignado: {c.assignedToEmail}
        </div>
      )}

      {c.solvedFor && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>
          Para: {c.solvedFor}
        </div>
      )}

      {preview && <div className="case-card-preview">{preview}</div>}

      <div className="case-card-meta">
        <CategoryBadge category={c.category} categoryLabel={categoryLabel} />
        <PriorityBadge priority={c.priority} />
        {c.tags.slice(0, 2).map((tag) => <span key={tag} className="tag">{tag}</span>)}
        {c.tags.length > 2 && <span className="tag">+{c.tags.length - 2}</span>}
        <span className="case-date">{formatDate(c.incidentDate)}</span>
      </div>
    </div>
  );
}
