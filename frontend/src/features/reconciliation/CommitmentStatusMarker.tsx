import type { ReconciliationStatus } from '@/types/enums';

interface CommitmentStatusMarkerProps {
  value: ReconciliationStatus | null;
  onChange: (s: ReconciliationStatus) => void;
  disabled?: boolean;
}

interface StatusOption {
  value: ReconciliationStatus;
  label: string;
  activeClass: string;
  inactiveClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'COMPLETED',
    label: 'Completed',
    activeClass: 'bg-green-600 text-white border-green-600',
    inactiveClass: 'bg-white text-green-700 border-green-300 hover:bg-green-50',
  },
  {
    value: 'PARTIALLY_COMPLETED',
    label: 'Partial',
    activeClass: 'bg-yellow-500 text-white border-yellow-500',
    inactiveClass: 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50',
  },
  {
    value: 'NOT_STARTED',
    label: 'Not Started',
    activeClass: 'bg-red-600 text-white border-red-600',
    inactiveClass: 'bg-white text-red-700 border-red-300 hover:bg-red-50',
  },
  {
    value: 'CARRIED_FORWARD',
    label: 'Carry Forward',
    activeClass: 'bg-blue-600 text-white border-blue-600',
    inactiveClass: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50',
  },
];

export function CommitmentStatusMarker({
  value,
  onChange,
  disabled = false,
}: CommitmentStatusMarkerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Reconciliation status"
      className="flex flex-wrap gap-1"
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
            onClick={() => { onChange(option.value); }}
            className={[
              'px-3 py-1.5 text-sm font-medium rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
              isSelected ? option.activeClass : option.inactiveClass,
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              'focus:ring-blue-500',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
