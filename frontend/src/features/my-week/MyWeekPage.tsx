import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentCycle, useCycle } from '@/hooks/useCycle';
import { useCommitments, useDeleteCommitment } from '@/hooks/useCommitments';
import { useReconciliationView, useCompleteReconciliation } from '@/hooks/useReconciliation';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';
import { CommitmentList } from '@/features/commit-entry/CommitmentList';
import { CommitmentForm } from '@/features/commit-entry/CommitmentForm';
import { PlannedVsActualTable } from '@/features/reconciliation/PlannedVsActualTable';
import { UnplannedWorkEntry } from '@/features/reconciliation/UnplannedWorkEntry';
import { ReconciliationBottomBar } from '@/features/reconciliation/ReconciliationBottomBar';
import { CoverageStrip } from './CoverageStrip';
import { CommitmentSummaryStrip } from './CommitmentSummaryStrip';
import { RallyCrySidebar } from './RallyCrySidebar';
import { CycleHistorySelector } from '@/features/shared/CycleHistorySelector';
import { CycleStateIndicator } from '@/features/weekly-lifecycle/CycleStateIndicator';
import { TransitionActions } from '@/features/weekly-lifecycle/TransitionActions';
import { CarryForwardPanel } from '@/features/weekly-lifecycle/CarryForwardPanel';
import { MyWeekHistorySection } from '@/features/commitment-history/MyWeekHistorySection';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import { SummaryCard } from './SummaryCard';
import { ReconStatusBadge } from './ReconStatusBadge';
import type { CycleState, ReconciliationStatus } from '@/types';

