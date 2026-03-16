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
  colorClass: string;
  dotClass: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: 'STRATEGIC',
    label: 'Strategic',
    description: 'Drives long-term objectives',
    colorClass: 'border-purple-300 bg-purple-50',
    dotClass: 'bg-purple-500',
  },
  {
    value: 'OPERATIONAL',
    label: 'Operational',
    description: 'Day-to-day execution',
    colorClass: 'border-blue-300 bg-blue-50',
    dotClass: 'bg-blue-500',
  },
  {
    value: 'DEFENSIVE',
    label: 'Defensive',
    description: 'Risk mitigation and maintenance',
    colorClass: 'border-red-300 bg-red-50',
    dotClass: 'bg-red-500',
  },
  {
    value: 'CAPABILITY_BUILDING',
    label: 'Capability Building',
    description: 'Growing skills and capacity',
    colorClass: 'border-green-300 bg-green-50',
    dotClass: 'bg-green-500',
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
              'relative flex items-start p-3 rounded-md border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500',
              isSelected ? category.colorClass + ' border-opacity-100' : 'border-gray-200 bg-white hover:border-gray-300',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${isSelected ? category.dotClass : 'bg-gray-300'}`}
              />
              <div>
                <p className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {category.label}
                </p>
                <p className="text-xs text-gray-500">{category.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
