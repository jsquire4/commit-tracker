import { useState } from 'react';
import type { Commitment } from '@/types';
import { Badge } from '@/components/Badge';
import { useDeleteCommitment } from '@/hooks/useCommitments';

interface CarryForwardPanelProps {
  carriedItems: Commitment[];
  cycleId: string;
}

interface DeclineState {
  commitmentId: string;
  reason: string;
}

function RcdoBreadcrumb({ commitment }: { commitment: Commitment }) {
  const { rallyCryId, definingObjectiveId, outcomeId } = commitment.rcdoLink;
  const parts: string[] = [];

  if (rallyCryId) parts.push('Rally Cry');
  if (definingObjectiveId) parts.push('Objective');
  if (outcomeId) parts.push('Outcome');

  if (parts.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-500 italic">No RCDO link</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {parts.map((part, i) => (
        <span key={part} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300 dark:text-gray-600">›</span>}
          {part}
        </span>
      ))}
    </span>
  );
}

function CarryCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge variant="yellow">
      Carried {count} {count === 1 ? 'time' : 'times'}
    </Badge>
  );
}

interface CarriedItemRowProps {
  commitment: Commitment;
  cycleId: string;
}

function CarriedItemRow({ commitment, cycleId }: CarriedItemRowProps) {
  const [declining, setDeclining] = useState(false);
  const [declineState, setDeclineState] = useState<DeclineState>({
    commitmentId: commitment.id,
    reason: '',
  });
  const { mutate: deleteCommitment, isPending } = useDeleteCommitment(cycleId);

  // Estimate carry count by checking if carriedFromCommitmentId exists
  // (The actual count would come from the API; we surface it when available via description heuristic)
  const carryCountMatch = commitment.description?.match(/carried (\d+) time/i);
  const carryCount = carryCountMatch ? parseInt(carryCountMatch[1] ?? '0', 10) : 1;

  function handleAccept() {
    // "Accept" is a no-op — the item already exists in the current cycle.
    // Nothing to do; the item stays.
  }

  function handleDeclineSubmit() {
    deleteCommitment(commitment.id);
    setDeclining(false);
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {commitment.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RcdoBreadcrumb commitment={commitment} />
            <CarryCount count={carryCount} />
          </div>
        </div>

        {!declining && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-md border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => { setDeclining(true); }}
              disabled={isPending}
              className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}
      </div>

      {declining && (
        <div className="rounded-md border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/30 p-3">
          <label
            htmlFor={`decline-reason-${commitment.id}`}
            className="mb-1 block text-xs font-medium text-red-700 dark:text-red-400"
          >
            Reason for declining (optional)
          </label>
          <input
            id={`decline-reason-${commitment.id}`}
            type="text"
            value={declineState.reason}
            onChange={(e) =>
              { setDeclineState((prev) => ({ ...prev, reason: e.target.value })); }
            }
            placeholder="e.g. no longer relevant"
            className="w-full rounded border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setDeclining(false); }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeclineSubmit}
              disabled={isPending}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Removing…' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function CarryForwardPanel({ carriedItems, cycleId }: CarryForwardPanelProps) {
  if (carriedItems.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Carried Forward
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No items carried forward from previous cycle.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-5">
      <div className="mb-4 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Carried Forward ({carriedItems.length})
        </h2>
      </div>

      <ul className="flex flex-col gap-2">
        {carriedItems.map((item) => (
          <CarriedItemRow key={item.id} commitment={item} cycleId={cycleId} />
        ))}
      </ul>
    </section>
  );
}
