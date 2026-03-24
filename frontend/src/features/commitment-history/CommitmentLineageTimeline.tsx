import type { CommitmentLineageNode } from '@/types';

interface CommitmentLineageTimelineProps {
  nodes: CommitmentLineageNode[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadMoreLoading: boolean;
}

function formatWeekRange(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function CommitmentLineageTimeline({
  nodes,
  isLoading,
  hasMore,
  onLoadMore,
  loadMoreLoading,
}: CommitmentLineageTimelineProps) {
  if (isLoading && nodes.length === 0) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-sm bg-surface-container animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <p className="text-body text-on-surface-variant py-4">
        No history found for this commitment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {nodes.map((node, idx) => (
        <div
          key={`${node.commitmentId}-${node.cycleId}`}
          className={[
            'bg-surface-container-low rounded-sm p-3 flex flex-col gap-2',
            idx === 0 ? 'border-l-[3px] border-l-accent' : '',
            idx > 0 ? 'mt-3' : '',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-small font-medium text-accent">{node.cycleLabel}</p>
              <p className="text-[0.8125rem] text-muted mt-0.5">
                {formatWeekRange(node.startsAt, node.endsAt)}
              </p>
            </div>
            {node.reconciliationStatus && (
              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium bg-warning/10 text-warning whitespace-nowrap">
                {node.reconciliationStatus.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h3 className="text-body font-medium text-on-surface leading-snug">{node.title}</h3>
          {node.bullets.length > 0 && (
            <div className="flex flex-col gap-1 pl-1">
              {node.bullets.map((bullet) => (
                <label
                  key={bullet.id}
                  className="flex items-center gap-2 text-[0.8125rem] text-on-surface-variant"
                >
                  <input
                    type="checkbox"
                    checked={bullet.isCompleted}
                    readOnly
                    className="flex-shrink-0 w-3.5 h-3.5 rounded-sm border-[1.5px] border-outline-variant bg-surface-lowest accent-accent pointer-events-none"
                  />
                  <span className={bullet.isCompleted ? 'line-through text-muted' : ''}>
                    {bullet.body}
                  </span>
                </label>
              ))}
            </div>
          )}
          {node.reconciliationNote && (
            <div className="text-[0.8125rem] text-on-surface-variant italic p-2 bg-surface-container rounded-sm leading-snug">
              <strong className="font-medium text-on-surface not-italic">Notes:</strong>{' '}
              {node.reconciliationNote}
            </div>
          )}
        </div>
      ))}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => { onLoadMore(); }}
            disabled={loadMoreLoading}
            className="px-4 py-2 text-small font-medium text-accent border border-accent rounded-sm bg-transparent hover:bg-accent/[0.08] transition-colors duration-[var(--duration-fast)] disabled:opacity-50"
          >
            {loadMoreLoading ? 'Loading…' : 'See more history'}
          </button>
        </div>
      )}
    </div>
  );
}
