import type { CaseStatus, CasePriority } from '../types/case';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types/case';

export function StatusBadge({ status }: { status: CaseStatus }) {
  if (!status) return null;
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return undefined;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Render a category badge.
 * Pass `categoryLabel` (from the workspace categories store) to get the
 * human-readable name; falls back to the raw `category` key.
 */
export function CategoryBadge({
  category,
  categoryLabel,
  color,
}: {
  category: string;
  categoryLabel?: string;
  color?: string;
}) {
  const badgeStyle = color
    ? {
        color,
        background: hexToRgba(color, 0.12),
        borderColor: hexToRgba(color, 0.28),
      }
    : undefined;

  return <span className="badge badge-cat" style={badgeStyle}>{categoryLabel ?? category}</span>;
}

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  if (!priority) return null;
  return <span className={`badge badge-priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>;
}
