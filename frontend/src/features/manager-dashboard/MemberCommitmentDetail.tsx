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
  COMPLETED: 'bg-accent/10 text-accent',
  PARTIALLY_COMPLETED: 'bg-warning/10 text-warning',
  NOT_STARTED: 'bg-error/10 text-error',
  CARRIED_FORWARD: 'bg-surface-container text-on-surface-variant',
};

const CATEGORY_COLORS: Record<string, string> = {
  STRATEGIC: 'bg-accent/10 text-accent',
  OPERATIONAL: 'bg-surface-container text-on-surface-variant',
  DEFENSIVE: 'bg-error/10 text-error',
  CAPABILITY_BUILDING: 'bg-navy/10 text-navy',
};

function CommitmentRow({ commitment }: { commitment: Commitment }) {
  const recStatus = commitment.reconciliationStatus;
  const recLabel = recStatus ? (RECONCILIATION_LABELS[recStatus] ?? recStatus) : null;
  const recColor = recStatus ? (RECONCILIATION_COLORS[recStatus] ?? 'bg-surface-container text-on-surface-variant') : null;
  const catColor = commitment.chessCategoryName
    ? (CATEGORY_COLORS[commitment.chessCategoryName.toUpperCase().replace(/ /g, '_')] ?? 'bg-surface-container text-on-surface-variant')
    : 'bg-surface-container text-on-surface-variant';

  return (
    <div className="py-3 border-b border-outline-variant/15 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface leading-snug">{commitment.title}</p>
          {commitment.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-2">{commitment.description}</p>
          )}
          {commitment.reconciliationNote && (
            <p className="text-xs text-muted italic mt-1">Note: {commitment.reconciliationNote}</p>
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
            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
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
      <div className="py-4 px-3 text-sm text-error">
        Failed to load commitments.
      </div>
    );
  }

  if (!commitments || commitments.length === 0) {
    return (
      <div className="py-4 px-3 text-sm text-muted italic">
        No commitments found for this member.
      </div>
    );
  }

  const reconciled = commitments.filter((c) => c.reconciliationStatus !== null);
  const hasReconciliation = reconciled.length > 0;

  return (
    <div className="px-3 py-2">
      {hasReconciliation && (
        <div className="mb-3 p-3 bg-surface-container-low rounded-md border border-outline-variant">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
            Reconciliation Summary
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
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
      <div className="divide-y divide-outline-variant/15">
        {commitments.map((c) => (
          <CommitmentRow key={c.id} commitment={c} />
        ))}
      </div>
    </div>
  );
}
