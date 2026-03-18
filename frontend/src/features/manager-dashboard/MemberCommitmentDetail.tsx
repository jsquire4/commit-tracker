import { useCommitments } from '@/hooks/useCommitments';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Commitment } from '@/types';

interface MemberCommitmentDetailProps {
  userId: string;
  cycleId: string;
}

const RECONCILIATION_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  PARTIALLY_COMPLETED: 'Partial',
  NOT_STARTED: 'Not Started',
  CARRIED_FORWARD: 'Carried Forward',
};

const RECONCILIATION_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  PARTIALLY_COMPLETED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  NOT_STARTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  CARRIED_FORWARD: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const CATEGORY_COLORS: Record<string, string> = {
  STRATEGIC: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  OPERATIONAL: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  DEFENSIVE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  CAPABILITY_BUILDING: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
};

function CommitmentRow({ commitment }: { commitment: Commitment }) {
  const recStatus = commitment.reconciliationStatus;
  const recLabel = recStatus ? (RECONCILIATION_LABELS[recStatus] ?? recStatus) : null;
  const recColor = recStatus ? (RECONCILIATION_COLORS[recStatus] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300') : null;
  const catColor = commitment.chessCategoryName
    ? (CATEGORY_COLORS[commitment.chessCategoryName] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300')
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{commitment.title}</p>
          {commitment.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{commitment.description}</p>
          )}
          {commitment.reconciliationNote && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">Note: {commitment.reconciliationNote}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-1.5 justify-end">
          {commitment.chessCategoryName && (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${catColor}`}>
              {commitment.chessCategoryName}
            </span>
          )}
          {recLabel && recColor && (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${recColor}`}>
              {recLabel}
            </span>
          )}
          {commitment.isUnplanned && (
            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              Unplanned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MemberCommitmentDetail({ userId, cycleId }: MemberCommitmentDetailProps) {
  const { data: commitments, isLoading, isError } = useCommitments(cycleId, { userId });

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <LoadingSpinner size="sm" label="Loading commitments…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-4 px-3 text-sm text-red-600 dark:text-red-400">
        Failed to load commitments.
      </div>
    );
  }

  if (!commitments || commitments.length === 0) {
    return (
      <div className="py-4 px-3 text-sm text-gray-400 dark:text-gray-500 italic">
        No commitments found for this member.
      </div>
    );
  }

  const reconciled = commitments.filter((c) => c.reconciliationStatus !== null);
  const hasReconciliation = reconciled.length > 0;

  return (
    <div className="px-3 py-2">
      {hasReconciliation && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Reconciliation Summary
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300">
            <span>
              Planned: <strong>{commitments.filter((c) => !c.isUnplanned).length}</strong>
            </span>
            <span>
              Unplanned: <strong>{commitments.filter((c) => c.isUnplanned).length}</strong>
            </span>
            <span>
              Completed:{' '}
              <strong>
                {commitments.filter((c) => c.reconciliationStatus === 'COMPLETED').length}
              </strong>
            </span>
            <span>
              Carried Forward:{' '}
              <strong>
                {commitments.filter((c) => c.reconciliationStatus === 'CARRIED_FORWARD').length}
              </strong>
            </span>
          </div>
        </div>
      )}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {commitments.map((c) => (
          <CommitmentRow key={c.id} commitment={c} />
        ))}
      </div>
    </div>
  );
}
