import { Badge } from '@/components/Badge';
import type { CarryForwardChain } from '@/types';

interface CarryForwardChainListProps {
  chains: CarryForwardChain[];
}

export function CarryForwardChainList({ chains }: CarryForwardChainListProps) {
  const sorted = [...chains].sort((a, b) => b.chainLength - a.chainLength);
  const longChains = sorted.filter((c) => c.chainLength > 2);

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-1">
        Carry-Forward Chains
      </h2>
      <p className="text-sm text-muted mb-4">
        Commitments carried forward more than 2 cycles, sorted by chain length
      </p>

      {longChains.length === 0 ? (
        <div className="py-6 text-center text-muted text-sm">
          No commitments carried forward more than 2 cycles.
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {longChains.map((chain) => (
            <li
              key={chain.commitmentId}
              className="py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-on-surface truncate">
                  {chain.title}
                </p>
                <p className="text-xs text-muted mt-0.5">
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
