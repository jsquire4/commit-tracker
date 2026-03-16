import { useState, useCallback } from 'react';
import type { CommitmentReconciliationDetail, ReconcileCommitmentRequest } from '@/types/reconciliation.types';
import type { ReconciliationStatus } from '@/types/enums';
import type { BulletStatus } from '@/types/reconciliation.types';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
import { ChangeReasonCapture } from './ChangeReasonCapture';
import { useReconcileCommitment } from '@/hooks/useReconciliation';

function buildReconcileRequest(
  status: ReconciliationStatus,
  notes: string,
  bulletStatuses: BulletStatus[]
): ReconcileCommitmentRequest {
  const base: ReconcileCommitmentRequest = {
    status,
    carryForward: status === 'CARRIED_FORWARD',
    bulletStatuses,
  };
  if (notes.trim().length > 0) {
    return { ...base, completionNotes: notes };
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
    saving: false,
    saveError: null,
  };
}

interface CommitmentRowProps {
  detail: CommitmentReconciliationDetail;
  cycleId: string;
}

function CommitmentRow({ detail, cycleId }: CommitmentRowProps) {
  const { commitment, reconciliation } = detail;
  const [row, setRow] = useState<RowState>(() => buildInitialRowState(detail));

  const reconcileMutation = useReconcileCommitment(cycleId);

  const buildAndSave = useCallback(
    async (
      status: ReconciliationStatus,
      notes: string,
      bulletStatuses: Record<string, boolean>,
      onError?: () => void
    ) => {
      const bulletStatusArray: BulletStatus[] = commitment.bullets.map((b) => ({
        bulletId: b.id,
        done: bulletStatuses[b.id] ?? b.isCompleted,
      }));
      try {
        await reconcileMutation.mutateAsync({
          id: commitment.id,
          req: buildReconcileRequest(status, notes, bulletStatusArray),
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
      const next: RowState = { ...row, status, saving: true, saveError: null };
      setRow(next);
      await buildAndSave(status, next.notes, next.bulletStatuses);
    },
    [row, buildAndSave]
  );

  const handleNotesChange = useCallback((notes: string) => {
    setRow((prev) => ({ ...prev, notes }));
  }, []);

  const handleNotesBlur = useCallback(async () => {
    if (!row.status) return;
    if (row.notes === (reconciliation?.notes ?? '')) return;

    setRow((prev) => ({ ...prev, saving: true, saveError: null }));
    await buildAndSave(row.status, row.notes, row.bulletStatuses);
  }, [row, reconciliation, buildAndSave]);

  const handleBulletToggle = useCallback(
    async (bulletId: string, done: boolean) => {
      const nextBulletStatuses = { ...row.bulletStatuses, [bulletId]: done };
      setRow((prev) => ({ ...prev, bulletStatuses: nextBulletStatuses, saving: true, saveError: null }));

      if (!row.status) {
        setRow((prev) => ({ ...prev, saving: false }));
        return;
      }

      await buildAndSave(row.status, row.notes, nextBulletStatuses, () => {
        setRow((prev) => ({
          ...prev,
          bulletStatuses: { ...nextBulletStatuses, [bulletId]: !done },
        }));
      });
    },
    [row, buildAndSave]
  );

  const isReasonRequired = row.status !== null && row.status !== 'COMPLETED';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Two-column grid: stacks vertically below 768px */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* LEFT — Planned (read-only) */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">
              {commitment.title}
              {commitment.isUnplanned && (
                <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                  Unplanned
                </span>
              )}
            </h4>
            <span className="shrink-0 text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-0.5">
              {HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon}
            </span>
          </div>

          {/* RCDO */}
          {commitment.rcdoLink.rallyCryId && (
            <p className="text-xs text-gray-500 mb-2">
              RC: <span className="text-gray-700">{commitment.rcdoLink.rallyCryId}</span>
            </p>
          )}

          {/* Bullets (planned) */}
          {commitment.bullets.length > 0 && (
            <ul className="space-y-1 mt-2">
              {commitment.bullets.map((bullet) => (
                <li key={bullet.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-sm border border-gray-300 bg-white" aria-hidden="true" />
                  {bullet.body}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RIGHT — Actual */}
        <div className="p-4 bg-white">
          <div className="flex flex-col gap-3">
            {/* Status marker */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
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
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
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
                        className="text-sm text-gray-700 cursor-pointer leading-snug"
                      >
                        {bullet.body}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Change reason */}
            {row.status !== null && (
              <ChangeReasonCapture
                value={row.notes}
                onChange={handleNotesChange}
                required={isReasonRequired}
                disabled={row.saving}
              />
            )}

            {/* Onblur trigger for notes persistence */}
            {row.status !== null && row.notes !== (reconciliation?.notes ?? '') && (
              <button
                type="button"
                onClick={() => { void handleNotesBlur(); }}
                disabled={row.saving}
                className="self-start text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {row.saving ? 'Saving…' : 'Save notes'}
              </button>
            )}

            {/* Error */}
            {row.saveError && (
              <p role="alert" className="text-xs text-red-600">
                {row.saveError}
              </p>
            )}

            {/* Saving indicator */}
            {row.saving && !row.saveError && (
              <p className="text-xs text-gray-400 italic">Saving…</p>
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
      <p className="text-sm text-gray-500 py-4">No commitments to reconcile.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {commitments.map((detail) => (
        <CommitmentRow key={detail.commitment.id} detail={detail} cycleId={cycleId} />
      ))}
    </div>
  );
}
