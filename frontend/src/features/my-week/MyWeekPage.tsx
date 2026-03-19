import { useState, useMemo, useCallback } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments, useDeleteCommitment } from '@/hooks/useCommitments';
import { useReconciliationView, useCompleteReconciliation } from '@/hooks/useReconciliation';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';
import { CommitmentList } from '@/features/commit-entry/CommitmentList';
import { CommitmentForm } from '@/features/commit-entry/CommitmentForm';
import { PlannedVsActualTable } from '@/features/reconciliation/PlannedVsActualTable';
import { UnplannedWorkEntry } from '@/features/reconciliation/UnplannedWorkEntry';
import { CoverageStrip } from './CoverageStrip';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CycleState, ReconciliationStatus } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_STATE_VARIANTS: Record<CycleState, 'blue' | 'yellow' | 'red' | 'green'> = {
  DRAFT: 'blue',
  LOCKED: 'yellow',
  RECONCILING: 'red',
  RECONCILED: 'green',
};

const CYCLE_STATE_LABELS: Record<CycleState, string> = {
  DRAFT: 'Draft',
  LOCKED: 'Locked',
  RECONCILING: 'Reconciling',
  RECONCILED: 'Reconciled',
};

const CYCLE_STATE_MESSAGES: Record<CycleState, string> = {
  DRAFT: 'Create your commitments for this week.',
  LOCKED: 'Commitments locked. Reconciliation will open when the week ends.',
  RECONCILING: 'Time to reconcile \u2014 how did your week go?',
  RECONCILED: 'Week complete. Here\u2019s your summary.',
};

const RECON_STATUS_STYLE: Record<ReconciliationStatus, { icon: string; color: string; label: string }> = {
  COMPLETED: { icon: '\u2713', color: 'text-green-500', label: 'Completed' },
  PARTIALLY_COMPLETED: { icon: '\u25D1', color: 'text-amber-500', label: 'Partial' },
  NOT_STARTED: { icon: '\u2717', color: 'text-red-500', label: 'Not Started' },
  CARRIED_FORWARD: { icon: '\u21B3', color: 'text-gray-400', label: 'Carried Forward' },
};

// ─── MyWeekPage ───────────────────────────────────────────────────────────────

