import { OutcomeRow } from './OutcomeRow';
import { StrategyDropdownMenu } from './StrategyDropdownMenu';
import type { DefiningObjectiveNode, OutcomeNode } from '@/types';

interface ObjectiveCardProps {
  objective: DefiningObjectiveNode;
  onEdit: () => void;
  onArchive: () => void;
  onEditOutcome: (outcome: OutcomeNode) => void;
  onArchiveOutcome: (outcome: OutcomeNode) => void;
  onAddOutcome: () => void;
}

export function ObjectiveCard({
  objective,
  onEdit,
  onArchive,
  onEditOutcome,
  onArchiveOutcome,
  onAddOutcome,
}: ObjectiveCardProps) {
  return (
    <div
      className="group/card bg-surface-lowest rounded-sm p-4
        transition-colors duration-[150ms] hover:bg-[#FEFEFE]
        animate-fade-up"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-body font-medium text-on-surface leading-snug">
            {objective.title}
          </div>
          {objective.description && (
            <div className="mt-0.5 text-[0.8125rem] text-on-surface-variant leading-relaxed">
              {objective.description}
            </div>
          )}
        </div>
        <StrategyDropdownMenu onEdit={onEdit} onArchive={onArchive} />
      </div>

      {/* Meta: owner badge + linked count */}
      <div className="flex items-center gap-2.5 mt-2">
        {objective.ownerDisplayName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full
            text-[0.6875rem] font-medium bg-surface-container text-on-surface-variant">
            {objective.ownerDisplayName}
          </span>
        )}
      </div>

      {/* Outcomes divider + list */}
      {objective.outcomes.length > 0 && (
        <>
          <hr className="border-0 border-t border-outline-variant my-2.5" />
          <div className="flex flex-col gap-0.5">
            {objective.outcomes.map((oc) => (
              <OutcomeRow
                key={oc.id}
                outcome={oc}
                onEdit={() => { onEditOutcome(oc); }}
                onArchive={() => { onArchiveOutcome(oc); }}
              />
            ))}
          </div>
        </>
      )}

      {/* Add outcome link */}
      <button
        type="button"
        onClick={onAddOutcome}
        className="mt-2 text-[0.75rem] text-accent bg-transparent border-0 px-2 py-1
          cursor-pointer relative inline-block transition-colors duration-[150ms]
          hover:text-accent-dark
          after:content-[''] after:absolute after:bottom-0.5 after:left-2 after:w-0
          after:h-px after:bg-accent-dark after:transition-[width] after:duration-[200ms]
          hover:after:w-[calc(100%-1rem)]"
      >
        + Add outcome
      </button>
    </div>
  );
}
