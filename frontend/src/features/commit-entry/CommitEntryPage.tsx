import { useState } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments, useDeleteCommitment } from '@/hooks/useCommitments';
import { useUIStore } from '@/stores/ui.store';
import { CommitmentList } from './CommitmentList';
import { CommitmentForm } from './CommitmentForm';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CycleState } from '@/types';

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

export function CommitEntryPage() {
  const { data: cycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();

  const cycleId = cycle?.id ?? '';
  const cycleState = cycle?.state ?? 'DRAFT';
  const isDraft = cycleState === 'DRAFT';

  const { data: commitments = [], isLoading: commitmentsLoading } = useCommitments(cycleId);

  const { commitmentFormOpen, editingCommitmentId, openCommitmentForm, closeCommitmentForm } =
    useUIStore();

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

  // Loading state
  if (cycleLoading) {
    return <LoadingSpinner fullPage label="Loading current cycle..." />;
  }

  // Error state
  if (cycleError || !cycle) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-gray-500 text-sm">
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
      <PageHeader
        title={cycle.label}
        subtitle={`${new Date(cycle.startsAt).toLocaleDateString()} – ${new Date(cycle.endsAt).toLocaleDateString()}`}
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
              onClick={() => openCommitmentForm()}
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
                onClick={() => openCommitmentForm()}
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
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
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
