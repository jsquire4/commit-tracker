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
    inactiveClass: 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30',
  },
  {
    value: 'PARTIALLY_COMPLETED',
    label: 'Partial',
    activeClass: 'bg-yellow-500 text-white border-yellow-500',
    inactiveClass: 'bg-white dark:bg-gray-800 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/30',
  },
  {
    value: 'NOT_STARTED',
    label: 'Not Started',
    activeClass: 'bg-red-600 text-white border-red-600',
    inactiveClass: 'bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30',
  },
  {
    value: 'CARRIED_FORWARD',
    label: 'Carry Forward',
    activeClass: 'bg-blue-600 text-white border-blue-600',
    inactiveClass: 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30',
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
