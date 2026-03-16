import { useState } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CycleStateIndicator } from './CycleStateIndicator';
import { TransitionActions } from './TransitionActions';
import { CarryForwardPanel } from './CarryForwardPanel';
import type { Cycle } from '@/types';
import type { StateTransition } from './CycleStateIndicator';

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

// Placeholder — full history would come from a listCycles hook, which is out
// of scope for this component. We render a stub that shows no past cycles yet.
function CycleHistory({ currentCycleId: _currentCycleId }: CycleHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-700">Cycle History</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
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
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-sm text-gray-400">
            Past cycle history will appear here once previous cycles are available.
          </p>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function WeeklyLifecyclePage() {
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-700">
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

      <CycleStateIndicator
        currentState={cycle.state}
        transitions={transitions}
      />

      <TransitionActions
        cycle={cycle}
        commitmentCount={allCommitments.length}
      />

      <CarryForwardPanel carriedItems={carriedItems} cycleId={cycle.id} />

      <CycleHistory currentCycleId={cycle.id} />
    </div>
  );
}
