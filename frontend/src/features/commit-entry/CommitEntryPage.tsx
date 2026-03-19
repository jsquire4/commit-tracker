import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments, useDeleteCommitment } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useUIStore } from '@/stores/ui.store';
import { CommitmentList } from './CommitmentList';
import { CommitmentForm } from './CommitmentForm';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CycleState, Commitment, ReconciliationStatus } from '@/types';

const CYCLE_STATE_LABELS: Record<CycleState, string> = {
  DRAFT: 'Draft',
  LOCKED: 'Locked',
  RECONCILING: 'Reconciling',
  RECONCILED: 'Reconciled',
};

const CYCLE_STATE_VARIANTS: Record<CycleState, 'blue' | 'yellow' | 'red' | 'green' | 'gray'> = {
  DRAFT: 'blue',
  LOCKED: 'yellow',
  RECONCILING: 'red',
  RECONCILED: 'green',
};

const CYCLE_STATE_MESSAGES: Record<CycleState, string> = {
  DRAFT: 'Create your commitments for this week. Link them to rally cries.',
  LOCKED: 'Commitments locked. Reconciliation opens when the week ends.',
  RECONCILING: 'Time to reconcile — how did your week go?',
  RECONCILED: 'This week is complete.',
};

const RECONCILIATION_INDICATOR: Record<ReconciliationStatus, { color: string; label: string }> = {
  COMPLETED: { color: 'bg-green-500', label: 'Completed' },
  PARTIALLY_COMPLETED: { color: 'bg-amber-500', label: 'Partial' },
  NOT_STARTED: { color: 'bg-gray-400', label: 'Not started' },
  CARRIED_FORWARD: { color: 'bg-blue-500', label: 'Carried forward' },
};

// Deterministic color palette for rally cry pills
const RALLY_CRY_COLORS = [
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
];

function useCarriedForwardItems(commitments: Commitment[]) {
  return useMemo(
    () => commitments.filter((c) => c.carriedFromCommitmentId !== null),
    [commitments]
  );
}

function useRallyCryCoverage(commitments: Commitment[]) {
  return useMemo(() => {
    const linked = commitments.filter((c) => c.rcdoLink.rallyCryId !== null);
    const uniqueRallyCries = new Map<string, string>();
    for (const c of linked) {
      if (c.rcdoLink.rallyCryId && c.rcdoLink.rallyCryTitle) {
        uniqueRallyCries.set(c.rcdoLink.rallyCryId, c.rcdoLink.rallyCryTitle);
      }
    }
    return {
      linkedCount: linked.length,
      totalCount: commitments.length,
      rallyCries: Array.from(uniqueRallyCries, ([id, title]) => ({ id, title })),
    };
  }, [commitments]);
}

function useReconciledSummary(commitments: Commitment[]) {
  return useMemo(() => {
    const completed = commitments.filter((c) => c.reconciliationStatus === 'COMPLETED').length;
    const carried = commitments.filter((c) => c.reconciliationStatus === 'CARRIED_FORWARD').length;
    return { completed, carried, total: commitments.length };
  }, [commitments]);
}

