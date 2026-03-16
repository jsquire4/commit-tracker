import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import {
  useReconciliationView,
  useCompleteReconciliation,
} from '@/hooks/useReconciliation';
import { PlannedVsActualTable } from './PlannedVsActualTable';
import { UnplannedWorkEntry } from './UnplannedWorkEntry';

export function ReconciliationPage() {
  const navigate = useNavigate();
  const { data: cycle, isLoading: cycleLoading } = useCurrentCycle();

  // Redirect if not in RECONCILING state
  useEffect(() => {
    if (!cycleLoading && cycle && cycle.state !== 'RECONCILING') {
      navigate('/');
    }
  }, [cycle, cycleLoading, navigate]);

  const cycleId = cycle?.id ?? '';

  const {
    data: view,
    isLoading: viewLoading,
    isError: viewError,
    refetch,
  } = useReconciliationView(cycleId);

  const completeMutation = useCompleteReconciliation(cycleId);

  // Loading states
  if (cycleLoading || (!cycle && !cycleLoading)) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500">Loading cycle…</p>
      </div>
    );
  }

  if (viewLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500">Loading reconciliation view…</p>
      </div>
    );
  }

  if (viewError || !view) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-red-600">Failed to load reconciliation data.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { commitments, summary } = view;
  const allReconciled = summary.reconciledCount >= summary.totalCommitments && summary.totalCommitments > 0;

  async function handleSubmit() {
    if (!allReconciled) return;
    try {
      await completeMutation.mutateAsync();
      navigate('/');
    } catch {
      // Error state handled below
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reconciliation</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {cycle?.label} — Review your planned commitments and mark actual outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {summary.reconciledCount} / {summary.totalCommitments} reconciled
          </span>
        </div>
      </div>

      {/* Planned vs Actual Table */}
      <PlannedVsActualTable commitments={commitments} cycleId={cycleId} />

      {/* Unplanned Work */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Unplanned Work</h3>
        <UnplannedWorkEntry cycleId={cycleId} onAdd={() => void refetch()} />
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryItem
            label="Completed"
            value={summary.completedCount}
            colorClass="text-green-700 bg-green-50"
          />
          <SummaryItem
            label="Partial"
            value={summary.partiallyCompletedCount}
            colorClass="text-yellow-700 bg-yellow-50"
          />
          <SummaryItem
            label="Not Started"
            value={summary.notStartedCount}
            colorClass="text-red-700 bg-red-50"
          />
          <SummaryItem
            label="Carried Forward"
            value={summary.carriedForwardCount}
            colorClass="text-blue-700 bg-blue-50"
          />
        </dl>

        {summary.totalCommitments > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-6 text-sm text-gray-600">
            <span>
              Completion rate:{' '}
              <strong className="text-gray-900">
                {Math.round(summary.completionRate * 100)}%
              </strong>
            </span>
            <span>
              Bullet completion:{' '}
              <strong className="text-gray-900">
                {Math.round(summary.bulletCompletionRate * 100)}%
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 pt-2 pb-8">
        {!allReconciled && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Reconcile all {summary.totalCommitments - summary.reconciledCount} remaining commitment
            {summary.totalCommitments - summary.reconciledCount !== 1 ? 's' : ''} before submitting.
          </p>
        )}
        {allReconciled && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            All commitments reconciled — ready to submit.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!allReconciled || completeMutation.isPending}
          className={[
            'ml-auto px-6 py-2.5 text-sm font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            allReconciled && !completeMutation.isPending
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {completeMutation.isPending ? 'Submitting…' : 'Submit Reconciliation'}
        </button>
      </div>

      {completeMutation.isError && (
        <p role="alert" className="text-sm text-red-600 -mt-4">
          Failed to submit reconciliation. Please try again.
        </p>
      )}
    </div>
  );
}

interface SummaryItemProps {
  label: string;
  value: number;
  colorClass: string;
}

function SummaryItem({ label, value, colorClass }: SummaryItemProps) {
  return (
    <div className={`rounded-lg p-3 ${colorClass}`}>
      <dt className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</dt>
      <dd className="text-2xl font-bold mt-0.5">{value}</dd>
    </div>
  );
}
