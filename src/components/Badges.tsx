import type { CaseStatus, CaseCategory, CasePriority } from '../types/case';
import { STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS } from '../types/case';

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function CategoryBadge({ category }: { category: CaseCategory }) {
  return <span className="badge badge-cat">{CATEGORY_LABELS[category]}</span>;
}

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  return <span className={`badge badge-priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>;
}
