import { useCommitments } from '@/hooks/useCommitments';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface CarryForwardVelocityProps {
  cycleId: string;
}

interface StatCardProps {
  label: string;
  value: string;
  isAmber?: boolean;
  sublabel?: string;
}

function StatCard({ label, value, isAmber = false, sublabel }: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-4 transition-colors duration-[var(--duration-fast)] ${
        isAmber
          ? 'bg-warning/5 border-warning/30'
          : 'bg-surface-lowest border-outline-variant'
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          isAmber ? 'text-warning' : 'text-muted'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          isAmber ? 'text-warning' : 'text-on-surface'
        }`}
      >
        {value}
      </p>
      {sublabel && (
        <p
          className={`text-xs ${
            isAmber ? 'text-warning/70' : 'text-muted'
          }`}
        >
          {sublabel}
        </p>
      )}
      {isAmber && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-warning">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          High carry-forward velocity
        </span>
      )}
    </div>
  );
}

export function CarryForwardVelocity({ cycleId }: CarryForwardVelocityProps) {
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

  const carryCount = commitments.filter((c) => c.carriedFromCommitmentId !== null).length;
  const isAmber = carryCount > 3;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-on-surface">
        Carry-Forward Velocity
      </h2>
      <div className="flex flex-wrap gap-4">
        <StatCard
          label="Active Carry Chains"
          value={String(carryCount)}
          sublabel={`${String(commitments.length)} total commitments this cycle`}
          isAmber={isAmber}
        />
      </div>
    </div>
  );
}
