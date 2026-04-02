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
import { useAuth } from '@/hooks/useAuth';
import { VP_AND_ABOVE } from '@/constants/roles';
import { useObservatoryDashboard } from '@/hooks/useObservatory';
import { useDateRange } from '@/hooks/useDateRange';
import { useTransitionKey } from '@/hooks/useTransitionKey';
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

// ── Scoped Team Banner ────────────────────────────────────────────────────────

interface ScopedBannerProps {
  managerName: string;
  onClear: () => void;
}

function ScopedBanner({ managerName, onClear }: ScopedBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-accent/8 border border-accent/25 rounded-lg">
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="w-4 h-4 text-accent flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        <span className="text-sm text-on-surface">
          Viewing: <span className="font-semibold">{managerName}&apos;s Team</span>
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-dark font-medium whitespace-nowrap transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Back to org view
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ObservatoryPage() {
  const { role } = useAuth();

  // All hooks must be called before any conditional return (Rules of Hooks)
  const { weekCount } = useDateRange();
  const { transitionClass } = useTransitionKey();
  const [selectedManager, setSelectedManager] = useState<{ id: string; name: string } | null>(null);
  const { data: dashboard, isLoading: dashboardLoading } = useObservatoryDashboard(weekCount);

  const health = dashboard?.health;
  const alignmentTrend = dashboard?.alignmentTrend;
  const completionTrend = dashboard?.completionTrend;
  const orgName = health?.orgName ?? '';

  // Average rally cry coverage across all weeks in the selected period.
  const avgStrategicAlignment = useMemo(() => {
    if (!alignmentTrend || alignmentTrend.length === 0) return null;
    const sum = alignmentTrend.reduce((acc, p) => acc + p.rallyCoveragePct, 0);
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

  // Role guard — VP and above only (after all hooks)
  if (!role || !VP_AND_ABOVE.has(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-title font-medium text-on-surface">Access Restricted</h1>
        <p className="text-body text-on-surface-variant max-w-sm">
          The Observatory is only accessible to VPs and Executives.
        </p>
      </div>
    );
  }

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

  return (
    <div className={`space-y-6 ${transitionClass}`}>
      {/* ── Page header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl text-on-surface font-serif"
          >
            Observatory
          </h1>
          {orgName && (
            <p className="text-sm text-on-surface-variant mt-0.5">{orgName}</p>
          )}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Rally Cry Coverage" value={strategicAlignment} unit="%" />
        <KpiTile label="Completion Rate" value={completion} unit="%" />
        <KpiTile label="Carry-Forward Rate" value={carryForward} unit="%" />
        <KpiTile label="Active Drift Signals" value={driftSignals} />
      </div>

      {/* ── Scoped team banner (shown when a manager card is selected) ── */}
      {selectedManager && (
        <ScopedBanner
          managerName={selectedManager.name}
          onClear={() => { setSelectedManager(null); }}
        />
      )}

      {/* ── Program summary (LLM stub) — org-wide only ── */}
      {!selectedManager && <ProgramSummary weekCount={weekCount} />}

      {/* ── Observatory signals — high-value pattern detection ── */}
      <ObservatorySignals weekCount={weekCount} />

      {/* ── Execution trend chart — scoped to selected manager when set ── */}
      <ExecutionTrendChart
        weekCount={weekCount}
        managerId={selectedManager?.id}
      />

      {/* ── Team trajectories ── */}
      <TeamTrajectories
        weekCount={weekCount}
        selectedManagerId={selectedManager?.id}
        onSelectTeam={(id, name) => {
          setSelectedManager((prev) => prev?.id === id ? null : { id, name });
        }}
      />

      {/* ── Execution heatmap ── */}
      <ExecutionHeatmap weekCount={weekCount} />

      {/* ── Week-on-week metrics ── */}
      <WeekOnWeek weekCount={weekCount} />
    </div>
  );
}
