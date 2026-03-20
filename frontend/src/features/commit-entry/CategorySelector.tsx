import type { ChessCategoryType } from '@/types';

interface CategorySelectorProps {
  value: ChessCategoryType | null;
  onChange: (c: ChessCategoryType) => void;
  disabled?: boolean;
}

interface CategoryOption {
  value: ChessCategoryType;
  label: string;
  description: string;
  borderColor: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: 'STRATEGIC',
    label: 'Strategic',
    description: 'Drives long-term objectives',
    borderColor: 'border-l-navy',
  },
  {
    value: 'OPERATIONAL',
    label: 'Operational',
    description: 'Day-to-day execution',
    borderColor: 'border-l-muted',
  },
  {
    value: 'DEFENSIVE',
    label: 'Defensive',
    description: 'Risk mitigation & maintenance',
    borderColor: 'border-l-error',
  },
  {
    value: 'CAPABILITY_BUILDING',
    label: 'Capability Building',
    description: 'Growing skills & capacity',
    borderColor: 'border-l-capability',
  },
];

export function CategorySelector({ value, onChange, disabled = false }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Category">
      {CATEGORIES.map((category) => {
        const isSelected = value === category.value;

        return (
          <button
            key={category.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => { onChange(category.value); }}
            className={[
              'relative flex flex-col p-3 rounded-sm border border-outline-variant border-l-[3px] text-left',
              'bg-surface-lowest transition-all duration-[200ms] ease-[var(--ease-standard)]',
              category.borderColor,
              isSelected
                ? 'border-accent border-l-accent bg-accent/[0.04]'
                : 'hover:bg-surface-container-low',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:translate-y-px',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Checkmark */}
            <div
              className={[
                'absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-accent',
                'flex items-center justify-center',
                'transition-opacity duration-[150ms]',
                isSelected ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <span className="text-[0.8125rem] font-medium text-on-surface">{category.label}</span>
            <span className="text-small text-on-surface-variant mt-0.5">{category.description}</span>
          </button>
        );
      })}
    </div>
  );
}
