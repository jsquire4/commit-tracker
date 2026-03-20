import { useState } from 'react';
import type { Commitment } from '@/types/commitment.types';

interface DisplacementQuickSignalProps {
  /** Flag: user clicked the "Unplanned work displaced this" quick signal */
  flagged: boolean;
  onFlagChange: (flagged: boolean) => void;
  /** Other commitments from the cycle that could have displaced this one */
  otherCommitments: Commitment[];
  /** IDs of commitments selected as displacing */
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function DisplacementQuickSignal({
  flagged,
  onFlagChange,
  otherCommitments,
  selectedIds,
  onSelectedChange,
  disabled = false,
}: DisplacementQuickSignalProps) {
  const [expanded, setExpanded] = useState(false);

  function handleCheckbox(id: string, checked: boolean) {
    if (checked) {
      onSelectedChange([...selectedIds, id]);
    } else {
      onSelectedChange(selectedIds.filter((x) => x !== id));
    }
  }

  return (
    <div className="mt-4 p-4 rounded-sm bg-[#FFF8E1] border border-[#F0D9A8]">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-4 h-4 flex-shrink-0 text-warning"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 16V4l10 6-10 6z" />
          <line x1="17" y1="4" x2="7" y2="4" />
          <line x1="7" y1="20" x2="17" y2="20" />
        </svg>
        <p className="text-sm font-semibold text-[#92650A]">
          What took priority instead?
        </p>
      </div>

      {/* Quick-signal badge */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onFlagChange(!flagged);
            setExpanded(!flagged);
          }}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full',
            'transition-all duration-[150ms] ease-[var(--ease-standard)]',
            'border-[1.5px]',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            flagged
              ? 'bg-error text-white border-error'
              : 'bg-surface-lowest text-error border-[#E8B4B2] hover:bg-[#FFF0EF]',
          ].join(' ')}
          title="One-click signal: unplanned work displaced this commitment"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Unplanned work displaced this
        </button>
        <span className="text-[11px] text-muted self-center">
          Quick signal &mdash; click to flag unplanned disruption
        </span>
      </div>

      {/* Specific displacing commitment(s) selector */}
      {(flagged || expanded) && otherCommitments.length > 0 && (
        <div>
          <label className="text-sm font-medium text-on-surface-variant block mb-1">
            Which specific work displaced this?
          </label>
          <div className="flex flex-col gap-1.5 mt-1">
            {otherCommitments.map((c) => {
              const isChecked = selectedIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={[
                    'flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded-sm',
                    'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
                    isChecked
                      ? 'bg-surface-lowest border border-accent'
                      : 'hover:bg-surface-lowest',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => { handleCheckbox(c.id, e.target.checked); }}
                    disabled={disabled}
                    className="w-4 h-4 rounded-sm border-[1.5px] border-outline-variant text-accent focus:ring-accent accent-accent"
                  />
                  {c.isUnplanned && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase rounded bg-[#EEF2F8] text-navy">
                      Unplanned
                    </span>
                  )}
                  <span className={isChecked ? 'text-accent font-medium' : 'text-on-surface-variant'}>
                    {c.title}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-2">
            Select the work that took priority over this commitment. Creates a direct displacement link.
          </p>
        </div>
      )}
    </div>
  );
}