export function MyWeekPage() {
  const { userId: authUserId } = useAuth();
  const [searchParams] = useSearchParams();

  // Support deep-link from Observatory heatmap: /?cycleId=...&userId=...
  // The userId param is informational only (we show the logged-in user's data per cycle).
  const deepLinkCycleId = searchParams.get('cycleId');

  const { data: currentCycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // On first load, apply the deep-linked cycleId if provided
  useEffect(() => {
    if (deepLinkCycleId && selectedCycleId === null) {
      setSelectedCycleId(deepLinkCycleId);
    }
    // Only run on mount (deepLinkCycleId from URL, not reactive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a different cycle is selected via the pill selector, fetch it
  const { data: selectedCycleData } = useCycle(selectedCycleId ?? '');

  // Use the selected cycle if one is picked, otherwise the current cycle
  const cycle = selectedCycleId ? selectedCycleData ?? currentCycle : currentCycle;
  const cycleId = cycle?.id ?? '';
  const cycleState: CycleState = cycle?.state ?? 'DRAFT';

  // Hook is guarded by enabled: Boolean(cycleId) internally — safe to call with empty string
  const { data: allCommitments = [], isLoading: commitmentsLoading } = useCommitments(cycleId);
  const myCommitments = useMemo(
    () => allCommitments.filter((c) => c.userId === authUserId),
    [allCommitments, authUserId],
  );

  const carriedItems = useMemo(
    () => myCommitments.filter((c) => c.carriedFromCommitmentId !== null),
    [myCommitments],
  );

  const shouldFetchRecon = cycleState === 'RECONCILING' || cycleState === 'RECONCILED';
  const {
    data: reconView,
    isLoading: reconLoading,
    refetch: refetchRecon,
  } = useReconciliationView(shouldFetchRecon ? cycleId : '');

  const completeMutation = useCompleteReconciliation(cycleId);

  const { commitmentFormOpen, editingCommitmentId, openCommitmentForm, closeCommitmentForm } =
    useUIStore();

  const deleteMutation = useDeleteCommitment(cycleId);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = useCallback((id: string) => { openCommitmentForm(id); }, [openCommitmentForm]);
  const handleDeleteRequest = useCallback((id: string) => { setDeleteConfirmId(id); }, []);

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    await deleteMutation.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  const reconSummary = reconView?.summary;
  // allReconciled comes from the backend (org-wide gate: every user must be done).
  // The summary is personal-only; using it here would incorrectly block until the whole org reconciles.
  const allReconciled = reconView?.allReconciled ?? false;

  async function handleSubmitReconciliation() {
    if (!allReconciled) return;
    await completeMutation.mutateAsync();
  }

  if (cycleLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  if (cycleError || !cycle) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-on-surface-variant text-body">
          {cycleError instanceof Error
            ? cycleError.message
            : 'Could not load the current cycle. Please try again.'}
        </p>
      </div>
    );
  }

  const isDraft = cycleState === 'DRAFT';

  const reconDetails = reconView?.commitments ?? [];
  const reconStatusMap = new Map<string, ReconciliationStatus | null>();
  for (const detail of reconDetails) {
    reconStatusMap.set(detail.commitment.id, detail.reconciliation?.status ?? null);
  }

  return (
    <>
      <div className="max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8 items-start">

        {/* Main Column */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Cycle state banner */}
          <div className="bg-surface-lowest rounded-sm p-4 flex items-center justify-between gap-4 flex-wrap overflow-hidden">
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <CycleStateIndicator currentState={cycleState} />
              <CycleHistorySelector
                currentCycleId={cycleId}
                onSelect={(id) => {
                  // If selecting the current cycle, clear the override
                  setSelectedCycleId(id === currentCycle?.id ? null : id);
                }}
              />
            </div>
            <TransitionActions
              cycle={cycle}
              commitmentCount={myCommitments.length}
              onStartNextWeek={(newCycleId) => { setSelectedCycleId(newCycleId); }}
            />
          </div>

          {myCommitments.length > 0 && (
            <CommitmentSummaryStrip commitments={myCommitments} />
          )}

          {carriedItems.length > 0 && isDraft && (
            <CarryForwardPanel carriedItems={carriedItems} cycleId={cycleId} />
          )}

          {cycleState === 'DRAFT' && (
            <>
              {commitmentsLoading ? (
                <SkeletonLoader variant="card" count={3} />
              ) : myCommitments.length === 0 ? (
                <EmptyState
                  title="No commitments yet"
                  description="Start by adding your first commitment for this week."
                  action={
                    <Button variant="primary" onClick={() => { openCommitmentForm(); }}>
                      Create your first commitment
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <CommitmentList
                    commitments={myCommitments}
                    cycleState={cycleState}
                    cycleId={cycleId}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                  />
                  <Button
                    variant="dashed"
                    onClick={() => { openCommitmentForm(); }}
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    }
                    className="w-full"
                  >
                    Add commitment
                  </Button>
                </div>
              )}
            </>
          )}

          {cycleState === 'LOCKED' && (
            <>
              {commitmentsLoading ? (
                <SkeletonLoader variant="card" count={3} />
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

          {cycleState === 'RECONCILING' && (
            <>
              {commitmentsLoading || reconLoading ? (
                <SkeletonLoader variant="card" count={3} />
              ) : (
                <div className="flex flex-col gap-6 pb-24">
                  {/* Unplanned work entry — at TOP before planned commitments */}
                  <UnplannedWorkEntry cycleId={cycleId} onAdd={() => { void refetchRecon(); }} />

                  {/* Section header */}
                  <div>
                    <h2 className="font-serif text-3xl tracking-tight text-on-surface font-normal">
                      Planned vs. Actual
                    </h2>
                    <p className="text-body text-on-surface-variant mt-1">
                      Review each commitment and record what happened this week. Click a card to expand.
                    </p>
                  </div>

                  {/* Accordion reconciliation table */}
                  <PlannedVsActualTable
                    commitments={reconView?.commitments ?? []}
                    cycleId={cycleId}
                  />

                  {/* Inline progress warning */}
                  {!allReconciled && (
                    <div className="p-4 rounded-sm bg-warning/10 border border-warning/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body font-medium text-warning">
                          Reconcile all remaining commitments before submitting.
                        </span>
                        <span className="text-small font-bold text-warning tabular-nums">
                          {reconSummary?.reconciledCount ?? 0} of {reconSummary?.totalCommitments ?? 0} reconciled
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning transition-all duration-300"
                          style={{
                            width: `${reconSummary ? (reconSummary.reconciledCount / Math.max(reconSummary.totalCommitments, 1)) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {completeMutation.isError && (
                    <p role="alert" className="text-body text-error">
                      Failed to submit reconciliation. Please try again.
                    </p>
                  )}
                </div>
              )}

              {/* Fixed sticky bottom bar */}
              {!commitmentsLoading && !reconLoading && (
                <ReconciliationBottomBar
                  reconciledCount={reconSummary?.reconciledCount ?? 0}
                  totalCommitments={reconSummary?.totalCommitments ?? 0}
                  allReconciled={allReconciled}
                  onComplete={() => { void handleSubmitReconciliation(); }}
                  loading={completeMutation.isPending}
                />
              )}
            </>
          )}

          {cycleState === 'RECONCILED' && (
            <>
              {commitmentsLoading || reconLoading ? (
                <SkeletonLoader variant="card" count={3} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-sm bg-accent/10 p-4">
                    <p className="text-body font-medium text-accent">
                      You completed {reconSummary?.completedCount ?? 0} of {reconSummary?.totalCommitments ?? myCommitments.length} commitment{(reconSummary?.totalCommitments ?? myCommitments.length) !== 1 ? 's' : ''}.
                      {(reconSummary?.carriedForwardCount ?? 0) > 0 && ` ${reconSummary!.carriedForwardCount} carried forward.`}
                    </p>
                    {reconSummary && reconSummary.totalCommitments > 0 && (
                      <p className="mt-1 text-body text-on-surface-variant">
                        Completion rate: {Math.round(reconSummary.completionRate)}%
                      </p>
                    )}
                  </div>

                  {reconSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <SummaryCard label="Completed" value={reconSummary.completedCount} />
                      <SummaryCard label="Partial" value={reconSummary.partiallyCompletedCount} />
                      <SummaryCard label="Not Started" value={reconSummary.notStartedCount} />
                      <SummaryCard label="Carried" value={reconSummary.carriedForwardCount} />
                    </div>
                  )}

                  <div className="flex flex-col gap-3" aria-label="Reconciled commitments">
                    {myCommitments.map((commitment) => {
                      const status = reconStatusMap.get(commitment.id) ?? commitment.reconciliationStatus;
                      return (
                        <div key={commitment.id} className="bg-surface-lowest rounded-sm p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center">
                              <span className="text-small font-semibold text-on-surface-variant">{commitment.priorityRank}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-body font-medium text-on-surface leading-snug">{commitment.title}</h3>
                              {commitment.rcdoLink.rallyCryId && (
                                <p className="mt-0.5 text-small text-muted truncate">
                                  {commitment.rcdoLink.rallyCryTitle}
                                  {commitment.rcdoLink.definingObjectiveTitle && ` \u203A ${commitment.rcdoLink.definingObjectiveTitle}`}
                                </p>
                              )}
                            </div>
                            {status && <ReconStatusBadge status={status} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <MyWeekHistorySection commitments={myCommitments} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6 sticky top-[120px]">
          <RallyCrySidebar commitments={myCommitments} />
          {(cycleState === 'DRAFT' || cycleState === 'LOCKED') && (
            <CoverageStrip commitments={myCommitments} />
          )}
        </div>
      </div>

      {isDraft && cycleId && (
        <CommitmentForm
          open={commitmentFormOpen}
          {...(editingCommitmentId !== null && { commitmentId: editingCommitmentId })}
          cycleId={cycleId}
          onClose={closeCommitmentForm}
        />
      )}

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
    </>
  );
}

