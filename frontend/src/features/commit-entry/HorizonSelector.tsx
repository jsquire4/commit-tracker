import type { CompletionHorizon } from '@/types';

interface HorizonSelectorProps {
  value: CompletionHorizon;
  onChange: (h: CompletionHorizon) => void;
  disabled?: boolean;
}

const HORIZONS: { value: CompletionHorizon; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'MIDDAY', label: 'Midday' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EOD', label: 'EOD' },
  { value: 'EOW', label: 'EOW' },
];

export function HorizonSelector({ value, onChange, disabled = false }: HorizonSelectorProps) {
  return (
    <div className="flex rounded-md shadow-sm" role="group" aria-label="Completion horizon">
      {HORIZONS.map((horizon, index) => {
        const isActive = value === horizon.value;
        const isFirst = index === 0;
        const isLast = index === HORIZONS.length - 1;

        return (
          <button
            key={horizon.value}
            type="button"
            disabled={disabled}
            onClick={() => { onChange(horizon.value); }}
            aria-pressed={isActive}
            className={[
              'flex-1 px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors',
              isFirst ? 'rounded-l-md' : '',
              isLast ? 'rounded-r-md' : '',
              !isFirst ? '-ml-px' : '',
              isActive
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {horizon.label}
          </button>
        );
      })}
    </div>
  );
}
