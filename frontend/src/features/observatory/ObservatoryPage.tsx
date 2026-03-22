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
import { useObservatoryDashboard, useAlignmentTrend } from '@/hooks/useObservatory';
import { ProgramSummary } from './ProgramSummary';
import { ExecutionTrendChart } from './ExecutionTrendChart';
import { TeamTrajectories } from './TeamTrajectories';
import { ExecutionHeatmap } from './ExecutionHeatmap';
import { ObservatorySignals } from './ObservatorySignals';
import { WeekOnWeek } from './WeekOnWeek';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a ISO date string as "MMM d" (e.g. "Mar 16"). */
function formatCycleDate(startsAt: string): string {
  try {
    return new Date(startsAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return startsAt;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ObservatoryPage() {
  // Load ALL available reconciled cycles (large cap so we get the full history)
  const { data: allCycles } = useAlignmentTrend(999);

  // Sorted ascending list of available cycle start dates
  const availableCycles = useMemo(() => {
    if (!allCycles || allCycles.length === 0) return [];
    return [...allCycles].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [allCycles]);

  // "From" index into availableCycles (default: first cycle)
  const [fromIdx, setFromIdx] = useState<number>(0);

  // Compute weekCount from the selected "from" position.
  // weekCount = number of cycles from "from" to the last available cycle (inclusive).
  // The APIs accept a trailing-window count, so this keeps "to" as the most recent cycle.
  const weekCount = useMemo(() => {
    if (availableCycles.length === 0) return 26;
    return Math.max(1, availableCycles.length - fromIdx);
  }, [availableCycles, fromIdx]);

  const { data: dashboard, isLoading: dashboardLoading } = useObservatoryDashboard(weekCount);
  const health = dashboard?.health;
  const alignmentTrend = dashboard?.alignmentTrend;
  const completionTrend = dashboard?.completionTrend;

  const orgName = health?.orgName ?? '';

  // Average strategic alignment across all weeks in the selected period.
  // TODO: Replace with a real per-cycle rallyCoveragePct field once the
  // alignment trend endpoint exposes % of commitments linked to any rally cry.
  const avgStrategicAlignment = useMemo(() => {
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

  const kpiLoading = dashboardLoading;

  // KPI values — fallback to em-dash while loading
  const strategicAlignment = kpiLoading || avgStrategicAlignment === null
    ? '—'
    : avgStrategicAlignment.toFixed(1);

  const completion = kpiLoading || avgCompletion === null
    ? '—'
    : avgCompletion.toFixed(1);

  const carryForward = kpiLoading || avgCarryForward === null
    ? '—'
    : avgCarryForward.toFixed(1);

  const driftSignals = dashboardLoading
    ? '—'
    : String(health?.activeDriftSignals ?? 0);

  // Date range labels for the header display
  const fromLabel = availableCycles[fromIdx]
    ? formatCycleDate(availableCycles[fromIdx].startsAt)
    : null;
  const lastCycle = availableCycles[availableCycles.length - 1];
  const toLabel = lastCycle != null ? formatCycleDate(lastCycle.startsAt) : null;

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
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <label
            htmlFor="obs-from-cycle"
            className="text-sm text-on-surface-variant whitespace-nowrap"
          >
            From
          </label>
          <select
            id="obs-from-cycle"
            value={fromIdx}
            onChange={(e) => { setFromIdx(Number(e.target.value)); }}
            className="text-sm border border-outline-variant rounded-md px-2 py-1.5 bg-surface-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={availableCycles.length === 0}
          >
            {availableCycles.length === 0 ? (
              <option value={0}>Loading…</option>
            ) : (
              availableCycles.map((cycle, idx) => (
                <option key={cycle.cycleId} value={idx}>
                  {formatCycleDate(cycle.startsAt)}
                </option>
              ))
            )}
          </select>
          <span className="text-sm text-on-surface-variant">→</span>
          <span className="text-sm text-on-surface font-medium whitespace-nowrap">
            {toLabel ?? '…'}
          </span>
          {fromLabel && toLabel && (
            <span className="text-xs text-muted">({weekCount} week{weekCount !== 1 ? 's' : ''})</span>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Strategic % averaged over selected period. TODO: replace with real RC coverage once
            the alignment trend endpoint exposes a per-cycle rallyCoveragePct field. */}
        <KpiTile label="Strategic Alignment" value={strategicAlignment} unit="%" />
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
