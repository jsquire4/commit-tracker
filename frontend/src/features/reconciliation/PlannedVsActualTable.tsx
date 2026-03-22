import { useState, useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { CommitmentReconciliationDetail, ReconcileCommitmentRequest } from '@/types/reconciliation.types';
import type { ReconciliationStatus } from '@/types/enums';
import type { BulletStatus } from '@/types/reconciliation.types';
import type { Commitment } from '@/types/commitment.types';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
import { ChangeReasonCapture } from './ChangeReasonCapture';
import { DisplacementCapture, type DisplacementValue } from './DisplacementCapture';
import { DisplacementQuickSignal } from './DisplacementQuickSignal';
import { useReconcileCommitment } from '@/hooks/useReconciliation';

/* ─── Constants ────────────────────────────────────────────────────────────── */

const DISPLACEMENT_STATUSES: ReconciliationStatus[] = [
  'NOT_STARTED',
  'PARTIALLY_COMPLETED',
] as const;

const HORIZON_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  MIDDAY: 'Midday',
  AFTERNOON: 'Afternoon',
  EOD: 'End of Day',
  EOW: 'End of Week',
};

import { CHESS_ACCENT } from '@/constants/chess-colors';

const CHESS_BAR_COLORS: Record<string, string> = {
  Strategic: CHESS_ACCENT.strategic,
  Operational: CHESS_ACCENT.operational,
  Defensive: CHESS_ACCENT.defensive,
  'Capability Building': CHESS_ACCENT.capability,
};

const STATUS_PILL: Record<ReconciliationStatus, { bg: string; text: string; label: string; icon: string }> = {
  COMPLETED: { bg: 'bg-[#E0F2F1]', text: 'text-accent', label: 'Completed', icon: '\u2713' },
  PARTIALLY_COMPLETED: { bg: 'bg-[#FFF8E1]', text: 'text-[#92650A]', label: 'Partial', icon: '\u00BD' },
  NOT_STARTED: { bg: 'bg-[#FFF0EF]', text: 'text-error', label: 'Not Started', icon: '\u00D7' },
  CARRIED_FORWARD: { bg: 'bg-[#EEF2F8]', text: 'text-navy', label: 'Carried Fwd', icon: '\u2192' },
};

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

/* ─── Row State ────────────────────────────────────────────────────────────── */