export function CommitEntryPage() {
  const { data: cycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();

  const cycleId = cycle?.id ?? '';
  const cycleState = cycle?.state ?? 'DRAFT';
  const isDraft = cycleState === 'DRAFT';

  const { data: commitments = [], isLoading: commitmentsLoading } = useCommitments(cycleId);
  const { data: rcdoTree } = useRcdoTree();

  const { commitmentFormOpen, editingCommitmentId, openCommitmentForm, closeCommitmentForm } =
    useUIStore();

  const deleteMutation = useDeleteCommitment(cycleId);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const carriedItems = useCarriedForwardItems(commitments);
  const rallyCoverage = useRallyCryCoverage(commitments);
  const reconSummary = useReconciledSummary(commitments);

  // Build rally cry color map from the RCDO tree for consistent ordering
  const rallyCryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (rcdoTree?.rallyCries) {
      rcdoTree.rallyCries.forEach((rc, i) => {
        map.set(rc.id, RALLY_CRY_COLORS[i % RALLY_CRY_COLORS.length] ?? RALLY_CRY_COLORS[0]!);
      });
    }
    return map;
  }, [rcdoTree]);

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

  // Loading state
  if (cycleLoading) {
    return <LoadingSpinner fullPage label="Loading current cycle..." />;
  }

  // Error state
  if (cycleError || !cycle) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {cycleError instanceof Error
              ? cycleError.message
              : 'Could not load the current cycle. Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* --- Page Header --- */}
      <PageHeader
        title="My Week"
        subtitle={`${cycle.label} · ${new Date(cycle.startsAt).toLocaleDateString()} – ${new Date(cycle.endsAt).toLocaleDateString()}`}
        badge={
          <Badge variant={CYCLE_STATE_VARIANTS[cycleState]}>
            {CYCLE_STATE_LABELS[cycleState]}
          </Badge>
        }
        actions={
          <div className="relative group">
            <button
              type="button"
              disabled={!isDraft}
              onClick={() => { openCommitmentForm(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={!isDraft ? 'Commitments can only be added in Draft state' : 'Add commitment'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Commitment
            </button>
            {!isDraft && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-md bg-gray-800 text-white text-xs py-1.5 px-2.5 hidden group-hover:block z-10">
                Commitments can only be added when the cycle is in Draft state.
              </div>
            )}
          </div>
        }
      />

      {/* --- Cycle State Context Message --- */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
        <span>{CYCLE_STATE_MESSAGES[cycleState]}</span>
        {cycleState === 'RECONCILING' && (
          <Link
            to="/reconciliation"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
          >
            Go to reconciliation
          </Link>
        )}
      </div>

      {/* --- Carry-Forward Banner --- */}
      {carriedItems.length > 0 && (
        <div className="mb-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {carriedItems.length} {carriedItems.length === 1 ? 'item' : 'items'} carried from last week
          </p>
          <ul className="mt-1 space-y-0.5">
            {carriedItems.map((item) => (
              <li key={item.id} className="text-sm text-amber-700 dark:text-amber-400">
                &bull; {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Rally Cry Coverage Indicator --- */}
      {commitments.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            {rallyCoverage.linkedCount} of {rallyCoverage.totalCount}{' '}
            {rallyCoverage.totalCount === 1 ? 'commitment' : 'commitments'} linked to a rally cry
          </span>
          {rallyCoverage.rallyCries.map((rc) => (
            <span
              key={rc.id}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                rallyCryColorMap.get(rc.id) ?? RALLY_CRY_COLORS[0]
              }`}
            >
              {rc.title}
            </span>
          ))}
        </div>
      )}

      {/* --- Reconciled Week Summary --- */}
      {cycleState === 'RECONCILED' && commitments.length > 0 && (
        <div className="mb-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-green-800 dark:text-green-300">
              You completed {reconSummary.completed} of {reconSummary.total}{' '}
              {reconSummary.total === 1 ? 'commitment' : 'commitments'}
            </span>
            {reconSummary.carried > 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                {reconSummary.carried} carried forward
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1">
            {commitments.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                {c.reconciliationStatus && (
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      RECONCILIATION_INDICATOR[c.reconciliationStatus].color
                    }`}
                    title={RECONCILIATION_INDICATOR[c.reconciliationStatus].label}
                    aria-label={RECONCILIATION_INDICATOR[c.reconciliationStatus].label}
                  />
                )}
                <span>{c.title}</span>
                {c.reconciliationStatus && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({RECONCILIATION_INDICATOR[c.reconciliationStatus].label})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Commitment List --- */}
      {commitmentsLoading ? (
        <LoadingSpinner label="Loading commitments..." />
      ) : commitments.length === 0 ? (
        <EmptyState
          title="No commitments yet"
          description="Start by adding your first commitment for this week."
          action={
            isDraft ? (
              <button
                type="button"
                onClick={() => { openCommitmentForm(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create your first commitment
              </button>
            ) : undefined
          }
        />
      ) : (
        <CommitmentList
          commitments={commitments}
          cycleState={cycleState}
          cycleId={cycleId}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      )}

      {/* Commitment form slide-over */}
      {cycleId && (
        <CommitmentForm
          open={commitmentFormOpen}
          {...(editingCommitmentId !== null && { commitmentId: editingCommitmentId })}
          cycleId={cycleId}
          onClose={closeCommitmentForm}
        />
      )}

      {/* Delete confirmation dialog */}
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
