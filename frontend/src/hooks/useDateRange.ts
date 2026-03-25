import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCycles } from '@/api/cycles.api';
import { useUIStore } from '@/stores/ui.store';
import { computeWeekCount, findCycleForDate, dateRangeToWeekCount } from '@/lib/dateRangeUtils';
import type { Cycle } from '@/types';

/**
 * Shared hook: fetches all cycles sorted chronologically and deduplicates.
 * Used by WeekRangeSelector and useDateRange.
 */
export function useSortedCycles() {
  return useQuery({
    queryKey: ['cycles', 'range-selector'],
    queryFn: async () => {
      const result = await listCycles();
      const sorted = [...result.items].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
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
      return [...seen.values()];
    },
    staleTime: 60_000,
  });
}

/**
 * Global date range convenience hook.
 * Reads cycleWeekStart/cycleWeekEnd from Zustand, resolves cycles,
 * and provides derived values (weekCount, active cycle, etc.).
 */
export function useDateRange() {
  const filters = useUIStore((s) => s.dashboardFilters);
  const setFilters = useUIStore((s) => s.setDashboardFilters);
  const { data: cycles = [] } = useSortedCycles();

  const weekCount = useMemo(() => {
    if (!filters.cycleWeekStart) return 12; // default
    if (filters.cycleWeekEnd) {
      return cycles.length > 0
        ? computeWeekCount(filters.cycleWeekStart, filters.cycleWeekEnd, cycles)
        : dateRangeToWeekCount(filters.cycleWeekStart, filters.cycleWeekEnd);
    }
    return 1;
  }, [filters.cycleWeekStart, filters.cycleWeekEnd, cycles]);

  const activeCycle = useMemo(() => {
    if (!filters.cycleWeekEnd && !filters.cycleWeekStart) {
      return cycles.find((c) => c.isActive) ?? cycles[cycles.length - 1] ?? null;
    }
    const endDate = filters.cycleWeekEnd ?? filters.cycleWeekStart;
    return endDate ? findCycleForDate(endDate, cycles) ?? null : null;
  }, [filters.cycleWeekStart, filters.cycleWeekEnd, cycles]);

  return {
    filters,
    setFilters,
    cycles,
    weekCount,
    activeCycle,
    cycleWeekStart: filters.cycleWeekStart,
    cycleWeekEnd: filters.cycleWeekEnd,
  };
}
