import type { HealthGrade } from '@/types/observatory.types';
import { CHESS_ACCENT } from '@/constants/chess-colors';

// ─── Shared Constants ────────────────────────────────────────────────────────

export const HEALTH_COLORS: Record<HealthGrade, string> = {
  GREEN: CHESS_ACCENT.strategic,
  YELLOW: '#C2860B',
  RED: CHESS_ACCENT.defensive,
};

export const HEALTH_BG: Record<HealthGrade, string> = {
  GREEN: 'bg-accent/[0.08]',
  YELLOW: 'bg-warning/[0.08]',
  RED: 'bg-error/[0.08]',
};

export const HEALTH_BORDER: Record<HealthGrade, string> = {
  GREEN: 'border-l-accent',
  YELLOW: 'border-l-warning',
  RED: 'border-l-error',
};

export const HEALTH_TEXT: Record<HealthGrade, string> = {
  GREEN: 'text-accent',
  YELLOW: 'text-warning',
  RED: 'text-error',
};

// ─── Shared Helpers ──────────────────────────────────────────────────────────

export function trendArrow(direction: string): string {
  switch (direction.toUpperCase()) {
    case 'IMPROVING':
      return '\u2191';
    case 'DECLINING':
      return '\u2193';
    default:
      return '\u2192';
  }
}

export function trendArrowColor(direction: string): string {
  switch (direction.toUpperCase()) {
    case 'IMPROVING':
      return 'text-accent';
    case 'DECLINING':
      return 'text-error';
    default:
      return 'text-muted';
  }
}

/**
 * Grade a strategic-alignment percentage.
 *
 * @param pct              The alignment percentage to grade.
 * @param alignmentTarget  GREEN threshold (default 50) — maps to ObservatoryConfig.strategicAlignmentTarget.
 * @param warningPct       YELLOW threshold (default 30) — maps to ObservatoryConfig.misalignmentWarningPct.
 */
export function gradeFromAlignment(
  pct: number,
  alignmentTarget = 50,
  warningPct = 30,
): HealthGrade {
  if (pct >= alignmentTarget) return 'GREEN';
  if (pct >= warningPct) return 'YELLOW';
  return 'RED';
}

export function formatWeekLabel(computedAt: string): string {
  try {
    const d = new Date(computedAt);
    // Find Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } catch {
    return '';
  }
}

export function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}
