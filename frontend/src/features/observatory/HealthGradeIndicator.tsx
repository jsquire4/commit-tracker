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
    bg: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    label: 'Healthy',
    shadow: 'shadow-glow-green',
    ring: 'ring-4 ring-green-500/20',
    pulse: false,
  },
  YELLOW: {
    bg: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'At Risk',
    shadow: 'shadow-glow-amber',
    ring: 'ring-4 ring-amber-500/20',
    pulse: false,
  },
  RED: {
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    label: 'Critical',
    shadow: 'shadow-glow-red',
    ring: 'ring-4 ring-red-500/20',
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
