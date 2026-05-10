import type { Case } from '../types/case';
import { StatusBadge, CategoryBadge, PriorityBadge } from './Badges';
import { formatDate } from '../utils/date';
import { useCategories } from '../store/useCategoriesStore';

interface CaseCardProps {
  c: Case;
  onClick: () => void;
  index?: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (checked: boolean) => void;
  onContextMenu?: (x: number, y: number) => void;
}

export function CaseCard({
  c,
  onClick,
  index = 0,
  selectable = false,
  selected = false,
  onToggleSelect,
  onContextMenu,
}: CaseCardProps) {
  const { categories } = useCategories();
  const preview = c.whatIDid || c.howItWasResolved || '';
  const category = categories.find((cat) => cat.key === c.category);
  const categoryLabel = category?.label;
  const categoryColor = category?.color;

  return (
    <div
      className="case-card animate-in"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onContextMenu={(event) => {
        if (!onContextMenu) return;
        event.preventDefault();
        onContextMenu(event.clientX, event.clientY);
      }}
    >
      <div className="case-card-header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              className="case-card-checkbox"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onToggleSelect?.(event.target.checked)}
              aria-label={`Seleccionar ${c.title || 'caso'}`}
            />
          )}
          <div className="case-card-title">{c.title || 'Sin titulo'}</div>
        </div>
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
        <CategoryBadge category={c.category} categoryLabel={categoryLabel} color={categoryColor} />
        <PriorityBadge priority={c.priority} />
        {c.tags.slice(0, 2).map((tag) => <span key={tag} className="tag">{tag}</span>)}
        {c.tags.length > 2 && <span className="tag">+{c.tags.length - 2}</span>}
        <span className="case-date">{formatDate(c.incidentDate)}</span>
      </div>
    </div>
  );
}
