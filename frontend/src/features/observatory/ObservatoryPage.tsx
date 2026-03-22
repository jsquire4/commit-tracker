/**
 * ObservatoryPage — Executive-level program health view.
 *
 * Layout:
 *   Page header (title + org name + date range selector)
 *   KPI strip (rally cry coverage, completion, carry-forward, displacement)
 *   ProgramSummary (LLM stub)
 *   ExecutionTrendChart
 *   Placeholder sections for charts built by other agents
 */
import { useState, useMemo } from 'react';
import { useExecutiveHealth, useAlignmentTrend, useCompletionTrend } from '@/hooks/useObservatory';
import { ProgramSummary } from './ProgramSummary';
import { ExecutionTrendChart } from './ExecutionTrendChart';
import { TeamTrajectories } from './TeamTrajectories';
import { ExecutionHeatmap } from './ExecutionHeatmap';
import { ObservatorySignals } from './ObservatorySignals';
import { WeekOnWeek } from './WeekOnWeek';

const WEEK_OPTIONS = [
  { value: 4, label: '4 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' },
  { value: 26, label: '26 weeks' },
  { value: 52, label: '52 weeks' },
] as const;

type WeekOption = (typeof WEEK_OPTIONS)[number]['value'];

// ── KPI Strip ─────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
}

function KpiTile({ label, value, unit }: KpiTileProps) {
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
      </span>
      <span className="text-2xl font-semibold text-on-surface tabular-nums leading-none">
        {value}
        {unit && (
          <span className="text-base font-normal text-on-surface-variant ml-0.5">{unit}</span>
        )}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ObservatoryPage() {
  const [weekCount, setWeekCount] = useState<WeekOption>(26);

  const { data: health, isLoading: healthLoading } = useExecutiveHealth(weekCount);
  const { data: alignmentTrend, isLoading: alignmentLoading } = useAlignmentTrend(weekCount);
  const { data: completionTrend, isLoading: completionLoading } = useCompletionTrend(weekCount);

  const orgName = health?.orgName ?? '';

  // Average RC coverage across all weeks in the selected period
  const avgRcCoverage = useMemo(() => {
    if (!alignmentTrend || alignmentTrend.length === 0) return null;
    const sum = alignmentTrend.reduce((acc, p) => acc + p.strategicPct, 0);
    return sum / alignmentTrend.length;
  }, [alignmentTrend]);

  // Average completion rate across all weeks in the selected period
  const avgCompletion = useMemo(() => {
    if (!completionTrend || completionTrend.length === 0) return null;
    const sum = completionTrend.reduce((acc, p) => acc + p.completionRate, 0);
    return sum / completionTrend.length;
  }, [completionTrend]);

  // Average carry-forward rate across all weeks
  const avgCarryForward = useMemo(() => {
    if (!completionTrend || completionTrend.length === 0) return null;
    const sum = completionTrend.reduce((acc, p) => acc + p.carryForwardRate, 0);
    return sum / completionTrend.length;
  }, [completionTrend]);

  const kpiLoading = healthLoading || alignmentLoading || completionLoading;

  // KPI values — fallback to em-dash while loading
  const rcCoverage = kpiLoading || avgRcCoverage === null
    ? '—'
    : avgRcCoverage.toFixed(1);

  const completion = kpiLoading || avgCompletion === null
    ? '—'
    : avgCompletion.toFixed(1);

  const carryForward = kpiLoading || avgCarryForward === null
    ? '—'
    : avgCarryForward.toFixed(1);

  const driftSignals = healthLoading
    ? '—'
    : String(health?.activeDriftSignals ?? 0);

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl text-on-surface"
            style={{ fontFamily: 'Newsreader, Georgia, serif' }}
          >
            Observatory
          </h1>
          {orgName && (
            <p className="text-sm text-on-surface-variant mt-0.5">{orgName}</p>
          )}
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label
            htmlFor="obs-week-count"
            className="text-sm text-on-surface-variant whitespace-nowrap"
          >
            Showing
          </label>
          <select
            id="obs-week-count"
            value={weekCount}
            onChange={(e) => setWeekCount(Number(e.target.value) as WeekOption)}
            className="text-sm border border-outline-variant rounded-md px-2 py-1.5 bg-surface-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {WEEK_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Rally Cry Coverage" value={rcCoverage} unit="%" />
        <KpiTile label="Completion Rate" value={completion} unit="%" />
        <KpiTile label="Carry-Forward Rate" value={carryForward} unit="%" />
        <KpiTile label="Active Drift Signals" value={driftSignals} />
      </div>

      {/* ── Program summary (LLM stub) ── */}
      <ProgramSummary weekCount={weekCount} />

      {/* ── Execution trend chart ── */}
      <ExecutionTrendChart weekCount={weekCount} />

      {/* ── Team trajectories ── */}
      <TeamTrajectories weekCount={weekCount} />

      {/* ── Execution heatmap ── */}
      <ExecutionHeatmap weekCount={weekCount} />

      {/* ── Observatory signals ── */}
      <ObservatorySignals weekCount={weekCount} />

      {/* ── Week-on-week metrics ── */}
      <WeekOnWeek weekCount={weekCount} />
    </div>
  );
}
