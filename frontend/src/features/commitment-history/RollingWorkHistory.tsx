import { useState, useCallback, useEffect } from 'react';
import { getRollingHistory } from '@/api/ic-insights.api';
import { useRollingHistory } from '@/hooks/useIcInsights';
import type { HistoryCommitment, WeekGroup } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

type StatusKey = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'NOT_STARTED' | 'CARRIED_FORWARD';

const STATUS_CONFIG: Record<StatusKey, { label: string; className: string; icon: string }> = {
  COMPLETED: {
    label: 'Completed',
    className: 'bg-success/10 text-success',
    icon: '✓',
  },
  PARTIALLY_COMPLETED: {
    label: 'Partial',
    className: 'bg-warning/10 text-warning',
    icon: '◑',
  },
  NOT_STARTED: {
    label: 'Not Started',
    className: 'bg-error/10 text-error',
    icon: '✕',
  },
  CARRIED_FORWARD: {
    label: 'Carried',
    className: 'bg-surface-container text-on-surface-variant',
    icon: '↳',
  },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = STATUS_CONFIG[status as StatusKey];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-small font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${config.className}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

// ── Commitment card ───────────────────────────────────────────────────────────

export function CommitmentCard({ commitment }: { commitment: HistoryCommitment }) {
  const hasChess = Boolean(commitment.chessCategoryName);
  const hasRallyCry = Boolean(commitment.rallyCryTitle);
  const hasGrowthAreas = commitment.growthAreaLabels.length > 0;
  const hasTags = hasRallyCry || hasChess || hasGrowthAreas;

  return (
    <li className="px-4 py-3 border-b border-outline-variant/10 last:border-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-on-surface leading-snug">{commitment.title}</p>

          {hasTags && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {hasRallyCry && (
                <span className="inline-flex items-center gap-1 bg-accent/10 text-accent rounded-full px-2 py-0.5 text-small font-medium">
                  <span aria-hidden="true" className="text-[0.625rem]">◆</span>
                  {commitment.rallyCryTitle}
                </span>
              )}
              {hasChess && (
                <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 text-small">
                  {commitment.chessCategoryName}
                </span>
              )}
              {commitment.growthAreaLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 text-small"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {(commitment.isUnplanned || commitment.assignedByName) && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {commitment.isUnplanned && (
                <span className="inline-flex items-center bg-surface-container-low text-muted rounded-full px-2 py-0.5 text-small border border-outline-variant/20">
                  Unplanned
                </span>
              )}
              {commitment.assignedByName && (
                <span className="text-small text-muted">
                  Assigned by {commitment.assignedByName}
                </span>
              )}
            </div>
          )}
        </div>

        <StatusBadge status={commitment.reconciliationStatus} />
      </div>
    </li>
  );
}

// ── Week group ────────────────────────────────────────────────────────────────

