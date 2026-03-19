import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useCurrentCycle, useCycle } from '@/hooks/useCycle';
import {
  useReconciliationView,
  useCompleteReconciliation,
} from '@/hooks/useReconciliation';
import { PlannedVsActualTable } from './PlannedVsActualTable';
import { UnplannedWorkEntry } from './UnplannedWorkEntry';

export function ReconciliationPage() {
  const navigate = useNavigate();
  const { cycleId: paramCycleId } = useParams<{ cycleId?: string }>();

  // When a cycleId param is present, fetch that specific cycle; otherwise fetch current.
  const { data: currentCycle, isLoading: currentCycleLoading } = useCurrentCycle();
  const { data: specificCycle, isLoading: specificCycleLoading } = useCycle(paramCycleId ?? '');

  const cycle = paramCycleId ? specificCycle : currentCycle;
  const cycleLoading = paramCycleId ? specificCycleLoading : currentCycleLoading;

  const isReadOnly = cycle?.state === 'RECONCILED' || cycle?.state === 'LOCKED';

  // Only redirect if cycle is in DRAFT (nothing to reconcile yet) — skip when viewing a specific historical cycle
  useEffect(() => {
    if (!paramCycleId && !cycleLoading && cycle && cycle.state === 'DRAFT') {
      navigate('/');
    }
  }, [paramCycleId, cycle, cycleLoading, navigate]);

  const cycleId = cycle?.id ?? '';

  const {
    data: view,
    isLoading: viewLoading,
    isError: viewError,
    refetch,
  } = useReconciliationView(cycleId);

  const completeMutation = useCompleteReconciliation(cycleId);

  // Loading states
  if (cycleLoading || !cycle) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Loading cycle…</p>
      </div>
    );
  }

  if (viewLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Loading reconciliation view…</p>
      </div>
    );
  }

  if (viewError || !view) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-red-600 dark:text-red-400">Failed to load reconciliation data.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { commitments, summary } = view;
  const allReconciled = summary.reconciledCount >= summary.totalCommitments && summary.totalCommitments > 0;

  const strategicCommitments = commitments.filter(
    (d) => d.commitment.chessCategoryName === 'Strategic'
  );
  const strategicCompleted = strategicCommitments.filter(
    (d) => d.reconciliation?.status === 'COMPLETED'
  ).length;

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
      {/* Read-only banner for completed/locked cycles */}
      {isReadOnly && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This cycle has been completed. Viewing in read-only mode.
          </p>
        </div>
      )}

      {/* Framing text */}
      {!isReadOnly && (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Review your week. For each commitment, mark what happened and why. This data drives the
          executive briefing and team health analytics.
        </p>
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reconciliation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cycle.label} — {isReadOnly ? 'Viewing completed reconciliation data.' : 'Review your planned commitments and mark actual outcomes.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {summary.reconciledCount} / {summary.totalCommitments} reconciled
          </span>
        </div>
      </div>

      {/* Planned vs Actual Table */}
      <PlannedVsActualTable commitments={commitments} cycleId={cycleId} />

      {/* Unplanned Work — only show when actively reconciling */}
      {!isReadOnly && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Unplanned Work</h3>
          <UnplannedWorkEntry cycleId={cycleId} onAdd={() => void refetch()} />
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Summary</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryItem
            label="Completed"
            value={summary.completedCount}
            colorClass="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
          />
          <SummaryItem
            label="Partial"
            value={summary.partiallyCompletedCount}
            colorClass="text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
          />
          <SummaryItem
            label="Not Started"
            value={summary.notStartedCount}
            colorClass="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
          />
          <SummaryItem
            label="Carried Forward"
            value={summary.carriedForwardCount}
            colorClass="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
          />
        </dl>

        {summary.totalCommitments > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Completion rate:{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {Math.round(summary.completionRate * 100)}%
              </strong>
            </span>
            <span>
              Bullet completion:{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {Math.round(summary.bulletCompletionRate * 100)}%
              </strong>
            </span>
            {strategicCommitments.length > 0 && (
              <span>
                Strategic commitments completed:{' '}
                <strong className="text-gray-900 dark:text-gray-100">
                  {strategicCompleted} of {strategicCommitments.length}
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Submit — only show when actively reconciling */}
      {!isReadOnly && (
        <div className="flex items-center justify-between gap-4 pt-2 pb-8">
          {!allReconciled && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded px-3 py-2">
              Reconcile all {summary.totalCommitments - summary.reconciledCount} remaining commitment
              {summary.totalCommitments - summary.reconciledCount !== 1 ? 's' : ''} before submitting.
            </p>
          )}
          {allReconciled && (
            <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded px-3 py-2">
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
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
            ].join(' ')}
          >
            {completeMutation.isPending ? 'Submitting…' : 'Submit Reconciliation'}
          </button>
        </div>
      )}

      {completeMutation.isError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 -mt-4">
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
