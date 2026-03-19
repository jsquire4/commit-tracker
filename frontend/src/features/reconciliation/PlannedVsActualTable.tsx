import { useState, useCallback } from 'react';
import type { CommitmentReconciliationDetail, ReconcileCommitmentRequest } from '@/types/reconciliation.types';
import type { ReconciliationStatus } from '@/types/enums';
import type { BulletStatus } from '@/types/reconciliation.types';
import type { Commitment } from '@/types/commitment.types';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
import { ChangeReasonCapture } from './ChangeReasonCapture';
import { DisplacementCapture, type DisplacementValue } from './DisplacementCapture';
import { useReconcileCommitment } from '@/hooks/useReconciliation';

const DISPLACEMENT_STATUSES: ReconciliationStatus[] = [
  'NOT_STARTED',
  'PARTIALLY_COMPLETED',
  'CARRIED_FORWARD',
] as const;

function buildReconcileRequest(
  status: ReconciliationStatus,
  notes: string,
  bulletStatuses: BulletStatus[],
  displacement: DisplacementValue
): ReconcileCommitmentRequest {
  const base: ReconcileCommitmentRequest = {
    status,
    carryForward: status === 'CARRIED_FORWARD',
    bulletStatuses,
  };
  if (notes.trim().length > 0) {
    base.completionNotes = notes;
  }
  if (displacement.category != null) {
    base.displacementCategory = displacement.category;
  }
  if (displacement.detail.trim().length > 0) {
    base.displacementDetail = displacement.detail.trim();
  }
  if (displacement.displacingCommitmentId != null) {
    base.displacingCommitmentId = displacement.displacingCommitmentId;
  }
  return base;
}

interface PlannedVsActualTableProps {
  commitments: CommitmentReconciliationDetail[];
  cycleId: string;
}

const HORIZON_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  MIDDAY: 'Midday',
  AFTERNOON: 'Afternoon',
  EOD: 'End of Day',
  EOW: 'End of Week',
};

interface RowState {
  status: ReconciliationStatus | null;
  notes: string;
  bulletStatuses: Record<string, boolean>;
  displacement: DisplacementValue;
  saving: boolean;
  saveError: string | null;
}

function buildInitialRowState(detail: CommitmentReconciliationDetail): RowState {
  const bulletStatuses: Record<string, boolean> = {};
  for (const bullet of detail.commitment.bullets) {
    bulletStatuses[bullet.id] = bullet.isCompleted;
  }
  return {
    status: detail.reconciliation?.status ?? null,
    notes: detail.reconciliation?.notes ?? '',
    bulletStatuses,
    displacement: {
      category: detail.reconciliation?.displacementCategory ?? null,
      detail: detail.reconciliation?.displacementDetail ?? '',
      displacingCommitmentId: detail.reconciliation?.displacingCommitmentId ?? null,
    },
    saving: false,
    saveError: null,
  };
}

interface CommitmentRowProps {
  detail: CommitmentReconciliationDetail;
  cycleId: string;
  allCommitments: Commitment[];
}

