import type { Commitment } from '@/types';
import type { ChessCategory } from '@/types/chess.types';
import { ChessboardCell } from './ChessboardCell';

interface ChessboardGridProps {
  commitments: Commitment[];
  categories: ChessCategory[];
}

interface PriorityTier {
  label: string;
  key: string;
  test: (rank: number) => boolean;
}

const PRIORITY_TIERS: PriorityTier[] = [
  { label: 'High', key: 'high', test: (rank) => rank >= 1 && rank <= 2 },
  { label: 'Medium', key: 'medium', test: (rank) => rank >= 3 && rank <= 4 },
  { label: 'Low', key: 'low', test: (rank) => rank >= 5 },
];

export function ChessboardGrid({ commitments, categories }: ChessboardGridProps) {
  /** Sorted categories — respect the backend sortOrder */
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  /** Commitments with no category go into a synthetic "Uncategorized" column */
  const uncategorizedCommitments = commitments.filter((c) => c.chessCategoryId === null);
  const hasUncategorized = uncategorizedCommitments.length > 0;

  const allColumns: ChessCategory[] = [
    ...sortedCategories,
    ...(hasUncategorized
      ? [
          {
            id: '__uncategorized__',
            orgId: '',
            name: 'Uncategorized',
            description: null,
            colorHex: null,
            sortOrder: 9999,
            isActive: true,
          } satisfies ChessCategory,
        ]
      : []),
  ];

  function getCellCommitments(categoryId: string, tier: PriorityTier): Commitment[] {
    return commitments.filter((c) => {
      const matchesCategory =
        categoryId === '__uncategorized__'
          ? c.chessCategoryId === null
          : c.chessCategoryId === categoryId;
      return matchesCategory && tier.test(c.priorityRank);
    });
  }

  return (
    <div className="overflow-x-auto">
      {/* Column count: 4 on lg+, 2 on md, 1 on sm */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${allColumns.length}, minmax(0, 1fr))`,
        }}
      >
        {/* Header row: category names */}
        <div
          className="contents"
          role="row"
        >
          {allColumns.map((cat) => (
            <div
              key={cat.id}
              role="columnheader"
              className="px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600"
              style={cat.colorHex ? { color: cat.colorHex } : undefined}
            >
              {cat.name}
            </div>
          ))}
        </div>

        {/* Data rows: one per priority tier */}
        {PRIORITY_TIERS.map((tier) => (
          <div key={tier.key} className="contents" role="row">
            {allColumns.map((cat) => (
              <ChessboardCell
                key={`${tier.key}-${cat.id}`}
                commitments={getCellCommitments(cat.id, tier)}
                category={cat}
                priorityTier={tier.label}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tier legend below grid */}
      <div className="mt-4 flex gap-6 text-xs text-gray-500">
        {PRIORITY_TIERS.map((tier) => (
          <span key={tier.key}>
            <span className="font-semibold text-gray-700">{tier.label}</span>
            {tier.key === 'high' && ' — rank 1–2'}
            {tier.key === 'medium' && ' — rank 3–4'}
            {tier.key === 'low' && ' — rank 5+'}
          </span>
        ))}
      </div>
    </div>
  );
}
