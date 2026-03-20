import { useState } from 'react';
import type { ReconciliationStatus } from '@/types/enums';

interface CommitmentStatusMarkerProps {
  value: ReconciliationStatus | null;
  onChange: (s: ReconciliationStatus) => void;
  disabled?: boolean;
  /** When true, show the carry-forward toggle for Partial / Not Started */
  onCarryForwardChange?: (carry: boolean) => void;
  carryForward?: boolean;
}

interface StatusOption {
  value: ReconciliationStatus;
  label: string;
  icon: string;
  helperText: string;
  activeClass: string;
  inactiveClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'COMPLETED',
    label: 'Completed',
    icon: '\u2713',
    helperText: 'Done as planned',
    activeClass: 'bg-accent text-white border-accent',
    inactiveClass:
      'bg-surface-lowest text-accent border-[#B2DFDB] hover:bg-[#E0F2F1]',
  },
  {
    value: 'PARTIALLY_COMPLETED',
    label: 'Partial',
    icon: '\u00BD',
    helperText: 'Some work done, some remains',
    activeClass: 'bg-warning text-white border-warning',
    inactiveClass:
      'bg-surface-lowest text-[#92650A] border-[#F0D9A8] hover:bg-[#FFF8E1]',
  },
  {
    value: 'NOT_STARTED',
    label: 'Not Started',
    icon: '\u00D7',
    helperText: "Didn't get to it at all",
    activeClass: 'bg-error text-white border-error',
    inactiveClass:
      'bg-surface-lowest text-error border-[#E8B4B2] hover:bg-[#FFF0EF]',
  },
];

const SHOWS_CARRY_TOGGLE: ReconciliationStatus[] = ['PARTIALLY_COMPLETED', 'NOT_STARTED'];

export function CommitmentStatusMarker({
  value,
  onChange,
  disabled = false,
  onCarryForwardChange,
  carryForward,
}: CommitmentStatusMarkerProps) {
  const [localCarry, setLocalCarry] = useState<boolean | null>(null);
  const showCarryToggle = value !== null && SHOWS_CARRY_TOGGLE.includes(value);
  const carry = carryForward ?? localCarry;

  function handleCarry(val: boolean) {
    setLocalCarry(val);
    onCarryForwardChange?.(val);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Status buttons */}
      <div>
        <p className="text-[0.625rem] font-bold tracking-widest uppercase text-on-surface-variant opacity-60 mb-2">
          What happened?
        </p>
        <div
          role="radiogroup"
          aria-label="Reconciliation status"
          className="flex flex-wrap gap-1.5"
        >
          {STATUS_OPTIONS.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => {
                  onChange(option.value);
                }}
                className={[
                  'px-3.5 py-1.5 text-[13px] font-medium rounded-sm border-[1.5px]',
                  'transition-all duration-[200ms] ease-[var(--ease-standard)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  isSelected ? option.activeClass : option.inactiveClass,
                  disabled
                    ? 'bg-surface-container-high text-muted border-surface-container-high cursor-not-allowed'
                    : 'cursor-pointer',
                ].join(' ')}
              >
                {option.icon} {option.label}
              </button>
            );
          })}
        </div>

        {/* Helper text row */}
        <div className="flex flex-wrap gap-4 mt-3">
          {STATUS_OPTIONS.map((option) => (
            <span key={option.value} className="text-[11px] text-muted leading-snug">
              {option.icon} <strong>{option.label}</strong> &mdash; {option.helperText}
            </span>
          ))}
        </div>
      </div>

      {/* Carry-forward toggle */}
      {showCarryToggle && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-surface rounded-sm border border-outline-variant transition-all duration-[200ms] ease-[var(--ease-standard)]">
          <svg
            className="w-4 h-4 flex-shrink-0 text-navy"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9.87L21 7" />
          </svg>
          <span className="text-sm font-medium text-on-surface flex-1">
            Carry to next week?
          </span>
          <button
            type="button"
            onClick={() => { handleCarry(true); }}
            className={[
              'px-3 py-1 text-xs font-semibold rounded-sm border-[1.5px] border-[#B8C5D9]',
              'transition-all duration-[150ms] ease-[var(--ease-standard)]',
              carry === true
                ? 'bg-navy text-white border-navy'
                : 'bg-surface-lowest text-navy hover:bg-[#EEF2F8]',
            ].join(' ')}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => { handleCarry(false); }}
            className={[
              'px-3 py-1 text-xs font-semibold rounded-sm border-[1.5px] border-[#B8C5D9]',
              'transition-all duration-[150ms] ease-[var(--ease-standard)]',
              carry === false
                ? 'bg-navy text-white border-navy'
                : 'bg-surface-lowest text-navy hover:bg-[#EEF2F8]',
            ].join(' ')}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
