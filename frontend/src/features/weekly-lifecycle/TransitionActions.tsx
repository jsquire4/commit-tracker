import { useState } from 'react';
import type { Cycle } from '@/types';
import { useTransitionCycle } from '@/hooks/useCycle';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface TransitionActionsProps {
  cycle: Cycle;
  commitmentCount: number;
}

interface TransitionConfig {
  label: string;
  description: string;
  confirmLabel: string;
  targetState: Cycle['state'];
  disabledReason?: string | undefined;
}

function getTransitionConfig(
  cycle: Cycle,
  commitmentCount: number
): TransitionConfig | null {
  switch (cycle.state) {
    case 'DRAFT': {
      const base = {
        label: 'Lock Commitments',
        description:
          'Locking will prevent further edits to commitments for this cycle. Are you sure?',
        confirmLabel: 'Lock',
        targetState: 'LOCKED' as const,
      };
      return commitmentCount === 0
        ? { ...base, disabledReason: 'Add at least one commitment' }
        : base;
    }
    case 'LOCKED':
      return {
        label: 'Begin Reconciliation',
        description:
          'This will open the cycle for reconciliation. Team members can start marking commitments as complete or carried forward.',
        confirmLabel: 'Begin',
        targetState: 'RECONCILING',
      };
    case 'RECONCILING':
      // Handled in ReconciliationPage, not here
      return null;
    case 'RECONCILED':
      return null;
    default:
      return null;
  }
}

export function TransitionActions({ cycle, commitmentCount }: TransitionActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: transitionCycle, isPending } = useTransitionCycle();

  const config = getTransitionConfig(cycle, commitmentCount);

  if (cycle.state === 'RECONCILED') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-green-800">Cycle complete</p>
        </div>
        <p className="mt-1 pl-7 text-xs text-green-600">
          All commitments have been reconciled for this cycle.
        </p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const isDisabled = Boolean(config.disabledReason) || isPending;

  function handleConfirm() {
    transitionCycle(
      { id: cycle.id, req: { targetState: config!.targetState } },
      { onSuccess: () => setDialogOpen(false) }
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4">
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {cycle.state === 'DRAFT'
              ? 'Ready to lock in commitments for this cycle?'
              : 'Ready to start reconciling commitments?'}
          </p>
          {config.disabledReason && (
            <p className="mt-0.5 text-xs text-amber-600">{config.disabledReason}</p>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => setDialogOpen(true)}
            title={config.disabledReason}
            className={[
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
              isDisabled
                ? 'cursor-not-allowed bg-blue-300 focus:ring-blue-300'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            ].join(' ')}
          >
            {isPending && <LoadingSpinner size="sm" />}
            {config.label}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        title={config.label}
        description={config.description}
        confirmLabel={config.confirmLabel}
        loading={isPending}
      />
    </>
  );
}