interface RowState {
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

function buildInitialRowState(detail: CommitmentReconciliationDetail): RowState {
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

/* ─── CommitmentRow ────────────────────────────────────────────────────────── */

interface CommitmentRowProps {
  detail: CommitmentReconciliationDetail;
  cycleId: string;
  allCommitments: Commitment[];
  expanded: boolean;
  onToggle: () => void;
  staggerIndex: number;
}

function CommitmentRow({ detail, cycleId, allCommitments, expanded, onToggle, staggerIndex }: CommitmentRowProps) {
  const { commitment, reconciliation } = detail;
  const [row, setRow] = useState<RowState>(() => buildInitialRowState(detail));
  const rowRef = useRef(row) as MutableRefObject<RowState>;
  rowRef.current = row;
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Staggered fade-in
  useEffect(() => {
    const timer = setTimeout(() => { setVisible(true); }, staggerIndex * 40);
    return () => { clearTimeout(timer); };
  }, [staggerIndex]);

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

  const isReasonRequired = row.status !== null && row.status !== 'COMPLETED';
  const isDisplacementApplicable = row.status !== null && DISPLACEMENT_STATUSES.includes(row.status);

  // CHESS bar color
  const chessColor = commitment.chessCategoryName
    ? CHESS_BAR_COLORS[commitment.chessCategoryName] ?? '#DCD9D4'
    : '#DCD9D4';

  // Status pill for collapsed view
  const statusPill = row.status ? STATUS_PILL[row.status] : null;

  // Other commitments for displacement quick signal
  const otherCommitments = allCommitments.filter((c) => c.id !== commitment.id);

  return (
    <div
      ref={cardRef}
      className={[
        'bg-surface-lowest rounded-sm overflow-hidden border border-outline-variant',
        'transition-all duration-[300ms] ease-[var(--ease-entrance)]',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
      ].join(' ')}
    >
      {/* Collapsed header row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-center px-5 py-3.5 gap-3 w-full bg-transparent border-0 cursor-pointer select-none transition-colors duration-[150ms] ease-[var(--ease-standard)] hover:bg-surface text-left"
      >
        {/* Chevron */}
        <svg
          className={[
            'w-5 h-5 flex-shrink-0 text-muted transition-transform duration-[200ms] ease-[var(--ease-standard)]',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>

        {/* Rank */}
        <span className="text-[11px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60 min-w-[20px]">
          #{commitment.priorityRank}
        </span>

        {/* Title */}
        <h3 className="text-[14px] font-medium text-on-surface leading-snug flex-1 truncate">
          {commitment.title}
        </h3>

        {/* Pills */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Horizon pill */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.08em] uppercase bg-surface-container text-on-surface-variant">
            {HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon}
          </span>

          {/* CHESS pill */}
          {commitment.chessCategoryName && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.08em] uppercase text-on-surface-variant">
              <span
                className="w-[3px] h-3 rounded-sm"
                style={{ background: chessColor }}
                aria-hidden="true"
              />
              {commitment.chessCategoryName}
            </span>
          )}

          {/* Rally cry link */}
          {commitment.rcdoLink.rallyCryTitle ? (
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-accent">
              &rarr; {commitment.rcdoLink.rallyCryTitle}
            </span>
          ) : (
            <span className="text-[10px] font-semibold tracking-[0.05em] text-muted italic">
              Unlinked
            </span>
          )}

          {/* Status pill */}
          {statusPill && (
            <span
              className={[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.06em] uppercase whitespace-nowrap',
                statusPill.bg,
                statusPill.text,
              ].join(' ')}
            >
              {statusPill.icon} {statusPill.label}
            </span>
          )}
        </div>
      </button>

      {/* Expandable body */}
      <div
        className="overflow-hidden transition-[max-height] duration-[300ms] ease-[var(--ease-entrance)]"
        style={{ maxHeight: expanded ? '999vh' : '0px' }}
      >
        <div className="border-t border-surface-container-low">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* LEFT — Planned (read-only) */}
            <div className="p-5 bg-surface border-r border-surface-container-low">
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-40">
                PLANNED
              </span>
              {commitment.bullets.length > 0 && (
                <ul className="space-y-2 mt-3">
                  {commitment.bullets.map((bullet) => (
                    <li key={bullet.id} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <span
                        className="mt-0.5 w-4 h-4 rounded-sm border-[1.5px] border-outline-variant bg-surface flex-shrink-0"
                        aria-hidden="true"
                      />
                      {bullet.body}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* RIGHT — Actual */}
            <div className="p-5 bg-surface-lowest">
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-40 block mb-3">
                ACTUAL
              </span>

              <div className="flex flex-col gap-4">
                {/* Status marker */}
                <CommitmentStatusMarker
                  value={row.status}
                  onChange={(s) => { void handleStatusChange(s); }}
                  disabled={row.saving}
                  onCarryForwardChange={handleCarryForwardChange}
                  carryForward={row.carryForward}
                />

                {/* Displacement Quick Signal — for Partial / Not Started */}
                {isDisplacementApplicable && (
                  <DisplacementQuickSignal
                    flagged={row.displacementFlagged}
                    onFlagChange={(f) => { setRow((prev) => ({ ...prev, displacementFlagged: f })); }}
                    otherCommitments={otherCommitments}
                    selectedIds={row.displacementSelectedIds}
                    onSelectedChange={(ids) => { setRow((prev) => ({ ...prev, displacementSelectedIds: ids })); }}
                    disabled={row.saving}
                  />
                )}

                {/* Bullet checkboxes */}
                {commitment.bullets.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60 mb-2">
                      Bullet Status
                    </p>
                    <ul className="space-y-2">
                      {commitment.bullets.map((bullet) => (
                        <li key={bullet.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`bullet-${bullet.id}`}
                            checked={row.bulletStatuses[bullet.id] ?? bullet.isCompleted}
                            onChange={(e) => {
                              void handleBulletToggle(bullet.id, e.target.checked);
                            }}
                            disabled={row.saving}
                            className="mt-0.5 h-4 w-4 rounded-sm border-[1.5px] border-outline-variant text-accent focus:ring-accent accent-accent"
                          />
                          <label
                            htmlFor={`bullet-${bullet.id}`}
                            className="text-sm text-on-surface cursor-pointer leading-snug"
                          >
                            {bullet.body}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
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

                {/* Displacement details */}
                {isDisplacementApplicable && (
                  <DisplacementCapture
                    value={row.displacement}
                    onChange={handleDisplacementChange}
                    cycleCommitments={allCommitments}
                    currentCommitmentCreatedAt={commitment.createdAt}
                    disabled={row.saving}
                  />
                )}

                {/* Completed — success message */}
                {row.status === 'COMPLETED' && !row.saving && !row.saveError && (
                  <p className="text-xs text-accent flex items-center gap-1.5 mt-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    All bullets complete. No notes required.
                  </p>
                )}

                {/* Error */}
                {row.saveError && (
                  <p role="alert" className="text-xs text-error">
                    {row.saveError}
                  </p>
                )}

                {/* Saving indicator */}
                {row.saving && !row.saveError && (
                  <p className="text-xs text-muted italic">Saving&hellip;</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PlannedVsActualTable ─────────────────────────────────────────────────── */

interface PlannedVsActualTableProps {
  commitments: CommitmentReconciliationDetail[];
  cycleId: string;
}

export function PlannedVsActualTable({ commitments, cycleId }: PlannedVsActualTableProps) {
  // First card expanded by default
  const firstCommitment = commitments.length > 0 ? commitments[0] : undefined;
  const [expandedId, setExpandedId] = useState<string | null>(
    firstCommitment?.commitment.id ?? null,
  );

  if (commitments.length === 0) {
    return (
      <p className="text-sm text-muted py-4">No commitments to reconcile.</p>
    );
  }

  const allCommitments = commitments.map((d) => d.commitment);

  return (
    <div className="flex flex-col gap-3">
      {commitments.map((detail, idx) => (
        <CommitmentRow
          key={detail.commitment.id}
          detail={detail}
          cycleId={cycleId}
          allCommitments={allCommitments}
          expanded={expandedId === detail.commitment.id}
          onToggle={() => {
            setExpandedId((prev) =>
              prev === detail.commitment.id ? null : detail.commitment.id,
            );
          }}
          staggerIndex={idx + 1}
        />
      ))}
    </div>
  );
}
