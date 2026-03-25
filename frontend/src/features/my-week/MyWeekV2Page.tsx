import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments, useDeleteCommitment } from '@/hooks/useCommitments';
import { useReconciliationView, useCompleteReconciliation } from '@/hooks/useReconciliation';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';
import { useGrowthAreas } from '@/hooks/useGrowthAreas';
import { useDateRange } from '@/hooks/useDateRange';
import { useTransitionKey } from '@/hooks/useTransitionKey';
import { CommitmentList } from '@/features/commit-entry/CommitmentList';
import { CommitmentFormV2 } from '@/features/commit-entry/CommitmentFormV2';
import { PlannedVsActualTable } from '@/features/reconciliation/PlannedVsActualTable';
import { UnplannedWorkEntry } from '@/features/reconciliation/UnplannedWorkEntry';
import { ReconciliationBottomBarV2 } from '@/features/reconciliation/ReconciliationBottomBarV2';
import { PersonalReflectionStep } from '@/features/reconciliation/PersonalReflectionStep';
import { WeekCloseSummaryScreen } from '@/features/reconciliation/WeekCloseSummaryScreen';
import { WeekSummaryStrip, WeekSummaryStripSkeleton } from './WeekSummaryStrip';
import { RallyCrySidebar } from './RallyCrySidebar';
import { CoverageStrip } from './CoverageStrip';
import { CycleStateIndicator } from '@/features/weekly-lifecycle/CycleStateIndicator';
import { TransitionActions } from '@/features/weekly-lifecycle/TransitionActions';
import { CarryForwardPanel } from '@/features/weekly-lifecycle/CarryForwardPanel';
import { RollingWorkHistory } from '@/features/commitment-history/RollingWorkHistory';
import { GrowthAreaManager } from '@/features/growth-areas/GrowthAreaManager';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import { SummaryCard } from './SummaryCard';
import { ReconStatusBadge } from './ReconStatusBadge';
import type { CycleState, ReconciliationStatus } from '@/types';

