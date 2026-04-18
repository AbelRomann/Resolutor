import type { Case } from '../types/case';
import { StatusBadge, CategoryBadge, PriorityBadge } from './Badges';
import { formatDate } from '../utils/date';

interface CaseCardProps {
  c: Case;
  onClick: () => void;
  index?: number;
}

export function CaseCard({ c, onClick, index = 0 }: CaseCardProps) {
  const preview = c.whatIDid || c.howItWasResolved || '';

  return (
    <div
      className="case-card animate-in"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="case-card-header">
        <div className="case-card-title">{c.title || 'Sin título'}</div>
        <StatusBadge status={c.status} />
      </div>

      {preview && <div className="case-card-preview">{preview}</div>}

      <div className="case-card-meta">
        <CategoryBadge category={c.category} />
        <PriorityBadge priority={c.priority} />
        {c.tags.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
        {c.tags.length > 2 && <span className="tag">+{c.tags.length - 2}</span>}
        <span className="case-date">📅 {formatDate(c.incidentDate)}</span>
      </div>
    </div>
  );
}
