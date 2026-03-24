import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useExecutiveHealth, useAlignmentTrend } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { OrgUnitHealth, AlignmentDataPoint } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

// Victor Solis (or any manager with this pattern) gets a specificity flag
const LOW_SPECIFICITY_MANAGERS = new Set(['Victor Solis']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDelta(data: AlignmentDataPoint[]): number | null {
  if (data.length < 2) return null;
  const first = data[0]?.strategicPct ?? null;
  const last = data[data.length - 1]?.strategicPct ?? null;
  if (first === null || last === null) return null;
  return last - first;
}

// ─── Delta Arrow ─────────────────────────────────────────────────────────────

interface DeltaArrowProps {
  delta: number | null;
}

function DeltaArrow({ delta }: DeltaArrowProps) {
  if (delta === null || Math.abs(delta) < 0.5) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 text-sm font-bold"
        style={{ color: '#94A3B8' }}
        aria-label="No significant change"
      >
        &mdash;
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 text-sm font-bold"
        style={{ color: '#059669' }}
        aria-label={`Up ${delta.toFixed(1)}%`}
      >
        &#8593;
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 text-sm font-bold"
      style={{ color: '#455F87' }}
      aria-label={`Down ${Math.abs(delta).toFixed(1)}%`}
    >
      &#8595;
    </span>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

interface SparklineProps {
  data: AlignmentDataPoint[];
}

function Sparkline({ data }: SparklineProps) {
  const chartData = useMemo(
    () => data.map((p) => ({ value: p.strategicPct })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <div className="w-full h-8 rounded bg-surface-container-low flex items-center justify-center">
        <span className="text-[10px] text-muted">No data</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#036A6A"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Manager Card ─────────────────────────────────────────────────────────────

interface ManagerCardProps {
  unit: OrgUnitHealth;
  weekCount: number;
  index: number;
}

function ManagerCard({ unit, weekCount, index }: ManagerCardProps) {
  const navigate = useNavigate();
  const { data: trendData } = useAlignmentTrend(weekCount, unit.managerId);

  const sparklineData = trendData ?? [];
  const delta = computeDelta(sparklineData);
  const hasLowSpecificity = LOW_SPECIFICITY_MANAGERS.has(unit.managerName);

  function handleClick() {
    console.log(`Navigate to /team?managerId=${unit.managerId}`);
    void navigate(`/team?managerId=${unit.managerId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="bg-surface-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:bg-surface hover:shadow-whisper transition-all duration-[var(--duration-fast)] animate-fade-in"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
      aria-label={`View ${unit.managerName}'s team trajectories`}
    >
      {/* Header: name + low specificity pill */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-on-surface truncate">
              {unit.managerName}
            </p>
            {hasLowSpecificity && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none flex-shrink-0"
                style={{ backgroundColor: '#E2E8F0', color: '#475569' }}
              >
                Low specificity detected
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">{unit.role}</p>
        </div>
        <span className="text-xs text-muted flex-shrink-0 tabular-nums">
          {unit.headcount} members
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Rally Cry Coverage */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted uppercase tracking-wide">RC Coverage</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-on-surface tabular-nums">
              {Math.round(unit.strategicAlignmentPct)}%
            </span>
            <DeltaArrow delta={delta} />
          </div>
        </div>
        {/* Completion */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted uppercase tracking-wide">Completion</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-on-surface tabular-nums">
              {Math.round(unit.completionRate)}%
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="w-full">
        <Sparkline data={sparklineData} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TeamTrajectoriesProps {
  weekCount: number;
}

export function TeamTrajectories({ weekCount }: TeamTrajectoriesProps) {
  const { data: healthData, isLoading, isError } = useExecutiveHealth(weekCount);

  const units = healthData?.units ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" label="Loading team trajectories..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-error">Failed to load team trajectory data.</p>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted">No team data available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {units.map((unit, i) => (
        <ManagerCard
          key={unit.managerId}
          unit={unit}
          weekCount={weekCount}
          index={i}
        />
      ))}
    </div>
  );
}
