import { useState } from 'react';
import type { CommitmentReconciliationDetail } from '@/types/reconciliation.types';
import { CommitmentRow } from './CommitmentRow';

/* ─── PlannedVsActualTable ─────────────────────────────────────────────────── */

interface PlannedVsActualTableProps {
  commitments: CommitmentReconciliationDetail[];
  cycleId: string;
}

export function PlannedVsActualTable({ commitments, cycleId }: PlannedVsActualTableProps) {
  // First card expanded by default
  const firstCommitment = commitments.length > 0 ? commitments[0] : undefined;
  const [expandedId, setExpandedId] = useState<string | null>(
    firstCommitment?.commitment.id ?? null,
  );

  if (commitments.length === 0) {
    return (
      <p className="text-sm text-muted py-4">No commitments to reconcile.</p>
    );
  }

  const allCommitments = commitments.map((d) => d.commitment);

  return (
    <div className="flex flex-col gap-3">
      {commitments.map((detail, idx) => (
        <CommitmentRow
          key={detail.commitment.id}
          detail={detail}
          cycleId={cycleId}
          allCommitments={allCommitments}
          expanded={expandedId === detail.commitment.id}
          onToggle={() => {
            setExpandedId((prev) =>
              prev === detail.commitment.id ? null : detail.commitment.id,
            );
          }}
          staggerIndex={idx + 1}
        />
      ))}
    </div>
  );
}
