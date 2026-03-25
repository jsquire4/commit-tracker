import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCycles } from '@/api/cycles.api';
import type { Cycle, DashboardFilters } from '@/types';

interface WeekRangeSelectorProps {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
}

/** Format a cycle for display in the dropdown: "W25 · Mar 16–22" */
function formatCycleOption(cycle: Cycle): string {
  const s = new Date(cycle.startsAt);
  const e = new Date(cycle.endsAt);
  const monthDay = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${cycle.label} · ${monthDay(s)}–${monthDay(e)}`;
}

function useSortedCycles() {
  return useQuery({
    queryKey: ['cycles', 'range-selector'],
    queryFn: async () => {
      const result = await listCycles();
      const sorted = [...result.items].sort(
        (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
      // Deduplicate by startsAt date (keep active or most recent)
      const seen = new Map<string, Cycle>();
      for (const cycle of sorted) {
        const key = cycle.startsAt.slice(0, 10);
        if (!seen.has(key)) {
          seen.set(key, cycle);
        } else {
          const existing = seen.get(key)!;
          if (cycle.isActive && !existing.isActive) {
            seen.set(key, cycle);
          }
        }
      }
      return [...seen.values()]; // newest first
    },
    staleTime: 60_000,
  });
}

export function WeekRangeSelector({ filters, onChange }: WeekRangeSelectorProps) {
  const { data: cycles = [] } = useSortedCycles();

  // Find the default range: last completed week → current week
  const { defaultFrom, defaultTo } = useMemo(() => {
    if (cycles.length === 0) return { defaultFrom: null, defaultTo: null };
    const current = cycles.find((c) => c.isActive) ?? cycles[0];
    // Find the most recent locked/reconciled cycle (completed work)
    const lastCompleted = cycles.find(
      (c) => c.state === 'LOCKED' || c.state === 'RECONCILED' || c.state === 'RECONCILING',
    );
    return {
      defaultFrom: lastCompleted ?? current,
      defaultTo: current,
    };
  }, [cycles]);

  // Set default filters on mount when no date filters are set
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
      onChange(initial);
    }
  }, [cycles.length, defaultFrom, defaultTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find which cycles are currently selected
  const selectedFrom = cycles.find((c) => c.startsAt === filters.cycleWeekStart);
  const selectedTo = cycles.find((c) => c.startsAt === filters.cycleWeekEnd);

  // Options: "From" shows all cycles, "To" shows only cycles >= From
  const fromOptions = cycles;
  const toOptions = useMemo(() => {
    if (!selectedFrom) return cycles;
    const fromTime = new Date(selectedFrom.startsAt).getTime();
    return cycles.filter((c) => new Date(c.startsAt).getTime() >= fromTime);
  }, [cycles, selectedFrom]);

  if (cycles.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <select
        aria-label="From week"
        className="rounded-sm border border-outline-variant bg-surface-lowest px-2.5 py-1.5 text-small text-on-surface focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
        value={filters.cycleWeekStart ?? ''}
        onChange={(e) => {
          const cycle = cycles.find((c) => c.startsAt === e.target.value);
          if (cycle) {
            // If "To" is before the new "From", move it forward
            const toTime = selectedTo
              ? new Date(selectedTo.startsAt).getTime()
              : 0;
            const fromTime = new Date(cycle.startsAt).getTime();
            if (toTime < fromTime) {
              onChange({
                cycleWeekStart: cycle.startsAt,
                cycleWeekEnd: cycle.startsAt,
              });
            } else {
              onChange({ cycleWeekStart: cycle.startsAt });
            }
          }
        }}
      >
        {fromOptions.map((c) => (
          <option key={c.id} value={c.startsAt}>
            {formatCycleOption(c)}
          </option>
        ))}
      </select>

      <span className="text-muted text-small">to</span>

      <select
        aria-label="To week"
        className="rounded-sm border border-outline-variant bg-surface-lowest px-2.5 py-1.5 text-small text-on-surface focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
        value={filters.cycleWeekEnd ?? filters.cycleWeekStart ?? ''}
        onChange={(e) => {
          const cycle = cycles.find((c) => c.startsAt === e.target.value);
          if (cycle) {
            onChange({ cycleWeekEnd: cycle.startsAt });
          }
        }}
      >
        {toOptions.map((c) => (
          <option key={c.id} value={c.startsAt}>
            {formatCycleOption(c)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Returns whether the selected date range includes any unreconciled (DRAFT) cycles.
 * Call with the cycles data and current filters.
 */
export function useHasDraftCycles(filters: DashboardFilters): {
  hasDraft: boolean;
  draftLabel: string | null;
} {
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

    const labels = drafts.map((c) => c.label).join(', ');
    return { hasDraft: true, draftLabel: labels };
  }, [cycles, filters.cycleWeekStart, filters.cycleWeekEnd]);
}
