import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useExecutiveHealth, useAlignmentTrend } from '@/hooks/useObservatory';
import type { OrgUnitHealth, AlignmentDataPoint } from '@/types';

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
        className="inline-flex items-center justify-center w-5 h-5 text-sm font-bold text-muted"
        aria-label="No significant change"
      >
        &mdash;
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 text-sm font-bold text-accent"
        aria-label={`Up ${delta.toFixed(1)}%`}
      >
        &#8593;
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 text-sm font-bold text-on-surface-variant"
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
  isSelected?: boolean | undefined;
  onSelect?: ((managerId: string, managerName: string) => void) | undefined;
}

function ManagerCard({ unit, weekCount, index, isSelected, onSelect }: ManagerCardProps) {
  const { data: trendData } = useAlignmentTrend(weekCount, unit.managerId);

  const sparklineData = trendData ?? [];
  const delta = computeDelta(sparklineData);

  function handleClick() {
    if (onSelect) {
      onSelect(unit.managerId, unit.managerName);
    }
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
      className={[
        'border rounded-lg p-4 flex flex-col gap-3 transition-all duration-[var(--duration-fast)] animate-fade-in',
        onSelect ? 'cursor-pointer' : 'cursor-default',
        isSelected
          ? 'bg-accent/5 border-accent shadow-whisper ring-1 ring-accent/30'
          : 'bg-surface-lowest border-outline-variant hover:bg-surface hover:shadow-whisper',
      ].join(' ')}
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'backwards' }}
      aria-label={`Scope observatory to ${unit.managerName}'s team`}
      aria-pressed={isSelected}
    >
      {/* Header: name */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface truncate">
            {unit.managerName}
          </p>
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
              {Math.round(unit.rallyCoveragePct)}%
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
  onSelectTeam?: ((managerId: string, managerName: string) => void) | undefined;
  selectedManagerId?: string | undefined;
}

export function TeamTrajectories({ weekCount, onSelectTeam, selectedManagerId }: TeamTrajectoriesProps) {
  const { data: healthData, isLoading, isError } = useExecutiveHealth(weekCount);

  const units = healthData?.units ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-surface-lowest border border-outline-variant rounded-lg p-4 animate-pulse flex flex-col gap-3"
          >
            <div className="h-4 w-2/3 bg-surface-container rounded-sm" />
            <div className="h-16 bg-surface-container rounded-sm" />
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-surface-container rounded-sm" />
              <div className="h-3 w-16 bg-surface-container rounded-sm" />
            </div>
          </div>
        ))}
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
          isSelected={selectedManagerId === unit.managerId}
          onSelect={onSelectTeam}
        />
      ))}
    </div>
  );
}
