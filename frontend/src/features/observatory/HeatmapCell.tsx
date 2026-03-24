import type { WeekCell } from '@/types';
import { CHESS_MUTED, CHESS_LABELS } from '@/constants/chess-colors';

// ─── CHESS cell colors (muted palette) ────────────────────────────────────────

export const CHESS_CELL_COLORS: Record<string, string> = {
  STRATEGIC: CHESS_MUTED.strategic,
  OPERATIONAL: CHESS_MUTED.operational,
  DEFENSIVE: CHESS_MUTED.defensive,
  CAPABILITY_BUILDING: CHESS_MUTED.capability,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ChessPct = { cat: string; pct: number };

function rankCategories(cell: WeekCell): ChessPct[] {
  return [
    { cat: 'STRATEGIC', pct: cell.strategicPct },
    { cat: 'OPERATIONAL', pct: cell.operationalPct },
    { cat: 'DEFENSIVE', pct: cell.defensivePct },
    { cat: 'CAPABILITY_BUILDING', pct: cell.capabilityBuildingPct },
  ].sort((a, b) => b.pct - a.pct);
}

/**
 * Determines whether two categories are close enough to be considered "mixed."
 * Returns true if the top-2 categories are both >= 30% and within 15% of each other.
 */
export function isMixed(cell: WeekCell): boolean {
  if (cell.totalCommitments === 0) return false;
  const pcts = rankCategories(cell);
  const first = pcts[0]?.pct ?? 0;
  const second = pcts[1]?.pct ?? 0;
  return second >= 30 && first - second <= 15;
}

export function getMixedColors(cell: WeekCell): [string, string] {
  const pcts = rankCategories(cell);
  const c1 = CHESS_CELL_COLORS[pcts[0]?.cat ?? ''] ?? '#8E9AA0';
  const c2 = CHESS_CELL_COLORS[pcts[1]?.cat ?? ''] ?? '#8E9AA0';
  return [c1, c2];
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface HeatmapCellProps {
  cell: WeekCell | undefined;
  onClick?: () => void;
}

export function HeatmapCell({ cell, onClick }: HeatmapCellProps) {
  // No data
  if (!cell || cell.totalCommitments === 0) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className="flex-shrink-0"
        style={{
          width: 28,
          height: 22,
          borderRadius: 2,
          border: '1.5px dashed #CBD5E1',
          cursor: onClick ? 'pointer' : 'default',
        }}
        title={cell?.cycleLabel ?? 'No data'}
        aria-label={`${cell?.cycleLabel ?? 'No data'}: no data`}
      />
    );
  }

  // Mixed
  if (isMixed(cell)) {
    const [c1, c2] = getMixedColors(cell);
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
        style={{
          width: 28,
          height: 22,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
          cursor: onClick ? 'pointer' : 'default',
        }}
        title={`${cell.cycleLabel}: Mixed`}
        aria-label={`${cell.cycleLabel}: mixed categories`}
      />
    );
  }

  // Dominant category
  const cat = cell.dominantCategory?.toUpperCase().replace(/ /g, '_') ?? '';
  const color = CHESS_CELL_COLORS[cat] ?? '#8E9AA0';
  const label = CHESS_LABELS[cat] ?? cell.dominantCategory ?? '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className="flex-shrink-0 hover:opacity-80 transition-opacity"
      style={{
        width: 28,
        height: 22,
        borderRadius: 2,
        backgroundColor: color,
        cursor: onClick ? 'pointer' : 'default',
      }}
      title={`${cell.cycleLabel}: ${label}`}
      aria-label={`${cell.cycleLabel}: ${label}`}
    />
  );
}
