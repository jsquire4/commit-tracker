/**
 * HealthGradeBadge — "On Track" (teal), "Watch" (amber), "At Risk" (rose).
 */
import type { HealthGradeLabel } from '@/types/portfolio.types';

interface HealthGradeBadgeProps {
  grade: HealthGradeLabel;
  className?: string;
}

const gradeStyles: Record<HealthGradeLabel, string> = {
  'On Track': 'bg-accent/[0.08] text-accent',
  Watch: 'bg-warning/[0.08] text-warning',
  'At Risk': 'bg-error/[0.08] text-error',
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
      {grade}
    </span>
  );
}