export function MyWeekV2Page() {
  const { userId: authUserId } = useAuth();
  const [searchParams] = useSearchParams();
  const { transitionClass } = useTransitionKey();

  // Global date range from Zustand — drives which cycle is active
  const { activeCycle, setFilters, cycles } = useDateRange();

  // Fallback to current cycle when global range hasn't resolved a cycle yet
  const { data: currentCycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();

  // Support deep-link from Observatory heatmap: /?cycleId=...&userId=...
  const deepLinkCycleId = searchParams.get('cycleId');
  useEffect(() => {
    if (deepLinkCycleId && cycles.length > 0) {
      const target = cycles.find((c) => c.id === deepLinkCycleId);
      if (target) {
        setFilters({ cycleWeekStart: target.startsAt, cycleWeekEnd: target.endsAt });
      }
    }
    // Only run when deep-link param or cycles change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkCycleId, cycles.length]);

  const cycle = activeCycle ?? currentCycle;
  const cycleId = cycle?.id ?? '';
  const cycleState: CycleState = cycle?.state ?? 'DRAFT';

  const { data: allCommitments = [], isLoading: commitmentsLoading } = useCommitments(cycleId);
  const myCommitments = useMemo(
    () => allCommitments.filter((c) => c.userId === authUserId),
    [allCommitments, authUserId],
  );

  const { data: growthAreas = [], isLoading: growthAreasLoading } = useGrowthAreas();

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

  type PostReconPhase = 'idle' | 'reflection' | 'summary';
  const [postReconPhase, setPostReconPhase] = useState<PostReconPhase>('idle');

  const { commitmentFormOpen, editingCommitmentId, openCommitmentForm, closeCommitmentForm } =
    useUIStore();

  const deleteMutation = useDeleteCommitment(cycleId);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = useCallback(
    (id: string) => {
      openCommitmentForm(id);
    },
    [openCommitmentForm],
  );
  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    await deleteMutation.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  const reconSummary = reconView?.summary;
  const allReconciled = reconView?.allReconciled ?? false;

  async function handleSubmitReconciliation() {
    if (!allReconciled) return;
    await completeMutation.mutateAsync();
    setPostReconPhase('reflection');
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
      <div className={`max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8 items-start ${transitionClass}`}>

        {/* Main Column */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Cycle state banner */}
          <div className="bg-surface-lowest rounded-sm p-4 flex items-center justify-between gap-4 flex-wrap overflow-hidden">
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <CycleStateIndicator currentState={cycleState} />
            </div>
            <TransitionActions
              cycle={cycle}
              commitmentCount={myCommitments.length}
              onStartNextWeek={(newCycleId) => {
                const newCycle = cycles.find((c) => c.id === newCycleId);
                if (newCycle) {
                  setFilters({ cycleWeekStart: newCycle.startsAt, cycleWeekEnd: newCycle.endsAt });
                }
              }}
            />
          </div>

          {/* Week Summary Strip — personal planning dashboard */}
          {commitmentsLoading || growthAreasLoading ? (
            <WeekSummaryStripSkeleton />
          ) : (
            <WeekSummaryStrip
              commitments={myCommitments}
              growthAreas={growthAreas}
              cycleId={cycleId || undefined}
            />
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
                  title="Your week is open"
                  description="What are you working on this week?"
                  action={
                    <Button
                      variant="primary"
                      onClick={() => {
                        openCommitmentForm();
                      }}
                    >
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
                    onClick={() => {
                      openCommitmentForm();
                    }}
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v16m8-8H4"
                        />
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
                  <UnplannedWorkEntry
                    cycleId={cycleId}
                    onAdd={() => {
                      void refetchRecon();
                    }}
                  />

                  {/* Section header */}
                  <div>
                    <h2 className="font-serif text-3xl tracking-tight text-on-surface font-normal">
                      How did your week go?
                    </h2>
                    <p className="text-body text-on-surface-variant mt-1">
                      Tap each commitment to mark how it went — it takes less than a minute.
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
                          {reconSummary?.reconciledCount ?? 0} of{' '}
                          {reconSummary?.totalCommitments ?? 0} reconciled
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning transition-all duration-300"
                          style={{
                            width: `${
                              reconSummary
                                ? (reconSummary.reconciledCount /
                                    Math.max(reconSummary.totalCommitments, 1)) *
                                  100
                                : 0
                            }%`,
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
                <ReconciliationBottomBarV2
                  reconciledCount={reconSummary?.reconciledCount ?? 0}
                  totalCommitments={reconSummary?.totalCommitments ?? 0}
                  allReconciled={allReconciled}
                  onComplete={() => {
                    void handleSubmitReconciliation();
                  }}
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
                      You completed {reconSummary?.completedCount ?? 0} of{' '}
                      {reconSummary?.totalCommitments ?? myCommitments.length} commitment
                      {(reconSummary?.totalCommitments ?? myCommitments.length) !== 1 ? 's' : ''}.
                      {(reconSummary?.carriedForwardCount ?? 0) > 0 &&
                        ` ${reconSummary!.carriedForwardCount} carried forward.`}
                    </p>
                    {reconSummary && reconSummary.totalCommitments > 0 && (
                      <p className="mt-1 text-body text-on-surface-variant">
                        Completion rate: {Math.round(reconSummary.completionRate)}%
                      </p>
                    )}
                    <p className="mt-2 text-body text-on-surface-variant">
                      Your story was updated.{' '}
                      <Link to="/my-story" className="text-accent hover:underline">View My Story →</Link>
                    </p>
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
                      const status =
                        reconStatusMap.get(commitment.id) ?? commitment.reconciliationStatus;
                      return (
                        <div key={commitment.id} className="bg-surface-lowest rounded-sm p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center">
                              <span className="text-small font-semibold text-on-surface-variant">
                                {commitment.priorityRank}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-body font-medium text-on-surface leading-snug">
                                {commitment.title}
                              </h3>
                              {commitment.rcdoLink.rallyCryId && (
                                <p className="mt-0.5 text-small text-muted truncate">
                                  {commitment.rcdoLink.rallyCryTitle}
                                  {commitment.rcdoLink.definingObjectiveTitle &&
                                    ` \u203A ${commitment.rcdoLink.definingObjectiveTitle}`}
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

          <RollingWorkHistory />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6 sticky top-[120px]">
          <RallyCrySidebar commitments={myCommitments} />
          {(cycleState === 'DRAFT' || cycleState === 'LOCKED') && (
            <CoverageStrip commitments={myCommitments} />
          )}
          {/* Growth Area Manager — always visible so ICs can manage areas at any cycle state */}
          <GrowthAreaManager />
        </div>
      </div>

      {isDraft && cycleId && (
        <CommitmentFormV2
          open={commitmentFormOpen}
          {...(editingCommitmentId !== null && { commitmentId: editingCommitmentId })}
          cycleId={cycleId}
          onClose={closeCommitmentForm}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => {
          setDeleteConfirmId(null);
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        title="Delete Commitment"
        description="Are you sure you want to delete this commitment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      {/* Post-reconciliation shutdown ritual */}
      {postReconPhase === 'reflection' && cycleId && (
        <PersonalReflectionStep
          cycleId={cycleId}
          onComplete={() => {
            setPostReconPhase('summary');
          }}
        />
      )}

      {postReconPhase === 'summary' && cycleId && (
        <WeekCloseSummaryScreen
          cycleId={cycleId}
          onDone={() => {
            setPostReconPhase('idle');
            void refetchRecon();
          }}
        />
      )}
    </>
  );
}
