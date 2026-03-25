/**
 * HealthGradeBadge — "On Track" (teal), "Watch" (amber), "At Risk" (navy/muted).
 * Uses neutral directional palette — no red judgment colors.
 */
import type { HealthGradeLabel } from '@/types/portfolio.types';

interface HealthGradeBadgeProps {
  grade: HealthGradeLabel;
  className?: string;
}

const gradeStyles: Record<HealthGradeLabel, string> = {
  'On Track': 'bg-accent/[0.08] text-accent',
  Watch: 'bg-warning/[0.08] text-warning',
  'At Risk': 'bg-navy/[0.08] text-navy',
};

const gradeLabels: Record<HealthGradeLabel, string> = {
  'On Track': 'On Track',
  Watch: 'Watch',
  'At Risk': 'Low Coverage',
};

export function HealthGradeBadge({ grade, className = '' }: HealthGradeBadgeProps) {
  return (
    <span
      className={[
        'inline-block text-[0.75rem] font-medium px-2 py-0.5 rounded-sm',
        gradeStyles[grade] ?? '',
        className,
      ].join(' ')}
    >
      {gradeLabels[grade] ?? grade}
    </span>
  );
}
