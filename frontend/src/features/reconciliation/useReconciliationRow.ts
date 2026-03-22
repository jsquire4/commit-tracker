import { useState, useCallback, useRef, type MutableRefObject } from 'react';
import type { CommitmentReconciliationDetail, ReconcileCommitmentRequest } from '@/types/reconciliation.types';
import type { ReconciliationStatus } from '@/types/enums';
import type { BulletStatus } from '@/types/reconciliation.types';
import { useReconcileCommitment } from '@/hooks/useReconciliation';
import { type DisplacementValue } from './DisplacementCapture';

/* ─── Row State ────────────────────────────────────────────────────────────── */

export interface RowState {
  status: ReconciliationStatus | null;
  notes: string;
  bulletStatuses: Record<string, boolean>;
  displacement: DisplacementValue;
  carryForward: boolean;
  saving: boolean;
  saveError: string | null;
  /** Quick signal: unplanned work displaced this */
  displacementFlagged: boolean;
  displacementSelectedIds: string[];
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function buildReconcileRequest(
  status: ReconciliationStatus,
  notes: string,
  bulletStatuses: BulletStatus[],
  displacement: DisplacementValue,
  carryForward: boolean,
  displacementFlagged: boolean,
  displacementSelectedIds: string[],
): ReconcileCommitmentRequest {
  const base: ReconcileCommitmentRequest = {
    status,
    carryForward,
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
  // Wire quick-signal displacement data
  if (displacementFlagged && displacementSelectedIds.length === 1) {
    base.displacingCommitmentId = displacementSelectedIds[0]!;
  }
  if (displacementFlagged && displacementSelectedIds.length > 0) {
    base.displacementDetail = [
      base.displacementDetail ?? '',
      `Displaced by: ${displacementSelectedIds.join(', ')}`,
    ].filter(Boolean).join(' | ');
  }
  return base;
}

export function buildInitialRowState(detail: CommitmentReconciliationDetail): RowState {
  const bulletStatuses: Record<string, boolean> = {};
  for (const bullet of detail.commitment.bullets) {
    bulletStatuses[bullet.id] = bullet.isCompleted;
  }
  const isCarriedForward = detail.reconciliation?.status === 'CARRIED_FORWARD';
  return {
    status: isCarriedForward ? 'PARTIALLY_COMPLETED' : (detail.reconciliation?.status ?? null),
    notes: detail.reconciliation?.notes ?? '',
    bulletStatuses,
    displacement: {
      category: detail.reconciliation?.displacementCategory ?? null,
      detail: detail.reconciliation?.displacementDetail ?? '',
      displacingCommitmentId: detail.reconciliation?.displacingCommitmentId ?? null,
    },
    carryForward: isCarriedForward,
    saving: false,
    saveError: null,
    displacementFlagged: false,
    displacementSelectedIds: [],
  };
}

/* ─── Hook ─────────────────────────────────────────────────────────────────── */

export function useReconciliationRow(
  detail: CommitmentReconciliationDetail,
  cycleId: string,
) {
  const { commitment, reconciliation } = detail;
  const [row, setRow] = useState<RowState>(() => buildInitialRowState(detail));
  const rowRef = useRef(row) as MutableRefObject<RowState>;
  rowRef.current = row;

  const reconcileMutation = useReconcileCommitment(cycleId);

  const buildAndSave = useCallback(
    async (
      status: ReconciliationStatus,
      notes: string,
      bulletStatuses: Record<string, boolean>,
      displacement: DisplacementValue,
      carryForward: boolean,
      onError?: () => void,
      flagged?: boolean,
      selectedIds?: string[],
    ) => {
      const bulletStatusArray: BulletStatus[] = commitment.bullets.map((b) => ({
        bulletId: b.id,
        done: bulletStatuses[b.id] ?? b.isCompleted,
      }));
      try {
        await reconcileMutation.mutateAsync({
          id: commitment.id,
          req: buildReconcileRequest(status, notes, bulletStatusArray, displacement, carryForward, flagged ?? false, selectedIds ?? []),
        });
        setRow((prev) => ({ ...prev, saving: false }));
      } catch {
        setRow((prev) => ({ ...prev, saving: false, saveError: 'Save failed. Try again.' }));
        onError?.();
      }
    },
    [commitment, reconcileMutation],
  );

  const handleStatusChange = useCallback(
    async (status: ReconciliationStatus) => {
      setRow((prev) => ({ ...prev, status, saveError: null }));
      const latest = rowRef.current;
      const notesRequired = status !== 'COMPLETED';
      if (!notesRequired || latest.notes.trim().length > 0) {
        setRow((prev) => ({ ...prev, status, saving: true, saveError: null }));
        await buildAndSave(status, latest.notes, latest.bulletStatuses, latest.displacement, latest.carryForward, undefined, latest.displacementFlagged, latest.displacementSelectedIds);
      }
    },
    [rowRef, buildAndSave],
  );

  const handleNotesChange = useCallback((notes: string) => {
    setRow((prev) => ({ ...prev, notes }));
  }, []);

  const handleNotesBlur = useCallback(async () => {
    const latest = rowRef.current;
    if (!latest.status) return;
    if (latest.notes === (reconciliation?.notes ?? '') && latest.status === reconciliation?.status) return;
    const notesRequired = latest.status !== 'COMPLETED';
    if (notesRequired && latest.notes.trim().length === 0) return;
    setRow((prev) => ({ ...prev, saving: true, saveError: null }));
    await buildAndSave(latest.status, latest.notes, latest.bulletStatuses, latest.displacement, latest.carryForward, undefined, latest.displacementFlagged, latest.displacementSelectedIds);
  }, [rowRef, reconciliation, buildAndSave]);

  const handleDisplacementChange = useCallback((displacement: DisplacementValue) => {
    setRow((prev) => ({ ...prev, displacement }));
  }, []);

  const handleCarryForwardChange = useCallback((carry: boolean) => {
    setRow((prev) => ({ ...prev, carryForward: carry }));
  }, []);

  const handleBulletToggle = useCallback(
    async (bulletId: string, done: boolean) => {
      const latest = rowRef.current;
      const nextBulletStatuses = { ...latest.bulletStatuses, [bulletId]: done };
      setRow((prev) => ({ ...prev, bulletStatuses: nextBulletStatuses, saving: true, saveError: null }));
      if (!latest.status) {
        setRow((prev) => ({ ...prev, saving: false }));
        return;
      }
      await buildAndSave(latest.status, latest.notes, nextBulletStatuses, latest.displacement, latest.carryForward, () => {
        setRow((prev) => ({
          ...prev,
          bulletStatuses: { ...nextBulletStatuses, [bulletId]: !done },
        }));
      }, latest.displacementFlagged, latest.displacementSelectedIds);
    },
    [rowRef, buildAndSave],
  );

  return { row, setRow, handleStatusChange, handleNotesChange, handleNotesBlur, handleDisplacementChange, handleCarryForwardChange, handleBulletToggle };
}
