import { useEffect, useMemo } from 'react';
import { useUIStore } from '@/stores/ui.store';
import { useSortedCycles } from '@/hooks/useDateRange';
import { getPresetRange } from '@/lib/dateRangeUtils';
import type { Cycle, DashboardFilters } from '@/types';

/** Format a cycle as "Mar 16–22, 2026" */
function formatCycleOption(cycle: Cycle): string {
  const s = new Date(cycle.startsAt);
  const e = new Date(cycle.endsAt);
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = s.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}–${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay}–${eMonth} ${eDay}, ${year}`;
}

/**
 * Self-contained global date range selector.
 * Reads and writes directly to Zustand dashboardFilters.
 * Renders two cycle-based dropdowns plus quick range presets.
 */
export function WeekRangeSelector() {
  const filters = useUIStore((s) => s.dashboardFilters);
  const setFilters = useUIStore((s) => s.setDashboardFilters);
  const { data: cycles = [] } = useSortedCycles();

  // Default: last completed week → current week
  const { defaultFrom, defaultTo } = useMemo(() => {
    if (cycles.length === 0) return { defaultFrom: null, defaultTo: null };
    const current = cycles.find((c) => c.isActive) ?? cycles[cycles.length - 1];
    const reversed = [...cycles].reverse();
    const lastCompleted = reversed.find(
      (c) => c.state === 'LOCKED' || c.state === 'RECONCILED' || c.state === 'RECONCILING',
    );
    return {
      defaultFrom: lastCompleted ?? current,
      defaultTo: current,
    };
  }, [cycles]);

  useEffect(() => {
    if (
      cycles.length > 0 &&
      !filters.cycleWeekStart &&
      !filters.cycleWeekEnd &&
      defaultFrom
    ) {
      const initial: Partial<DashboardFilters> = {
        cycleWeekStart: defaultFrom.startsAt,
      };
      if (defaultTo) {
        initial.cycleWeekEnd = defaultTo.startsAt;
      }
      setFilters(initial);
    }
    // Intentionally omits filters/setFilters from deps — this is a one-time initialization
    // that should only fire when cycles first load and no filters exist yet. Including
    // filters would cause a re-render loop (effect sets filters → filters change → effect re-runs).
    // setFilters is a stable Zustand reference; filters are read only as a guard.
  }, [cycles.length, defaultFrom, defaultTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFrom = cycles.find((c) => c.startsAt === filters.cycleWeekStart);
  const selectedTo = cycles.find((c) => c.startsAt === filters.cycleWeekEnd);

  const toOptions = useMemo(() => {
    if (!selectedFrom) return cycles;
    const fromTime = new Date(selectedFrom.startsAt).getTime();
    return cycles.filter((c) => new Date(c.startsAt).getTime() >= fromTime);
  }, [cycles, selectedFrom]);

  function applyPreset(preset: 'last4' | 'quarter' | 'ytd') {
    const range = getPresetRange(preset, cycles);
    if (range) {
      setFilters({ cycleWeekStart: range.from, cycleWeekEnd: range.to });
    }
  }

  if (cycles.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* From / To dropdowns */}
      <div className="flex items-center gap-1.5">
        <select
          aria-label="From week"
          className="appearance-none bg-transparent px-2 py-1.5 text-body font-medium text-on-surface-variant border-b-2 border-transparent hover:text-accent hover:border-accent focus:text-accent focus:border-accent focus:outline-none transition-colors cursor-pointer"
          value={filters.cycleWeekStart ?? ''}
          onChange={(e) => {
            const cycle = cycles.find((c) => c.startsAt === e.target.value);
            if (cycle) {
              const toTime = selectedTo ? new Date(selectedTo.startsAt).getTime() : 0;
              const fromTime = new Date(cycle.startsAt).getTime();
              if (toTime < fromTime) {
                setFilters({ cycleWeekStart: cycle.startsAt, cycleWeekEnd: cycle.startsAt });
              } else {
                setFilters({ cycleWeekStart: cycle.startsAt });
              }
            }
          }}
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.startsAt}>{formatCycleOption(c)}</option>
          ))}
        </select>

        <span className="text-muted text-body select-none">–</span>

        <select
          aria-label="To week"
          className="appearance-none bg-transparent px-2 py-1.5 text-body font-medium text-on-surface-variant border-b-2 border-transparent hover:text-accent hover:border-accent focus:text-accent focus:border-accent focus:outline-none transition-colors cursor-pointer"
          value={filters.cycleWeekEnd ?? filters.cycleWeekStart ?? ''}
          onChange={(e) => {
            const cycle = cycles.find((c) => c.startsAt === e.target.value);
            if (cycle) {
              setFilters({ cycleWeekEnd: cycle.startsAt });
            }
          }}
        >
          {toOptions.map((c) => (
            <option key={c.id} value={c.startsAt}>{formatCycleOption(c)}</option>
          ))}
        </select>
      </div>

      {/* Quick presets */}
      <div className="flex items-center gap-1">
        {(['last4', 'quarter', 'ytd'] as const).map((preset) => {
          const label = preset === 'last4' ? '4w' : preset === 'quarter' ? 'Qtr' : 'YTD';
          return (
            <button
              key={preset}
              type="button"
              onClick={() => { applyPreset(preset); }}
              className="px-2 py-1 text-small font-medium text-on-surface-variant hover:text-accent border-b-2 border-transparent hover:border-accent transition-colors duration-[var(--duration-fast)] cursor-pointer"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Returns whether the selected date range includes any DRAFT cycles.
 */
export function useHasDraftCycles(): {
  hasDraft: boolean;
  draftLabel: string | null;
} {
  const filters = useUIStore((s) => s.dashboardFilters);
  const { data: cycles = [] } = useSortedCycles();

  return useMemo(() => {
    if (!filters.cycleWeekStart || cycles.length === 0) {
      return { hasDraft: false, draftLabel: null };
    }

    const fromTime = new Date(filters.cycleWeekStart).getTime();
    const toTime = filters.cycleWeekEnd
      ? new Date(filters.cycleWeekEnd).getTime()
      : fromTime;

    const inRange = cycles.filter((c) => {
      const t = new Date(c.startsAt).getTime();
      return t >= fromTime && t <= toTime;
    });

    const drafts = inRange.filter((c) => c.state === 'DRAFT');
    if (drafts.length === 0) return { hasDraft: false, draftLabel: null };

    const labels = drafts.map((c) => formatCycleOption(c)).join(', ');
    return { hasDraft: true, draftLabel: labels };
  }, [cycles, filters.cycleWeekStart, filters.cycleWeekEnd]);
}
