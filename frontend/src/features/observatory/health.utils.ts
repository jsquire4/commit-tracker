import type { HealthGrade } from '@/types/observatory.types';

// ─── Shared Constants ────────────────────────────────────────────────────────

export const HEALTH_COLORS: Record<HealthGrade, string> = {
  GREEN: '#036A6A',
  YELLOW: '#C2860B',
  RED: '#9F403D',
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

// TODO: thresholds (50/30) are hardcoded here but are configurable on the backend via
// ObservatoryConfig.strategicAlignmentTarget and misalignmentWarningPct. These should
// be read from the /api/v1/observatory/config endpoint so they stay in sync.
export function gradeFromAlignment(pct: number): HealthGrade {
  if (pct >= 50) return 'GREEN';
  if (pct >= 30) return 'YELLOW';
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
