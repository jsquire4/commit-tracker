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
    <div className="flex items-center gap-2 flex-wrap">
      {/* From / To dropdowns */}
      <div className="flex items-center gap-1.5">
        <select
          aria-label="From week"
          className="rounded-sm border border-outline-variant bg-surface-lowest px-2 py-1 text-small text-on-surface focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
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

        <span className="text-muted text-small select-none">–</span>

        <select
          aria-label="To week"
          className="rounded-sm border border-outline-variant bg-surface-lowest px-2 py-1 text-small text-on-surface focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
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
              className="px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted rounded border border-outline-variant/50 hover:bg-surface-container-low hover:text-on-surface-variant transition-colors duration-[var(--duration-fast)] cursor-pointer"
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
