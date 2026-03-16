import type { Commitment } from '@/types';
import type { ChessCategory } from '@/types/chess.types';
import { ChessboardCommitmentChip } from './ChessboardCommitmentChip';

interface ChessboardCellProps {
  commitments: Commitment[];
  category: ChessCategory;
  priorityTier: string;
}

/** Converts a hex color string to a Tailwind-compatible inline style for the left accent */
function accentStyle(colorHex: string | null): React.CSSProperties {
  return colorHex
    ? { borderLeftColor: colorHex, borderLeftWidth: '4px', borderLeftStyle: 'solid' }
    : { borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#d1d5db' };
}

export function ChessboardCell({ commitments, category, priorityTier }: ChessboardCellProps) {
  const isEmpty = commitments.length === 0;

  return (
    <div
      aria-label={`${category.name} — ${priorityTier}`}
      className={[
        'rounded-md p-2 min-h-[72px] flex flex-col gap-1.5 transition-colors',
        isEmpty
          ? 'border border-dashed border-gray-300 bg-gray-50'
          : 'border border-gray-200 bg-white',
      ].join(' ')}
      style={accentStyle(category.colorHex)}
    >
      {isEmpty ? (
        <span className="text-xs text-gray-400 italic m-auto">No commitments</span>
      ) : (
        commitments.map((c) => (
          <ChessboardCommitmentChip key={c.id} commitment={c} />
        ))
      )}
    </div>
  );
}
