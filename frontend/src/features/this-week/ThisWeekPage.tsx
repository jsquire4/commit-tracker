import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments, useDeleteCommitment } from '@/hooks/useCommitments';
import { useReconciliationView } from '@/hooks/useReconciliation';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';
import { CommitmentList } from '@/features/commit-entry/CommitmentList';
import { CommitmentForm } from '@/features/commit-entry/CommitmentForm';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CycleState, ReconciliationStatus, Commitment } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CYCLE_STATE_LABELS: Record<CycleState, string> = {
  DRAFT: 'Draft',
  LOCKED: 'Locked',
  RECONCILING: 'Reconciling',
  RECONCILED: 'Reconciled',
};

const CYCLE_STATE_VARIANTS: Record<CycleState, 'blue' | 'yellow' | 'red' | 'green'> = {
  DRAFT: 'blue',
  LOCKED: 'yellow',
  RECONCILING: 'red',
  RECONCILED: 'green',
};

const CYCLE_STATE_MESSAGES: Record<CycleState, string> = {
  DRAFT: 'Create your commitments for this week',
  LOCKED: 'This week\u2019s commitments are locked',
  RECONCILING: 'Time to reconcile \u2014 how did your week go?',
  RECONCILED: 'Week complete. Here\u2019s your summary.',
};

const RECON_STATUS_STYLE: Record<ReconciliationStatus, { icon: string; color: string; label: string }> = {
  COMPLETED: { icon: '\u2713', color: 'text-green-500', label: 'Completed' },
  PARTIALLY_COMPLETED: { icon: '\u25D1', color: 'text-amber-500', label: 'Partial' },
  NOT_STARTED: { icon: '\u2717', color: 'text-red-500', label: 'Not Started' },
  CARRIED_FORWARD: { icon: '\u21B3', color: 'text-gray-400', label: 'Carried Forward' },
};

// ---------------------------------------------------------------------------
// ThisWeekPage
// ---------------------------------------------------------------------------

