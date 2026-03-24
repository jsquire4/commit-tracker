import type { HealthGrade } from '@/types';

interface HealthGradeIndicatorProps {
  grade: HealthGrade;
  percentage: number;
}

// Neutral directional palette — teal/navy/gray, no red = bad judgment.
const gradeConfig: Record<HealthGrade, {
  bg: string;
  text: string;
  label: string;
  shadow: string;
  ring: string;
  pulse: boolean;
}> = {
  GREEN: {
    bg: 'bg-accent',
    text: 'text-accent',
    label: 'High Coverage',
    shadow: 'shadow-glow-green',
    ring: 'ring-4 ring-accent/20',
    pulse: false,
  },
  YELLOW: {
    bg: 'bg-surface-container',
    text: 'text-on-surface-variant',
    label: 'Partial Coverage',
    shadow: '',
    ring: 'ring-4 ring-outline-variant/30',
    pulse: false,
  },
  RED: {
    bg: 'bg-surface-container-low',
    text: 'text-muted',
    label: 'Low Coverage',
    shadow: '',
    ring: 'ring-4 ring-outline-variant/20',
    pulse: false,
  },
};

export function HealthGradeIndicator({ grade, percentage }: HealthGradeIndicatorProps) {
  const config = gradeConfig[grade];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={[
          'w-20 h-20 rounded-full flex items-center justify-center',
          'transition-all duration-500',
          config.bg,
          config.shadow,
          config.ring,
          config.pulse ? 'animate-pulse-subtle' : '',
        ].join(' ')}
        role="img"
        aria-label={`Health grade: ${config.label} at ${String(Math.round(percentage))}%`}
      >
        <span className={`text-3xl font-bold ${grade === 'GREEN' ? 'text-white' : 'text-on-surface'}`}>
          {String(Math.round(percentage))}%
        </span>
      </div>
      <span className={`text-sm font-semibold ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}
