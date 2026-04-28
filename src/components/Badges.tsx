import type { CaseStatus, CasePriority } from '../types/case';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types/case';

export function StatusBadge({ status }: { status: CaseStatus }) {
  if (!status) return null;
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

/**
 * Render a category badge.
 * Pass `categoryLabel` (from the workspace categories store) to get the
 * human-readable name; falls back to the raw `category` key.
 */
export function CategoryBadge({
  category,
  categoryLabel,
}: {
  category: string;
  categoryLabel?: string;
}) {
  return <span className="badge badge-cat">{categoryLabel ?? category}</span>;
}

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  if (!priority) return null;
  return <span className={`badge badge-priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>;
}
