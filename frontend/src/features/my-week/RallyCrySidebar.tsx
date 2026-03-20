import { useRcdoTree } from '@/hooks/useRcdo';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import type { Commitment } from '@/types';

interface RallyCrySidebarProps {
  commitments: Commitment[];
  onLinkClick?: (rallyCryId: string) => void;
}

export function RallyCrySidebar({ commitments, onLinkClick }: RallyCrySidebarProps) {
  const { data: tree, isLoading } = useRcdoTree();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLoader variant="card" count={2} />
      </div>
    );
  }

  const rallyCries = tree?.rallyCries ?? [];

  if (rallyCries.length === 0) return null;

  // Count linked per objective
  const objLinkedCounts = new Map<string, number>();
  for (const c of commitments) {
    const doId = c.rcdoLink.definingObjectiveId;
    if (doId) {
      objLinkedCounts.set(doId, (objLinkedCounts.get(doId) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-headline font-normal text-on-surface mb-1">
          This Week&rsquo;s Priorities
        </h2>
        <span className="text-small uppercase tracking-widest text-muted">
          Active Rally Cries
        </span>
      </div>

      {rallyCries.map((rc) => {
        return (
          <div key={rc.id} className="bg-surface-lowest rounded-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.9375rem] font-medium text-on-surface">
                {rc.title}
              </span>
              <button
                type="button"
                onClick={() => onLinkClick?.(rc.id)}
                className="text-small text-accent font-medium hover:text-accent-dark transition-colors duration-[var(--duration-fast)]"
              >
                Link &rarr;
              </button>
            </div>

            {rc.description && (
              <p className="text-[0.8125rem] text-muted italic leading-snug mb-2">
                {rc.description}
              </p>
            )}

            <div className="flex flex-col gap-1">
              {rc.definingObjectives.map((obj) => {
                const objCount = objLinkedCounts.get(obj.id) ?? 0;
                return (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between text-[0.8125rem] text-on-surface-variant py-0.5"
                  >
                    <span className="flex-1 min-w-0 truncate">{obj.title}</span>
                    <span className="flex-shrink-0 text-small text-muted bg-surface-container-low px-2 py-0.5 rounded-full ml-2">
                      {objCount} linked
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