export function WeekGroupCard({ group, defaultExpanded }: { group: WeekGroup; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const completedCount = group.commitments.filter(
    (c) => c.reconciliationStatus === 'COMPLETED',
  ).length;

  const totalCount = group.commitments.length;

  return (
    <div className="bg-surface-lowest rounded-sm border border-outline-variant/15 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-container/50 transition-colors duration-[var(--duration-fast)]"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="font-medium text-body text-on-surface leading-snug">{group.cycleLabel}</p>
          <p className="text-small text-muted mt-0.5">
            {formatDateRange(group.startsAt, group.endsAt)}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-small text-on-surface-variant tabular-nums whitespace-nowrap">
            {totalCount} commitment{totalCount !== 1 ? 's' : ''} · {completedCount} completed
          </span>
          <svg
            className={`w-4 h-4 text-muted flex-shrink-0 transition-transform duration-[var(--duration-fast)] ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <ul className="border-t border-outline-variant/10">
          {group.commitments.length === 0 ? (
            <li className="px-4 py-3 text-body text-on-surface-variant">
              No commitments in this cycle.
            </li>
          ) : (
            group.commitments.map((c) => <CommitmentCard key={c.id} commitment={c} />)
          )}
        </ul>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function RollingWorkHistorySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading work history">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-sm border border-outline-variant/15 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-28 rounded bg-surface-container animate-pulse" />
              <div className="h-3 w-40 rounded bg-surface-container animate-pulse" />
            </div>
            <div className="h-3 w-32 rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pagination constants ──────────────────────────────────────────────────────

const INITIAL_OFFSET = 0;
const INITIAL_LIMIT = 7;
const PAGE_LIMIT = 12;

// ── Week list with load-more ──────────────────────────────────────────────────
// Reusable across My Week and My Team / PersonCard

export interface WeekListProps {
  /** Pre-loaded initial weeks (from the first page fetch) */
  initialWeeks: WeekGroup[];
  initialHasMore: boolean;
  initialNextOffset: number;
  /** Fetch function — callers supply their own (getRollingHistory or getTeamMemberHistory) */
  fetcher: (offset: number, limit: number) => Promise<{ weeks: WeekGroup[]; hasMore: boolean; nextOffset: number }>;
  /** How many weeks to show pre-expanded. Default 1 (most recent only). */
  defaultExpandedCount?: number;
}

export function WeekList({ initialWeeks, initialHasMore, initialNextOffset, fetcher, defaultExpandedCount = 1 }: WeekListProps) {
  const [allWeeks, setAllWeeks] = useState<WeekGroup[]>(initialWeeks);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  // Sync if parent refreshes initialWeeks (e.g. query cache invalidation)
  useEffect(() => {
    setAllWeeks(initialWeeks);
    setHasMore(initialHasMore);
    setNextOffset(initialNextOffset);
  }, [initialWeeks, initialHasMore, initialNextOffset]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const page = await fetcher(nextOffset, PAGE_LIMIT);
      setAllWeeks((prev) => [...prev, ...page.weeks]);
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [nextOffset, loadingMore, fetcher]);

  if (allWeeks.length === 0) {
    return (
      <p className="text-body text-on-surface-variant">
        No completed weeks yet.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {allWeeks.map((group, idx) => (
          <WeekGroupCard
            key={group.cycleId}
            group={group}
            defaultExpanded={idx < defaultExpandedCount}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {loadMoreError && (
            <p className="text-small text-error" role="alert">
              Failed to load more weeks. Try again.
            </p>
          )}
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-small font-medium text-accent border border-accent/30 rounded-sm px-4 py-1.5 hover:bg-accent/5 transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading…' : 'Load more weeks'}
          </button>
        </div>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface RollingWorkHistoryProps {
  /**
   * When set, fetches exactly this many weeks and hides the "Load more" button.
   * Useful for embedded contexts (e.g. My Team) where pagination is unwanted.
   */
  maxWeeks?: number;
}

export function RollingWorkHistory({ maxWeeks }: RollingWorkHistoryProps = {}) {
  const limit = maxWeeks != null ? maxWeeks : INITIAL_LIMIT;
  const { data, isLoading, isError } = useRollingHistory(INITIAL_OFFSET, limit);

  return (
    <section
      className="border-t border-outline-variant/15 pt-6 mt-6"
      aria-labelledby="rolling-history-heading"
    >
      <div className="mb-4">
        <h2
          id="rolling-history-heading"
          className="font-serif text-lg text-on-surface"
        >
          Recent Work
        </h2>
      </div>

      {isLoading ? (
        <RollingWorkHistorySkeleton />
      ) : isError ? (
        <p className="text-body text-error" role="alert">
          Failed to load work history. Please try again.
        </p>
      ) : !data || data.weeks.length === 0 ? (
        <p className="text-body text-on-surface-variant">
          No completed weeks yet. Your work history will build here.
        </p>
      ) : (
        <WeekList
          initialWeeks={data.weeks}
          initialHasMore={maxWeeks != null ? false : data.hasMore}
          initialNextOffset={data.nextOffset}
          fetcher={getRollingHistory}
        />
      )}
    </section>
  );
}