export function MyWeekPage() {
  const { userId } = useAuth();

  // Cycle
  const { data: cycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';
  const cycleState: CycleState = cycle?.state ?? 'DRAFT';

  // Commitments (all users in the cycle — filtered client-side for this user)
  const { data: allCommitments = [], isLoading: commitmentsLoading } = useCommitments(cycleId);
  const myCommitments = useMemo(
    () => allCommitments.filter((c) => c.userId === userId),
    [allCommitments, userId],
  );

  // Carried-forward items
  const carriedItems = useMemo(
    () => myCommitments.filter((c) => c.carriedFromCommitmentId !== null),
    [myCommitments],
  );

  // Team dashboard (for coverage strip)
  const { data: dashboard } = useDashboard();

  // Reconciliation data (RECONCILING + RECONCILED states)
  const shouldFetchRecon = cycleState === 'RECONCILING' || cycleState === 'RECONCILED';
  const {
    data: reconView,
    isLoading: reconLoading,
    refetch: refetchRecon,
  } = useReconciliationView(shouldFetchRecon ? cycleId : '');

  const completeMutation = useCompleteReconciliation(cycleId);

  // UI store
  const { commitmentFormOpen, editingCommitmentId, openCommitmentForm, closeCommitmentForm } =
    useUIStore();

  // Delete flow
  const deleteMutation = useDeleteCommitment(cycleId);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = useCallback((id: string) => { openCommitmentForm(id); }, [openCommitmentForm]);
  const handleDeleteRequest = useCallback((id: string) => { setDeleteConfirmId(id); }, []);

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    await deleteMutation.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  // Reconciliation submission
  const reconSummary = reconView?.summary;
  const allReconciled =
    reconSummary != null &&
    reconSummary.reconciledCount >= reconSummary.totalCommitments &&
    reconSummary.totalCommitments > 0;

  async function handleSubmitReconciliation() {
    if (!allReconciled) return;
    await completeMutation.mutateAsync();
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (cycleLoading) {
    return <LoadingSpinner fullPage label="Loading current cycle..." />;
  }

  if (cycleError || !cycle) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {cycleError instanceof Error
            ? cycleError.message
            : 'Could not load the current cycle. Please try again.'}
        </p>
      </div>
    );
  }

  const isDraft = cycleState === 'DRAFT';

  // Strategic impact for RECONCILED summary
  const strategicCommitments = myCommitments.filter(
    (c) => c.chessCategoryName === 'Strategic',
  );
  const reconDetails = reconView?.commitments ?? [];
  const reconStatusMap = new Map<string, ReconciliationStatus | null>();
  for (const detail of reconDetails) {
    reconStatusMap.set(detail.commitment.id, detail.reconciliation?.status ?? null);
  }
  const strategicCompleted = strategicCommitments.filter(
    (c) => reconStatusMap.get(c.id) === 'COMPLETED',
  ).length;
  const strategicCarried = strategicCommitments.filter(
    (c) => reconStatusMap.get(c.id) === 'CARRIED_FORWARD',
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* A. Cycle Status Bar                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`rounded-lg border-l-4 ${
          cycleState === 'DRAFT' ? 'border-blue-500' :
          cycleState === 'LOCKED' ? 'border-yellow-500' :
          cycleState === 'RECONCILING' ? 'border-red-500' : 'border-green-500'
        } bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Week</h1>
            <Badge variant={CYCLE_STATE_VARIANTS[cycleState]}>
              {CYCLE_STATE_LABELS[cycleState]}
            </Badge>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {cycle.label} &middot; {new Date(cycle.startsAt).toLocaleDateString()} &ndash; {new Date(cycle.endsAt).toLocaleDateString()}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {CYCLE_STATE_MESSAGES[cycleState]}
        </p>

        {/* Reconciliation progress (RECONCILING state) */}
        {cycleState === 'RECONCILING' && reconSummary && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{reconSummary.reconciledCount} of {reconSummary.totalCommitments} reconciled</span>
              <span>{Math.round((reconSummary.reconciledCount / Math.max(reconSummary.totalCommitments, 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(reconSummary.reconciledCount / Math.max(reconSummary.totalCommitments, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* B. Carry-Forward Banner                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {carriedItems.length > 0 && isDraft && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            {carriedItems.length} item{carriedItems.length !== 1 ? 's' : ''} carried from last week
          </h3>
          <ul className="mt-2 space-y-1">
            {carriedItems.map((item) => (
              <li key={item.id} className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <span className="text-blue-400 dark:text-blue-600">&bull;</span>
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* C. Coverage Strip (DRAFT + LOCKED)                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(cycleState === 'DRAFT' || cycleState === 'LOCKED') && (
        <CoverageStrip coverage={dashboard?.rcdoCoverage} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* D. Content — State-Driven                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* DRAFT — full edit mode */}
      {cycleState === 'DRAFT' && (
        <>
          {commitmentsLoading ? (
            <LoadingSpinner label="Loading commitments..." />
          ) : myCommitments.length === 0 ? (
            <EmptyState
              title="No commitments yet"
              description="Start by adding your first commitment for this week."
              action={
                <button
                  type="button"
                  onClick={() => { openCommitmentForm(); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create your first commitment
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { openCommitmentForm(); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Commitment
                </button>
              </div>
              <CommitmentList
                commitments={myCommitments}
                cycleState={cycleState}
                cycleId={cycleId}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </div>
          )}
        </>
      )}

      {/* LOCKED — read-only */}
      {cycleState === 'LOCKED' && (
        <>
          {commitmentsLoading ? (
            <LoadingSpinner label="Loading commitments..." />
          ) : myCommitments.length === 0 ? (
            <EmptyState
              title="No commitments"
              description="No commitments were created for this cycle."
            />
          ) : (
            <CommitmentList
              commitments={myCommitments}
              cycleState={cycleState}
              cycleId={cycleId}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}
        </>
      )}

      {/* RECONCILING — inline reconciliation */}
      {cycleState === 'RECONCILING' && (
        <>
          {commitmentsLoading || reconLoading ? (
            <LoadingSpinner label="Loading reconciliation data..." />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Framing text */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Review your week. For each commitment, mark what happened and why. This data drives the executive briefing and team health analytics.
              </p>

              {/* Inline reconciliation using PlannedVsActualTable */}
              <PlannedVsActualTable
                commitments={reconView?.commitments ?? []}
                cycleId={cycleId}
              />

              {/* Unplanned work entry */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Unplanned Work</h3>
                <UnplannedWorkEntry cycleId={cycleId} onAdd={() => { void refetchRecon(); }} />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between gap-4 pt-2">
                {!allReconciled && (
                  <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded px-3 py-2">
                    Reconcile all remaining commitments before submitting.
                  </p>
                )}
                {allReconciled && (
                  <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded px-3 py-2">
                    All commitments reconciled &mdash; ready to submit.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => { void handleSubmitReconciliation(); }}
                  disabled={!allReconciled || completeMutation.isPending}
                  className={[
                    'ml-auto px-6 py-2.5 text-sm font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                    allReconciled && !completeMutation.isPending
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
                  ].join(' ')}
                >
                  {completeMutation.isPending ? 'Submitting\u2026' : 'Submit Reconciliation'}
                </button>
              </div>

              {completeMutation.isError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  Failed to submit reconciliation. Please try again.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* RECONCILED — summary */}
      {cycleState === 'RECONCILED' && (
        <>
          {commitmentsLoading || reconLoading ? (
            <LoadingSpinner label="Loading summary..." />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Summary banner */}
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  You completed {reconSummary?.completedCount ?? 0} of {reconSummary?.totalCommitments ?? myCommitments.length} commitment{(reconSummary?.totalCommitments ?? myCommitments.length) !== 1 ? 's' : ''}.
                  {(reconSummary?.carriedForwardCount ?? 0) > 0 && ` ${reconSummary!.carriedForwardCount} carried forward.`}
                </p>
                {reconSummary && reconSummary.totalCommitments > 0 && (
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Completion rate: {Math.round(reconSummary.completionRate * 100)}% &middot;
                    Bullet completion: {Math.round(reconSummary.bulletCompletionRate * 100)}%
                  </p>
                )}
                {/* Strategic impact */}
                {strategicCommitments.length > 0 && (
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Strategic impact: {strategicCompleted} of {strategicCommitments.length} strategic commitment{strategicCommitments.length !== 1 ? 's' : ''} completed.
                    {strategicCarried > 0 && ` ${strategicCarried} carried forward.`}
                  </p>
                )}
              </div>

              {/* Stats grid */}
              {reconSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard label="Completed" value={reconSummary.completedCount} colorClass="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30" />
                  <SummaryCard label="Partial" value={reconSummary.partiallyCompletedCount} colorClass="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" />
                  <SummaryCard label="Not Started" value={reconSummary.notStartedCount} colorClass="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30" />
                  <SummaryCard label="Carried Forward" value={reconSummary.carriedForwardCount} colorClass="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" />
                </div>
              )}

              {/* Commitment cards with status indicators */}
              <div className="space-y-3" aria-label="Commitment list">
                {myCommitments.map((commitment) => {
                  const status = reconStatusMap.get(commitment.id) ?? commitment.reconciliationStatus;
                  const statusInfo = status ? RECON_STATUS_STYLE[status] : null;
                  return (
                    <div key={commitment.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{commitment.priorityRank}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{commitment.title}</h3>
                          {commitment.rcdoLink.rallyCryId && (
                            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">
                              {commitment.rcdoLink.rallyCryTitle}
                              {commitment.rcdoLink.definingObjectiveTitle && ` \u203A ${commitment.rcdoLink.definingObjectiveTitle}`}
                              {commitment.rcdoLink.outcomeTitle && ` \u203A ${commitment.rcdoLink.outcomeTitle}`}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {commitment.isUnplanned && <Badge variant="gray">Unplanned</Badge>}
                            {commitment.carriedFromCommitmentId && <Badge variant="blue">Carried Forward</Badge>}
                          </div>
                        </div>
                        {statusInfo && (
                          <div className={`flex-shrink-0 flex items-center gap-1.5 ${statusInfo.color}`}>
                            <span className="text-lg leading-none" aria-hidden="true">{statusInfo.icon}</span>
                            <span className="text-xs font-medium">{statusInfo.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* E. Slide-over Form (DRAFT only)                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isDraft && cycleId && (
        <CommitmentForm
          open={commitmentFormOpen}
          {...(editingCommitmentId !== null && { commitmentId: editingCommitmentId })}
          cycleId={cycleId}
          onClose={closeCommitmentForm}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* F. Delete Confirmation                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => { setDeleteConfirmId(null); }}
        onConfirm={() => { void handleDeleteConfirm(); }}
        title="Delete Commitment"
        description="Are you sure you want to delete this commitment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className={`rounded-lg p-3 ${colorClass}`}>
      <dt className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</dt>
      <dd className="text-2xl font-bold mt-0.5">{value}</dd>
    </div>
  );
}