export function ThisWeekPage() {
  const { userId } = useAuth();

  // Cycle data
  const { data: cycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();

  const cycleId = cycle?.id ?? '';
  const cycleState: CycleState = cycle?.state ?? 'DRAFT';

  // Commitments filtered to the current user
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

  // Reconciliation data (only fetched when RECONCILING or RECONCILED)
  const shouldFetchRecon = cycleState === 'RECONCILING' || cycleState === 'RECONCILED';
  const { data: reconView, isLoading: reconLoading } = useReconciliationView(
    shouldFetchRecon ? cycleId : '',
  );

  // UI store for commitment form
  const { commitmentFormOpen, editingCommitmentId, openCommitmentForm, closeCommitmentForm } =
    useUIStore();

  // Delete flow
  const deleteMutation = useDeleteCommitment(cycleId);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function handleEdit(id: string) {
    openCommitmentForm(id);
  }

  function handleDeleteRequest(id: string) {
    setDeleteConfirmId(id);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    await deleteMutation.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  }

  // ---- Loading ----
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

  return (
    <div className="flex flex-col gap-6">
      {/* ================================================================ */}
      {/* Section A: Cycle Status Bar                                      */}
      {/* ================================================================ */}
      <CycleStatusBar
        label={cycle.label}
        startsAt={cycle.startsAt}
        endsAt={cycle.endsAt}
        state={cycleState}
      />

      {/* ================================================================ */}
      {/* Section B: Content (state-dependent)                             */}
      {/* ================================================================ */}

      {/* DRAFT — full edit mode */}
      {cycleState === 'DRAFT' && (
        <DraftContent
          commitments={myCommitments}
          commitmentsLoading={commitmentsLoading}
          cycleId={cycleId}
          cycleState={cycleState}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onAdd={() => { openCommitmentForm(); }}
        />
      )}

      {/* LOCKED — read-only list */}
      {cycleState === 'LOCKED' && (
        <LockedContent
          commitments={myCommitments}
          commitmentsLoading={commitmentsLoading}
          cycleId={cycleId}
          cycleState={cycleState}
        />
      )}

      {/* RECONCILING — commitments with link to reconciliation */}
      {cycleState === 'RECONCILING' && (
        <ReconcilingContent
          commitments={myCommitments}
          commitmentsLoading={commitmentsLoading}
          cycleId={cycleId}
          cycleState={cycleState}
          reconView={reconView ?? null}
          reconLoading={reconLoading}
        />
      )}

      {/* RECONCILED — summary view */}
      {cycleState === 'RECONCILED' && (
        <ReconciledContent
          commitments={myCommitments}
          commitmentsLoading={commitmentsLoading}
          reconView={reconView ?? null}
          reconLoading={reconLoading}
        />
      )}

      {/* ================================================================ */}
      {/* Section C: Carry-Forward Notice                                  */}
      {/* ================================================================ */}
      {carriedItems.length > 0 && (
        <CarryForwardNotice items={carriedItems} />
      )}

      {/* ---- Slide-over form (DRAFT only) ---- */}
      {isDraft && cycleId && (
        <CommitmentForm
          open={commitmentFormOpen}
          {...(editingCommitmentId !== null && { commitmentId: editingCommitmentId })}
          cycleId={cycleId}
          onClose={closeCommitmentForm}
        />
      )}

      {/* ---- Delete confirmation ---- */}
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

// ---------------------------------------------------------------------------
// Section A: Cycle Status Bar
// ---------------------------------------------------------------------------

interface CycleStatusBarProps {
  label: string;
  startsAt: string;
  endsAt: string;
  state: CycleState;
}

function CycleStatusBar({ label, startsAt, endsAt, state }: CycleStatusBarProps) {
  const accentColors: Record<CycleState, string> = {
    DRAFT: 'border-blue-500',
    LOCKED: 'border-yellow-500',
    RECONCILING: 'border-red-500',
    RECONCILED: 'border-green-500',
  };

  return (
    <div
      className={`rounded-lg border-l-4 ${accentColors[state]} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{label}</h1>
          <Badge variant={CYCLE_STATE_VARIANTS[state]}>
            {CYCLE_STATE_LABELS[state]}
          </Badge>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(startsAt).toLocaleDateString()} &ndash; {new Date(endsAt).toLocaleDateString()}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {CYCLE_STATE_MESSAGES[state]}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section B variants
// ---------------------------------------------------------------------------

interface ContentProps {
  commitments: Commitment[];
  commitmentsLoading: boolean;
  cycleId: string;
  cycleState: CycleState;
}

// ---- DRAFT ----

interface DraftContentProps extends ContentProps {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function DraftContent({
  commitments,
  commitmentsLoading,
  cycleId,
  cycleState,
  onEdit,
  onDelete,
  onAdd,
}: DraftContentProps) {
  if (commitmentsLoading) {
    return <LoadingSpinner label="Loading commitments..." />;
  }

  if (commitments.length === 0) {
    return (
      <EmptyState
        title="No commitments yet"
        description="Start by adding your first commitment for this week."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create your first commitment
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Commitment
        </button>
      </div>

      <CommitmentList
        commitments={commitments}
        cycleState={cycleState}
        cycleId={cycleId}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

// ---- LOCKED ----

function LockedContent({ commitments, commitmentsLoading, cycleId, cycleState }: ContentProps) {
  if (commitmentsLoading) {
    return <LoadingSpinner label="Loading commitments..." />;
  }

  if (commitments.length === 0) {
    return (
      <EmptyState
        title="No commitments"
        description="No commitments were created for this cycle."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Commitments locked. Reconciliation will open when the week ends.
        </p>
      </div>

      <CommitmentList
        commitments={commitments}
        cycleState={cycleState}
        cycleId={cycleId}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}

// ---- RECONCILING ----

interface ReconcilingContentProps extends ContentProps {
  reconView: import('@/types').ReconciliationViewResponse | null;
  reconLoading: boolean;
}

function ReconcilingContent({
  commitments,
  commitmentsLoading,
  cycleId,
  cycleState,
  reconView,
  reconLoading,
}: ReconcilingContentProps) {
  if (commitmentsLoading || reconLoading) {
    return <LoadingSpinner label="Loading reconciliation data..." />;
  }

  const summary = reconView?.summary;
  const reconDetails = reconView?.commitments ?? [];

  // Build a lookup: commitmentId -> reconciliation status
  const reconStatusMap = new Map<string, ReconciliationStatus | null>();
  for (const detail of reconDetails) {
    reconStatusMap.set(detail.commitment.id, detail.reconciliation?.status ?? null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress indicator */}
      {summary && (
        <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {summary.reconciledCount} of {summary.totalCommitments} commitments reconciled
          </span>
          <Link
            to={`/reconciliation/${cycleId}`}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open full reconciliation &rarr;
          </Link>
        </div>
      )}

      {/* Commitment cards with inline recon status */}
      <div className="space-y-3" aria-label="Commitment list">
        {commitments.map((commitment) => {
          const status = reconStatusMap.get(commitment.id) ?? commitment.reconciliationStatus;
          return (
            <div key={commitment.id} className="relative">
              <CommitmentCardWithStatus commitment={commitment} cycleState={cycleState} status={status} />
            </div>
          );
        })}
      </div>

      {/* Link to full reconciliation page */}
      <div className="flex justify-center pt-2">
        <Link
          to={`/reconciliation/${cycleId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Continue Reconciliation
        </Link>
      </div>
    </div>
  );
}

// ---- RECONCILED ----

interface ReconciledContentProps {
  commitments: Commitment[];
  commitmentsLoading: boolean;
  reconView: import('@/types').ReconciliationViewResponse | null;
  reconLoading: boolean;
}

function ReconciledContent({
  commitments,
  commitmentsLoading,
  reconView,
  reconLoading,
}: ReconciledContentProps) {
  if (commitmentsLoading || reconLoading) {
    return <LoadingSpinner label="Loading summary..." />;
  }

  const summary = reconView?.summary;
  const reconDetails = reconView?.commitments ?? [];

  // Status lookup
  const reconStatusMap = new Map<string, ReconciliationStatus | null>();
  const displacementMap = new Map<string, { category: string | null; detail: string | null }>();

  for (const detail of reconDetails) {
    reconStatusMap.set(detail.commitment.id, detail.reconciliation?.status ?? null);
    if (detail.reconciliation?.displacementCategory) {
      displacementMap.set(detail.commitment.id, {
        category: detail.reconciliation.displacementCategory,
        detail: detail.reconciliation.displacementDetail,
      });
    }
  }

  const completedCount = summary?.completedCount ?? 0;
  const totalCount = summary?.totalCommitments ?? commitments.length;
  const carriedCount = summary?.carriedForwardCount ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary banner */}
      <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
        <p className="text-sm font-medium text-green-800 dark:text-green-300">
          You completed {completedCount} of {totalCount} commitment{totalCount !== 1 ? 's' : ''}.
          {carriedCount > 0 && ` ${String(carriedCount)} carried forward.`}
        </p>
        {summary && summary.totalCommitments > 0 && (
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            Completion rate: {Math.round(summary.completionRate * 100)}% &middot;
            Bullet completion: {Math.round(summary.bulletCompletionRate * 100)}%
          </p>
        )}
      </div>

      {/* Summary stats grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Completed" value={summary.completedCount} colorClass="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30" />
          <SummaryCard label="Partial" value={summary.partiallyCompletedCount} colorClass="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" />
          <SummaryCard label="Not Started" value={summary.notStartedCount} colorClass="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30" />
          <SummaryCard label="Carried Forward" value={summary.carriedForwardCount} colorClass="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" />
        </div>
      )}

      {/* Commitments with inline recon status */}
      <div className="space-y-3" aria-label="Commitment list">
        {commitments.map((commitment) => {
          const status = reconStatusMap.get(commitment.id) ?? commitment.reconciliationStatus;
          return (
            <CommitmentCardWithStatus
              key={commitment.id}
              commitment={commitment}
              cycleState="RECONCILED"
              status={status}
            />
          );
        })}
      </div>

      {/* Displacement reasons (grouped) */}
      {displacementMap.size > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Displacement Reasons
          </h3>
          <ul className="space-y-2">
            {Array.from(displacementMap.entries()).map(([commitmentId, d]) => {
              const c = commitments.find((cm) => cm.id === commitmentId);
              return (
                <li key={commitmentId} className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {c?.title ?? commitmentId}
                  </span>
                  {' \u2014 '}
                  {d.category}{d.detail ? `: ${d.detail}` : ''}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section C: Carry-Forward Notice
// ---------------------------------------------------------------------------

interface CarryForwardNoticeProps {
  items: Commitment[];
}

function CarryForwardNotice({ items }: CarryForwardNoticeProps) {
  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
        {items.length} item{items.length !== 1 ? 's' : ''} carried from last week
      </h3>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <span className="text-blue-400 dark:text-blue-600">&bull;</span>
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: Commitment card with reconciliation status overlay
// ---------------------------------------------------------------------------

interface CommitmentCardWithStatusProps {
  commitment: Commitment;
  cycleState: CycleState;
  status: ReconciliationStatus | null;
}

function CommitmentCardWithStatus({ commitment, status }: CommitmentCardWithStatusProps) {
  const statusInfo = status ? RECON_STATUS_STYLE[status] : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Priority rank */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{commitment.priorityRank}</span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{commitment.title}</h3>

            {/* RCDO breadcrumb */}
            {commitment.rcdoLink.rallyCryId && (
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">
                {commitment.rcdoLink.rallyCryTitle ?? commitment.rcdoLink.rallyCryId}
                {commitment.rcdoLink.definingObjectiveId && ` \u203A ${commitment.rcdoLink.definingObjectiveTitle ?? commitment.rcdoLink.definingObjectiveId}`}
                {commitment.rcdoLink.outcomeId && ` \u203A ${commitment.rcdoLink.outcomeTitle ?? commitment.rcdoLink.outcomeId}`}
              </p>
            )}

            {/* Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {commitment.isUnplanned && <Badge variant="gray">Unplanned</Badge>}
              {commitment.carriedFromCommitmentId && <Badge variant="blue">Carried Forward</Badge>}
            </div>

            {/* Bullet summary */}
            {commitment.bullets.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {commitment.bullets.filter((b) => b.isCompleted).length}/{commitment.bullets.length} bullets completed
              </div>
            )}
          </div>

          {/* Reconciliation status indicator */}
          {statusInfo && (
            <div className={`flex-shrink-0 flex items-center gap-1.5 ${statusInfo.color}`}>
              <span className="text-lg leading-none" aria-hidden="true">{statusInfo.icon}</span>
              <span className="text-xs font-medium">{statusInfo.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: Summary stat card
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: number;
  colorClass: string;
}

function SummaryCard({ label, value, colorClass }: SummaryCardProps) {
  return (
    <div className={`rounded-lg p-3 ${colorClass}`}>
      <dt className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</dt>
      <dd className="text-2xl font-bold mt-0.5">{value}</dd>
    </div>
  );
}
