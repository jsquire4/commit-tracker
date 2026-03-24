import { useState } from 'react';
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

function CommitmentCard({ commitment }: { commitment: HistoryCommitment }) {
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

function WeekGroupCard({ group, defaultExpanded }: { group: WeekGroup; defaultExpanded: boolean }) {
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

function RollingWorkHistorySkeleton() {
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

// ── Week toggle ───────────────────────────────────────────────────────────────

type WeekOption = 4 | 8 | 12;
const WEEK_OPTIONS: WeekOption[] = [4, 8, 12];

// ── Main component ────────────────────────────────────────────────────────────

export function RollingWorkHistory() {
  const [weeksOption, setWeeksOption] = useState<WeekOption>(4);
  const { data, isLoading, isError } = useRollingHistory(weeksOption);

  return (
    <section
      className="border-t border-outline-variant/15 pt-6 mt-6"
      aria-labelledby="rolling-history-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h2
          id="rolling-history-heading"
          className="font-serif text-lg text-on-surface"
        >
          Recent Work
        </h2>

        {/* Week selector */}
        <div
          className="flex items-center rounded-sm border border-outline-variant/20 overflow-hidden"
          role="group"
          aria-label="History window"
        >
          {WEEK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setWeeksOption(opt)}
              className={[
                'px-3 py-1 text-small font-medium transition-colors duration-[var(--duration-fast)]',
                'border-r border-outline-variant/20 last:border-r-0',
                opt === weeksOption
                  ? 'bg-accent/10 text-accent'
                  : 'text-on-surface-variant hover:bg-surface-container/60',
              ].join(' ')}
              aria-pressed={opt === weeksOption}
            >
              {opt}w
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
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
        <div className="flex flex-col gap-3">
          {data.weeks.map((group, idx) => (
            <WeekGroupCard
              key={group.cycleId}
              group={group}
              defaultExpanded={idx === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
