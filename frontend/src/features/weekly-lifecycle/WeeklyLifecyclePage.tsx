import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CycleStateIndicator } from './CycleStateIndicator';
import { TransitionActions } from './TransitionActions';
import { CarryForwardPanel } from './CarryForwardPanel';
import { listCycles } from '@/api/cycles.api';
import type { Cycle, UserRole } from '@/types';
import type { StateTransition } from './CycleStateIndicator';

const MANAGER_PLUS_ROLES: UserRole[] = ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'];

// Derive transitions from the cycle's audit timestamps.
// The backend does not currently return a transitions log, so we reconstruct
// an approximation from the fields that are available.
function deriveTransitions(cycle: Cycle): StateTransition[] {
  const transitions: StateTransition[] = [];

  // DRAFT is the initial state, entered at createdAt
  transitions.push({
    fromState: null,
    toState: 'DRAFT',
    transitionedAt: cycle.createdAt,
  });

  // Future states cannot be inferred from Cycle alone — they would require
  // a real transition log endpoint. For now, only the creation entry is shown.
  return transitions;
}

function cycleStateBadgeVariant(
  state: Cycle['state']
): 'blue' | 'yellow' | 'gray' | 'green' {
  switch (state) {
    case 'DRAFT':
      return 'blue';
    case 'LOCKED':
      return 'yellow';
    case 'RECONCILING':
      return 'gray';
    case 'RECONCILED':
      return 'green';
  }
}

function formatDateRange(startsAt: string, endsAt: string): string {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

// ------------------------------------------------------------------
// Cycle History
// ------------------------------------------------------------------

interface CycleHistoryProps {
  currentCycleId: string;
}

function CycleHistory({ currentCycleId }: CycleHistoryProps) {
  const [open, setOpen] = useState(false);

  const { data: cyclesData, isLoading } = useQuery({
    queryKey: ['cycles', 'history', currentCycleId],
    queryFn: () => listCycles({ state: 'RECONCILED' }),
    staleTime: 60_000,
    enabled: open,
  });

  // Filter out the current cycle and take the 4 most recent completed ones
  const pastCycles = (cyclesData?.items ?? [])
    .filter((c) => c.id !== currentCycleId)
    .slice(0, 4);

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cycle History</span>
        <svg
          className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading history…</p>
          ) : pastCycles.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No completed past cycles found.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pastCycles.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {c.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateRange(c.startsAt, c.endsAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {c.commitmentCount} commitment{c.commitmentCount !== 1 ? 's' : ''}
                    </span>
                    <Badge variant={cycleStateBadgeVariant(c.state)}>
                      {c.state.charAt(0) + c.state.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function WeeklyLifecyclePage() {
  const { role } = useAuth();
  const isManagerPlus = role !== null && MANAGER_PLUS_ROLES.includes(role);

  const { data: cycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();
  const {
    data: commitments,
    isLoading: commitmentsLoading,
  } = useCommitments(cycle?.id ?? '', undefined);

  if (cycleLoading || commitmentsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading cycle…" />
      </div>
    );
  }

  if (cycleError || !cycle) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-6">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          {cycleError instanceof Error
            ? cycleError.message
            : 'Failed to load the current cycle. Please try again.'}
        </p>
      </div>
    );
  }

  const allCommitments = commitments ?? [];
  const carriedItems = allCommitments.filter(
    (c) => c.carriedFromCommitmentId !== null
  );
  const transitions = deriveTransitions(cycle);

  const rallyCryLinkedCount = allCommitments.filter(
    (c) => c.rcdoLink.rallyCryId !== null
  ).length;
  const rallyCryPct =
    allCommitments.length > 0
      ? Math.round((rallyCryLinkedCount / allCommitments.length) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={cycle.label}
        subtitle={formatDateRange(cycle.startsAt, cycle.endsAt)}
        badge={
          <Badge variant={cycleStateBadgeVariant(cycle.state)}>
            {cycle.state.charAt(0) + cycle.state.slice(1).toLowerCase()}
          </Badge>
        }
      />

      {/* Narrative context */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This week:{' '}
        <strong className="text-gray-800 dark:text-gray-200">
          {allCommitments.length} commitment{allCommitments.length !== 1 ? 's' : ''}
        </strong>{' '}
        across the team.{' '}
        <strong className="text-gray-800 dark:text-gray-200">{rallyCryPct}%</strong> linked to a
        rally cry.
      </p>

      <CycleStateIndicator
        currentState={cycle.state}
        transitions={transitions}
      />

      {isManagerPlus && (
        <TransitionActions
          cycle={cycle}
          commitmentCount={allCommitments.length}
        />
      )}

      <CarryForwardPanel carriedItems={carriedItems} cycleId={cycle.id} />

      <CycleHistory currentCycleId={cycle.id} />
    </div>
  );
}