function CommitmentRow({ detail, cycleId, allCommitments }: CommitmentRowProps) {
  const { commitment, reconciliation } = detail;
  const [row, setRow] = useState<RowState>(() => buildInitialRowState(detail));

  const reconcileMutation = useReconcileCommitment(cycleId);

  const buildAndSave = useCallback(
    async (
      status: ReconciliationStatus,
      notes: string,
      bulletStatuses: Record<string, boolean>,
      displacement: DisplacementValue,
      onError?: () => void
    ) => {
      const bulletStatusArray: BulletStatus[] = commitment.bullets.map((b) => ({
        bulletId: b.id,
        done: bulletStatuses[b.id] ?? b.isCompleted,
      }));
      try {
        await reconcileMutation.mutateAsync({
          id: commitment.id,
          req: buildReconcileRequest(status, notes, bulletStatusArray, displacement),
        });
        setRow((prev) => ({ ...prev, saving: false }));
      } catch {
        setRow((prev) => ({ ...prev, saving: false, saveError: 'Save failed. Try again.' }));
        onError?.();
      }
    },
    [commitment, reconcileMutation]
  );

  const handleStatusChange = useCallback(
    async (status: ReconciliationStatus) => {
      setRow((prev) => ({ ...prev, status, saveError: null }));
      // Auto-save if notes aren't required, or if notes are already filled in
      const notesRequired = status !== 'COMPLETED';
      if (!notesRequired || row.notes.trim().length > 0) {
        setRow((prev) => ({ ...prev, status, saving: true, saveError: null }));
        await buildAndSave(status, row.notes, row.bulletStatuses, row.displacement);
      }
    },
    [row, buildAndSave]
  );

  const handleNotesChange = useCallback((notes: string) => {
    setRow((prev) => ({ ...prev, notes }));
  }, []);

  const handleNotesBlur = useCallback(async () => {
    if (!row.status) return;
    // Don't save if notes unchanged
    if (row.notes === (reconciliation?.notes ?? '') && row.status === reconciliation?.status) return;
    // Don't save if notes required but empty
    const notesRequired = row.status !== 'COMPLETED';
    if (notesRequired && row.notes.trim().length === 0) return;

    setRow((prev) => ({ ...prev, saving: true, saveError: null }));
    await buildAndSave(row.status, row.notes, row.bulletStatuses, row.displacement);
  }, [row, reconciliation, buildAndSave]);

  const handleDisplacementChange = useCallback((displacement: DisplacementValue) => {
    setRow((prev) => ({ ...prev, displacement }));
  }, []);

  const handleBulletToggle = useCallback(
    async (bulletId: string, done: boolean) => {
      const nextBulletStatuses = { ...row.bulletStatuses, [bulletId]: done };
      setRow((prev) => ({ ...prev, bulletStatuses: nextBulletStatuses, saving: true, saveError: null }));

      if (!row.status) {
        setRow((prev) => ({ ...prev, saving: false }));
        return;
      }

      await buildAndSave(row.status, row.notes, nextBulletStatuses, row.displacement, () => {
        setRow((prev) => ({
          ...prev,
          bulletStatuses: { ...nextBulletStatuses, [bulletId]: !done },
        }));
      });
    },
    [row, buildAndSave]
  );

  const isReasonRequired = row.status !== null && row.status !== 'COMPLETED';
  const isDisplacementApplicable = row.status !== null && DISPLACEMENT_STATUSES.includes(row.status);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Two-column grid: stacks vertically below 768px */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        {/* LEFT — Planned (read-only) */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
              {commitment.title}
              {commitment.isUnplanned && (
                <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-1.5 py-0.5">
                  Unplanned
                </span>
              )}
            </h4>
            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5">
              {HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon}
            </span>
          </div>

          {/* RCDO */}
          {commitment.rcdoLink.rallyCryId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              RC: <span className="text-gray-700 dark:text-gray-300">{commitment.rcdoLink.rallyCryId}</span>
            </p>
          )}

          {/* Bullets (planned) */}
          {commitment.bullets.length > 0 && (
            <ul className="space-y-1 mt-2">
              {commitment.bullets.map((bullet) => (
                <li key={bullet.id} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" aria-hidden="true" />
                  {bullet.body}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RIGHT — Actual */}
        <div className="p-4 bg-white dark:bg-gray-900">
          <div className="flex flex-col gap-3">
            {/* Status marker */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Reconciliation Status
              </p>
              <CommitmentStatusMarker
                value={row.status}
                onChange={(s) => { void handleStatusChange(s); }}
                disabled={row.saving}
              />
            </div>

            {/* Bullet checkboxes */}
            {commitment.bullets.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Bullet Status
                </p>
                <ul className="space-y-1.5">
                  {commitment.bullets.map((bullet) => (
                    <li key={bullet.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={`bullet-${bullet.id}`}
                        checked={row.bulletStatuses[bullet.id] ?? bullet.isCompleted}
                        onChange={(e) => { void handleBulletToggle(bullet.id, e.target.checked); }}
                        disabled={row.saving}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label
                        htmlFor={`bullet-${bullet.id}`}
                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-snug"
                      >
                        {bullet.body}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes — always visible when a status is selected, auto-saves on blur */}
            {row.status !== null && (
              <ChangeReasonCapture
                value={row.notes}
                onChange={handleNotesChange}
                onBlur={() => { void handleNotesBlur(); }}
                required={isReasonRequired}
                disabled={row.saving}
                {...(row.status === 'PARTIALLY_COMPLETED' || row.status === 'NOT_STARTED'
                  ? { placeholder: "Why didn't this complete? This information helps leadership understand blockers." }
                  : {})}
              />
            )}

            {/* Displacement — only for NOT_STARTED, PARTIALLY_COMPLETED, CARRIED_FORWARD */}
            {isDisplacementApplicable && (
              <DisplacementCapture
                value={row.displacement}
                onChange={handleDisplacementChange}
                cycleCommitments={allCommitments}
                currentCommitmentCreatedAt={commitment.createdAt}
                disabled={row.saving}
              />
            )}

            {/* Error */}
            {row.saveError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {row.saveError}
              </p>
            )}

            {/* Saving indicator */}
            {row.saving && !row.saveError && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Saving…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlannedVsActualTable({ commitments, cycleId }: PlannedVsActualTableProps) {
  if (commitments.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No commitments to reconcile.</p>
    );
  }

  const allCommitments = commitments.map((d) => d.commitment);

  return (
    <div className="flex flex-col gap-4">
      {commitments.map((detail) => (
        <CommitmentRow
          key={detail.commitment.id}
          detail={detail}
          cycleId={cycleId}
          allCommitments={allCommitments}
        />
      ))}
    </div>
  );
}
