import { useQuery } from '@tanstack/react-query';
import { listCycles } from '@/api/cycles.api';
import type { Cycle } from '@/types';

interface CycleHistorySelectorProps {
  currentCycleId: string;
  /** Called with the cycle id and the full Cycle object when the user picks a cycle. */
  onSelect?: (cycleId: string, cycle: Cycle) => void;
}

function useCycleHistory() {
  return useQuery({
    queryKey: ['cycles', 'history'],
    queryFn: async () => {
      const result = await listCycles();
      // Sort by startsAt descending, then by createdAt descending (newest first within same week)
      const sorted = [...result.items].sort((a, b) => {
        const startDiff = new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        if (startDiff !== 0) return startDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      // Deduplicate by startsAt: when reconciliation creates a new draft for the same week,
      // keep only the active cycle (or the most recently created one as a tiebreaker).
      const seen = new Map<string, typeof sorted[number]>();
      for (const cycle of sorted) {
        const key = cycle.startsAt.slice(0, 10); // Compare by date only (YYYY-MM-DD), ignoring time
        if (!seen.has(key)) {
          seen.set(key, cycle);
        } else {
          const existing = seen.get(key)!;
          // Prefer the active cycle over an inactive one
          if (cycle.isActive && !existing.isActive) {
            seen.set(key, cycle);
          }
        }
      }
      return [...seen.values()].slice(0, 8);
    },
    staleTime: 60_000,
  });
}

export function CycleHistorySelector({ currentCycleId, onSelect }: CycleHistorySelectorProps) {
  const { data: cycles = [] } = useCycleHistory();

  if (cycles.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto max-w-full scrollbar-hide"
         style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {cycles.map((cycle: Cycle) => {
        const isCurrent = cycle.id === currentCycleId;
        return (
          <button
            key={cycle.id}
            type="button"
            onClick={() => onSelect?.(cycle.id, cycle)}
            className={[
              'px-2.5 py-1 text-small font-medium rounded-full border whitespace-nowrap',
              'transition-colors duration-[var(--duration-fast)]',
              isCurrent
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-muted border-outline-variant hover:bg-surface-container-low hover:text-on-surface-variant',
            ].join(' ')}
          >
            {cycle.label}
          </button>
        );
      })}
    </div>
  );
}
