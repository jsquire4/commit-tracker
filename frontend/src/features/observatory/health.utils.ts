import type { HealthGrade } from '@/types/observatory.types';
import { CHESS_ACCENT } from '@/constants/chess-colors';

// ─── Shared Constants ────────────────────────────────────────────────────────

// Neutral directional palette — single teal/navy hue, no red = bad judgment.
// HIGH alignment: full accent (teal); MID: muted accent; LOW: neutral gray.
export const HEALTH_COLORS: Record<HealthGrade, string> = {
  GREEN: CHESS_ACCENT.strategic,   // teal — high alignment
  YELLOW: '#5B7FA6',               // muted navy-blue — mid alignment
  RED: '#8E9AA0',                  // neutral gray-blue — low alignment
};

export const HEALTH_BG: Record<HealthGrade, string> = {
  GREEN: 'bg-accent/[0.08]',
  YELLOW: 'bg-surface-container',
  RED: 'bg-surface-container-low',
};

export const HEALTH_BORDER: Record<HealthGrade, string> = {
  GREEN: 'border-l-accent',
  YELLOW: 'border-l-outline-variant',
  RED: 'border-l-outline-variant',
};

export const HEALTH_TEXT: Record<HealthGrade, string> = {
  GREEN: 'text-accent',
  YELLOW: 'text-on-surface-variant',
  RED: 'text-muted',
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
      return 'text-on-surface-variant';
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
