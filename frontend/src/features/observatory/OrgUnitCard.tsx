import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/Badge';
import { useAlignmentTrend } from '@/hooks/useObservatory';
import type { OrgUnitHealth, HealthGrade } from '@/types';

interface OrgUnitCardProps {
  unit: OrgUnitHealth;
  onClick: () => void;
}

const gradeColors: Record<HealthGrade, string> = {
  GREEN: 'bg-accent',
  YELLOW: 'bg-warning',
  RED: 'bg-error',
};

const gradeBorderAccent: Record<HealthGrade, string> = {
  GREEN: 'border-l-accent',
  YELLOW: 'border-l-warning',
  RED: 'border-l-error',
};

function TrendArrow({ direction }: { direction: string }) {
  if (direction.toUpperCase() === 'IMPROVING') {
    return <span className="text-accent font-bold text-base">{'\u2191'}</span>;
  }
  if (direction.toUpperCase() === 'DECLINING') {
    return <span className="text-error font-bold text-base">{'\u2193'}</span>;
  }
  return <span className="text-muted font-bold text-base">{'\u2192'}</span>;
}

/** Number of recent weeks to show in the sparkline trend. */
const SPARKLINE_WEEK_COUNT = 8;

function Sparkline({ managerId }: { managerId: string }) {
  const { data } = useAlignmentTrend(SPARKLINE_WEEK_COUNT, managerId);

  if (!data || data.length === 0) {
    return <div className="w-20 h-8 bg-surface-container-low rounded" />;
  }

  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="strategicPct"
          stroke="#036A6A"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OrgUnitCard({ unit, onClick }: OrgUnitCardProps) {
  const gradeDot = gradeColors[unit.grade as HealthGrade] ?? 'bg-muted';
  const borderAccent = gradeBorderAccent[unit.grade as HealthGrade] ?? 'border-l-muted';

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        'cursor-pointer rounded-lg border border-outline-variant border-l-4',
        borderAccent,
        'bg-surface-lowest p-4 space-y-3',
        'animate-fade-in',
        'transition-colors duration-[var(--duration-fast)]',
        'hover:bg-surface hover:shadow-whisper',
      ].join(' ')}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header row: name + role badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">
            {unit.managerName}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {unit.headcount} members
          </p>
        </div>
        <Badge variant="default">{unit.role}</Badge>
      </div>

      {/* Health grade + alignment */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${gradeDot}`}
          aria-label={`Grade: ${unit.grade}`}
        />
        <span className="text-sm font-medium text-on-surface">
          {String(Math.round(unit.strategicAlignmentPct))}% RC coverage
        </span>
      </div>

      {/* Sparkline + trend */}
      <div className="flex items-center justify-between gap-4">
        <Sparkline managerId={unit.managerId} />
        <div className="flex flex-col items-end gap-0.5">
          <TrendArrow direction={unit.trendDirection} />
          <span className="text-xs text-muted">
            {unit.weeksTrending}w
          </span>
        </div>
      </div>
    </div>
  );
}
