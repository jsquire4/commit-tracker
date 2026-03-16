import type { CycleState } from '@/types';

export interface StateTransition {
  fromState: CycleState | null;
  toState: CycleState;
  transitionedAt: string;
}

interface CycleStateIndicatorProps {
  currentState: CycleState;
  transitions: StateTransition[];
}

const STATES: CycleState[] = ['DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED'];

const STATE_LABELS: Record<CycleState, string> = {
  DRAFT: 'Draft',
  LOCKED: 'Locked',
  RECONCILING: 'Reconciling',
  RECONCILED: 'Reconciled',
};

const STATE_COLORS: Record<CycleState, string> = {
  DRAFT: 'bg-blue-500 border-blue-500',
  LOCKED: 'bg-amber-500 border-amber-500',
  RECONCILING: 'bg-violet-500 border-violet-500',
  RECONCILED: 'bg-green-500 border-green-500',
};

const STATE_TEXT_COLORS: Record<CycleState, string> = {
  DRAFT: 'text-blue-700',
  LOCKED: 'text-amber-700',
  RECONCILING: 'text-violet-700',
  RECONCILED: 'text-green-700',
};

function formatTransitionTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CycleStateIndicator({
  currentState,
  transitions,
}: CycleStateIndicatorProps) {
  const currentIndex = STATES.indexOf(currentState);

  // Build a lookup from toState → transitionedAt
  const transitionMap = new Map<CycleState, string>(
    transitions.map((t) => [t.toState, t.transitionedAt])
  );

  return (
    <div className="rounded-lg bg-white border border-gray-200 p-6">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Cycle Progress
      </h2>

      <div className="flex items-center">
        {STATES.map((state, idx) => {
          const isCurrent = state === currentState;
          const isPast = idx < currentIndex;
          const transitionTime = transitionMap.get(state);

          return (
            <div key={state} className="flex flex-1 flex-col items-center">
              {/* Row: connector line + dot */}
              <div className="flex w-full items-center">
                {/* Left connector */}
                {idx > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isPast || isCurrent ? 'bg-gray-400' : 'bg-gray-200'
                    }`}
                  />
                )}

                {/* Dot */}
                <div
                  className={[
                    'relative flex items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCurrent
                      ? `h-8 w-8 ${STATE_COLORS[state]} animate-pulse shadow-lg`
                      : isPast
                        ? `h-6 w-6 ${STATE_COLORS[state]} opacity-60`
                        : 'h-6 w-6 border-gray-300 bg-white',
                  ].join(' ')}
                >
                  {isPast && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {isCurrent && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>

                {/* Right connector */}
                {idx < STATES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isCurrent || isPast ? 'bg-gray-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Label + timestamp */}
              <div className="mt-2 flex flex-col items-center gap-0.5 text-center">
                <span
                  className={[
                    'text-xs font-semibold',
                    isCurrent
                      ? STATE_TEXT_COLORS[state]
                      : isPast
                        ? 'text-gray-500'
                        : 'text-gray-300',
                    isCurrent ? 'text-sm' : '',
                  ].join(' ')}
                >
                  {STATE_LABELS[state]}
                </span>
                {transitionTime && (
                  <span className="text-xs text-gray-400">
                    {formatTransitionTime(transitionTime)}
                  </span>
                )}
                {isCurrent && !transitionTime && (
                  <span className="text-xs text-gray-400">Now</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
