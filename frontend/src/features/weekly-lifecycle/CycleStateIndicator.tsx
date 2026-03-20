import type { CycleState } from '@/types';

export interface StateTransition {
  fromState: CycleState | null;
  toState: CycleState;
  transitionedAt: string;
}

interface CycleStateIndicatorProps {
  currentState: CycleState;
  transitions?: StateTransition[];
}

const STATE_LABELS: Record<CycleState, string> = {
  DRAFT: 'Draft',
  LOCKED: 'Locked',
  RECONCILING: 'Reconciling',
  RECONCILED: 'Reconciled',
};

const STATE_DOT_COLORS: Record<CycleState, string> = {
  DRAFT: 'bg-accent',
  LOCKED: 'bg-warning',
  RECONCILING: 'bg-error',
  RECONCILED: 'bg-accent',
};

const STATE_MESSAGES: Record<CycleState, string> = {
  DRAFT: 'ready to plan',
  LOCKED: 'commitments locked',
  RECONCILING: 'reconciliation open',
  RECONCILED: 'week complete',
};

export function CycleStateIndicator({ currentState }: CycleStateIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-small font-medium">
      <span
        className={`w-1.5 h-1.5 rounded-full ${STATE_DOT_COLORS[currentState]}`}
        aria-hidden="true"
      />
      {STATE_LABELS[currentState]} &mdash; {STATE_MESSAGES[currentState]}
    </div>
  );
}
