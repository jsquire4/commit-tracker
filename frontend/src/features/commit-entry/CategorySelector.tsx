import type { ChessCategory } from '@/types';

interface CategorySelectorProps {
  /** The currently selected chess category UUID, or null if none selected */
  value: string | null;
  /** Called with the chess category UUID when user selects a category */
  onChange: (id: string) => void;
  /** Chess category objects loaded from the API */
  categories: ChessCategory[];
  disabled?: boolean;
}

/** Static styling config keyed by canonical category name */
const CATEGORY_STYLES: Record<string, { description: string; borderColor: string }> = {
  Strategic: { description: 'Drives long-term objectives', borderColor: 'border-l-navy' },
  Operational: { description: 'Day-to-day execution', borderColor: 'border-l-muted' },
  Defensive: { description: 'Risk mitigation & maintenance', borderColor: 'border-l-error' },
  'Capability Building': { description: 'Growing skills & capacity', borderColor: 'border-l-capability' },
};

const DEFAULT_STYLE = { description: '', borderColor: 'border-l-muted' };

export function CategorySelector({ value, onChange, categories, disabled = false }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Category">
      {categories.filter((c) => c.isActive).map((category) => {
        const isSelected = value === category.id;
        const style = CATEGORY_STYLES[category.name] ?? DEFAULT_STYLE;

        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => { onChange(category.id); }}
            className={[
              'relative flex flex-col p-3 rounded-sm border border-outline-variant border-l-[3px] text-left',
              'bg-surface-lowest transition-all duration-[200ms] ease-[var(--ease-standard)]',
              style.borderColor,
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

            <span className="text-[0.8125rem] font-medium text-on-surface">{category.name}</span>
            <span className="text-small text-on-surface-variant mt-0.5">{style.description}</span>
          </button>
        );
      })}
    </div>
  );
}
