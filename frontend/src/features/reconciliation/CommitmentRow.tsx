import { useState, useEffect, useRef } from 'react';
import type { CommitmentReconciliationDetail } from '@/types/reconciliation.types';
import type { ReconciliationStatus } from '@/types/enums';
import type { Commitment } from '@/types/commitment.types';
import { CHESS_BAR_COLORS } from '@/constants/chess-colors';
import { HORIZON_LABELS } from '@/constants/horizon';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
import { ChangeReasonCapture } from './ChangeReasonCapture';
import { DisplacementCapture } from './DisplacementCapture';
import { DisplacementQuickSignal } from './DisplacementQuickSignal';
import { useReconciliationRow } from './useReconciliationRow';

/* ─── Constants ────────────────────────────────────────────────────────────── */

const DISPLACEMENT_STATUSES: ReconciliationStatus[] = [
  'NOT_STARTED',
  'PARTIALLY_COMPLETED',
] as const;

const STATUS_PILL: Record<ReconciliationStatus, { bg: string; text: string; label: string; icon: string }> = {
  COMPLETED: { bg: 'bg-[#E0F2F1]', text: 'text-accent', label: 'Completed', icon: '\u2713' },
  PARTIALLY_COMPLETED: { bg: 'bg-[#FFF8E1]', text: 'text-[#92650A]', label: 'Partial', icon: '\u00BD' },
  NOT_STARTED: { bg: 'bg-[#FFF0EF]', text: 'text-error', label: 'Not Started', icon: '\u00D7' },
  CARRIED_FORWARD: { bg: 'bg-[#EEF2F8]', text: 'text-navy', label: 'Carried Fwd', icon: '\u2192' },
};

/* ─── CommitmentRow ────────────────────────────────────────────────────────── */

export interface CommitmentRowProps {
  detail: CommitmentReconciliationDetail;
  cycleId: string;
  allCommitments: Commitment[];
  expanded: boolean;
  onToggle: () => void;
  staggerIndex: number;
}

export function CommitmentRow({ detail, cycleId, allCommitments, expanded, onToggle, staggerIndex }: CommitmentRowProps) {
  const { commitment } = detail;
  const { row, setRow, handleStatusChange, handleNotesChange, handleNotesBlur, handleDisplacementChange, handleCarryForwardChange, handleBulletToggle } = useReconciliationRow(detail, cycleId);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Staggered fade-in
  useEffect(() => {
    const timer = setTimeout(() => { setVisible(true); }, staggerIndex * 40);
    return () => { clearTimeout(timer); };
  }, [staggerIndex]);

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
        style={{ maxHeight: expanded ? '2000px' : '0px' }}
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
