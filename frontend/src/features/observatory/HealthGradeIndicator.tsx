import type { HealthGrade } from '@/types';

interface HealthGradeIndicatorProps {
  grade: HealthGrade;
  percentage: number;
}

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
    label: 'Healthy',
    shadow: 'shadow-glow-green',
    ring: 'ring-4 ring-accent/20',
    pulse: false,
  },
  YELLOW: {
    bg: 'bg-warning',
    text: 'text-warning',
    label: 'At Risk',
    shadow: 'shadow-glow-amber',
    ring: 'ring-4 ring-warning/20',
    pulse: false,
  },
  RED: {
    bg: 'bg-error',
    text: 'text-error',
    label: 'Critical',
    shadow: 'shadow-glow-red',
    ring: 'ring-4 ring-error/20',
    pulse: true,
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
          config.pulse ? 'pulse-slow' : '',
        ].join(' ')}
        role="img"
        aria-label={`Health grade: ${config.label} at ${String(Math.round(percentage))}%`}
      >
        <span className="text-3xl font-bold text-white">
          {String(Math.round(percentage))}%
        </span>
      </div>
      <span className={`text-sm font-semibold ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}
