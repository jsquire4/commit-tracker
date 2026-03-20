import { useQuery } from '@tanstack/react-query';
import { listCycles } from '@/api/cycles.api';
import type { Cycle } from '@/types';

interface CycleHistorySelectorProps {
  currentCycleId: string;
  onSelect?: (cycleId: string) => void;
}

function useCycleHistory() {
  return useQuery({
    queryKey: ['cycles', 'history'],
    queryFn: async () => {
      const result = await listCycles();
      // Sort by label descending (Week N), take recent 8
      const sorted = [...result.items].sort((a, b) => {
        const aNum = parseInt(a.label.replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(b.label.replace(/\D/g, ''), 10) || 0;
        return bNum - aNum;
      });
      return sorted.slice(0, 8);
    },
    staleTime: 60_000,
  });
}

export function CycleHistorySelector({ currentCycleId, onSelect }: CycleHistorySelectorProps) {
  const { data: cycles = [] } = useCycleHistory();

  if (cycles.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      {cycles.map((cycle: Cycle) => {
        const isCurrent = cycle.id === currentCycleId;
        return (
          <button
            key={cycle.id}
            type="button"
            onClick={() => onSelect?.(cycle.id)}
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
