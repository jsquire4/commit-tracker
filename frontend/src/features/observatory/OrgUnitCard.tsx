import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/Badge';
import { useAlignmentTrend } from '@/hooks/useObservatory';
import type { OrgUnitHealth, HealthGrade } from '@/types';

interface OrgUnitCardProps {
  unit: OrgUnitHealth;
  onClick: () => void;
}

const gradeColors: Record<HealthGrade, string> = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-amber-500',
  RED: 'bg-red-500',
};

const gradeBorderAccent: Record<HealthGrade, string> = {
  GREEN: 'border-l-green-500',
  YELLOW: 'border-l-amber-500',
  RED: 'border-l-red-500',
};

function TrendArrow({ direction }: { direction: string }) {
  if (direction === 'IMPROVING') {
    return <span className="text-green-600 dark:text-green-400 font-bold text-base">↑</span>;
  }
  if (direction === 'DECLINING') {
    return <span className="text-red-600 dark:text-red-400 font-bold text-base">↓</span>;
  }
  return <span className="text-gray-400 dark:text-gray-500 font-bold text-base">→</span>;
}

function Sparkline({ managerId }: { managerId: string }) {
  const { data } = useAlignmentTrend(8, managerId);

  if (!data || data.length === 0) {
    return <div className="w-20 h-8 bg-gray-100 dark:bg-gray-800 rounded" />;
  }

  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="strategicPct"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OrgUnitCard({ unit, onClick }: OrgUnitCardProps) {
  const gradeDot = gradeColors[unit.grade as HealthGrade] ?? 'bg-gray-400';
  const borderAccent = gradeBorderAccent[unit.grade as HealthGrade] ?? 'border-l-gray-400';

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        'cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 border-l-4',
        borderAccent,
        'bg-white dark:bg-gray-900 p-4 space-y-3',
        'animate-fade-in',
        'transition-all duration-200',
        'hover:shadow-premium-lg hover:-translate-y-0.5',
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
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {unit.managerName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {String(Math.round(unit.strategicAlignmentPct))}% strategic
        </span>
      </div>

      {/* Sparkline + trend */}
      <div className="flex items-center justify-between gap-4">
        <Sparkline managerId={unit.managerId} />
        <div className="flex flex-col items-end gap-0.5">
          <TrendArrow direction={unit.trendDirection} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {unit.weeksTrending}w
          </span>
        </div>
      </div>
    </div>
  );
}
