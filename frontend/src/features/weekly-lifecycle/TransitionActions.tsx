import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Cycle } from '@/types';
import { useTransitionCycle } from '@/hooks/useCycle';
import { startNextCycle } from '@/api/cycles.api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import Tooltip from '@/components/Tooltip';

interface TransitionActionsProps {
  cycle: Cycle;
  commitmentCount: number;
  onStartNextWeek?: (newCycleId: string) => void;
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
  commitmentCount: number,
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
        ? { ...base, disabledReason: 'Add at least one commitment first' }
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
      return null;
    case 'RECONCILED':
      return null;
    default:
      return null;
  }
}

export function TransitionActions({ cycle, commitmentCount, onStartNextWeek }: TransitionActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [startingNextWeek, setStartingNextWeek] = useState(false);
  const { mutate: transitionCycle, isPending } = useTransitionCycle();
  const queryClient = useQueryClient();

  const config = getTransitionConfig(cycle, commitmentCount);

  if (cycle.state === 'RECONCILED') {
    return (
      <Button
        variant="primary"
        loading={startingNextWeek}
        onClick={async () => {
          setStartingNextWeek(true);
          try {
            // Create the next week's DRAFT cycle from this RECONCILED cycle
            const newCycle = await startNextCycle(cycle.id);
            await queryClient.invalidateQueries({ queryKey: ['cycle'] });
            await queryClient.invalidateQueries({ queryKey: ['commitments'] });
            onStartNextWeek?.(newCycle.id);
          } finally {
            setStartingNextWeek(false);
          }
        }}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        }
      >
        Start Next Week
      </Button>
    );
  }

  if (!config) {
    return null;
  }

  const isDisabled = Boolean(config.disabledReason) || isPending;

  function handleConfirm() {
    if (!config) return;
    transitionCycle(
      { id: cycle.id, req: { targetState: config.targetState } },
      { onSuccess: () => { setDialogOpen(false); } },
    );
  }

  const button = (
    <Button
      variant="primary"
      disabled={isDisabled}
      loading={isPending}
      onClick={() => { setDialogOpen(true); }}
      icon={
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      }
    >
      {config.label}
    </Button>
  );

  return (
    <>
      {config.disabledReason ? (
        <Tooltip content={config.disabledReason} side="top">
          {button}
        </Tooltip>
      ) : (
        button
      )}

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); }}
        onConfirm={handleConfirm}
        title={config.label}
        description={config.description}
        confirmLabel={config.confirmLabel}
        loading={isPending}
      />
    </>
  );
}
