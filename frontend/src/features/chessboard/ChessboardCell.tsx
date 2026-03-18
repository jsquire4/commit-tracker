import type { Commitment } from '@/types';
import type { ChessCategory } from '@/types/chess.types';
import { ChessboardCommitmentChip } from './ChessboardCommitmentChip';

interface ChessboardCellProps {
  commitments: Commitment[];
  category: ChessCategory;
  priorityTier: string;
  previousCount?: number;
}

/** Converts a hex color string to a Tailwind-compatible inline style for the left accent */
function accentStyle(colorHex: string | null): React.CSSProperties {
  return colorHex
    ? { borderLeftColor: colorHex, borderLeftWidth: '4px', borderLeftStyle: 'solid' }
    : { borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#d1d5db' };
}

export function ChessboardCell({ commitments, category, priorityTier, previousCount }: ChessboardCellProps) {
  const isEmpty = commitments.length === 0;
  const currentCount = commitments.length;
  const delta = previousCount !== undefined ? currentCount - previousCount : 0;
  const showDelta = previousCount !== undefined && delta !== 0;

  return (
    <div
      aria-label={`${category.name} — ${priorityTier}`}
      className={[
        'rounded-md p-2 min-h-[72px] flex flex-col gap-1.5 transition-colors',
        isEmpty
          ? 'border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
          : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
      ].join(' ')}
      style={accentStyle(category.colorHex)}
    >
      {showDelta && (
        <span
          className={`self-end text-xs font-bold leading-none ${
            delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
          aria-label={delta > 0 ? `Up ${delta} from previous cycle` : `Down ${Math.abs(delta)} from previous cycle`}
        >
          {delta > 0 ? `↑${String(delta)}` : `↓${String(Math.abs(delta))}`}
        </span>
      )}
      {isEmpty ? (
        <span className="text-xs text-gray-400 dark:text-gray-500 italic m-auto">No commitments</span>
      ) : (
        commitments.map((c) => (
          <ChessboardCommitmentChip key={c.id} commitment={c} />
        ))
      )}
    </div>
  );
}
