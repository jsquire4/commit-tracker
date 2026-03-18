import { Badge } from '@/components/Badge';
import type { CarryForwardChain } from '@/types';

interface CarryForwardChainListProps {
  chains: CarryForwardChain[];
}

export function CarryForwardChainList({ chains }: CarryForwardChainListProps) {
  const sorted = [...chains].sort((a, b) => b.chainLength - a.chainLength);
  const longChains = sorted.filter((c) => c.chainLength > 2);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Carry-Forward Chains
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Commitments carried forward more than 2 cycles, sorted by chain length
      </p>

      {longChains.length === 0 ? (
        <div className="py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
          No commitments carried forward more than 2 cycles.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {longChains.map((chain) => (
            <li
              key={chain.commitmentId}
              className="py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {chain.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {chain.userDisplayName} &middot; started {chain.originCycleLabel}
                </p>
              </div>
              <Badge variant="yellow">
                Carried {chain.chainLength}x
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
