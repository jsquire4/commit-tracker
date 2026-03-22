import { useCommitments } from '@/hooks/useCommitments';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface CarryForwardVelocityProps {
  cycleId: string;
  /** When provided, only commitments belonging to these user IDs are counted. */
  teamMemberIds?: string[];
}

export function CarryForwardVelocity({ cycleId, teamMemberIds }: CarryForwardVelocityProps) {
  const { data: commitments, isLoading, isError } = useCommitments(cycleId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size="sm" label="Loading carry-forward data…" />
      </div>
    );
  }

  if (isError || !commitments) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        Failed to load carry-forward data.
      </div>
    );
  }

  const teamCommitments = teamMemberIds && teamMemberIds.length > 0
    ? commitments.filter((c) => teamMemberIds.includes(c.userId))
    : commitments;
  const carryCount = teamCommitments.filter((c) => c.carriedFromCommitmentId !== null).length;
  const total = teamCommitments.length;
  const carryPct = total > 0 ? Math.round((carryCount / total) * 100) : 0;

  return (
    <div className="flex gap-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Carried Forward</span>
        <span className="text-2xl font-bold text-on-surface tabular-nums">{carryCount}</span>
        <span className="text-xs text-muted">of {total} commitments ({carryPct}%)</span>
      </div>
    </div>
  );
}
