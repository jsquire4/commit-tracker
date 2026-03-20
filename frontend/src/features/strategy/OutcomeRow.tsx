import { StrategyDropdownMenu } from './StrategyDropdownMenu';
import type { OutcomeNode } from '@/types';

interface OutcomeRowProps {
  outcome: OutcomeNode;
  onEdit: () => void;
  onArchive: () => void;
}

export function OutcomeRow({ outcome, onEdit, onArchive }: OutcomeRowProps) {
  // Count linked commitments — not provided from tree endpoint, so we show description-based info
  // The linked count would come from a backend join; for now we omit unless extended
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded-sm
        transition-colors duration-[150ms] hover:bg-surface-container-low
        animate-fade-up"
    >
      {/* Bullet */}
      <span className="w-[5px] h-[5px] rounded-full bg-muted flex-shrink-0" />

      {/* Title */}
      <span className="flex-1 min-w-0 text-[0.8125rem] text-on-surface truncate">
        {outcome.title}
      </span>

      {/* Owner */}
      {outcome.ownerDisplayName && (
        <span className="text-[0.6875rem] text-muted flex-shrink-0">
          {outcome.ownerDisplayName}
        </span>
      )}

      {/* Three-dot menu */}
      <StrategyDropdownMenu onEdit={onEdit} onArchive={onArchive} />
    </div>
  );
}
