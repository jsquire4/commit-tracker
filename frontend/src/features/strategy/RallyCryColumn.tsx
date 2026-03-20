import { ObjectiveCard } from './ObjectiveCard';
import { StrategyDropdownMenu } from './StrategyDropdownMenu';
import type { RallyCryNode, DefiningObjectiveNode, OutcomeNode } from '@/types';

interface RallyCryColumnProps {
  rallyCry: RallyCryNode;
  onEditRallyCry: () => void;
  onArchiveRallyCry: () => void;
  onEditObjective: (obj: DefiningObjectiveNode) => void;
  onArchiveObjective: (obj: DefiningObjectiveNode) => void;
  onAddObjective: () => void;
  onEditOutcome: (outcome: OutcomeNode, obj: DefiningObjectiveNode) => void;
  onArchiveOutcome: (outcome: OutcomeNode) => void;
  onAddOutcome: (obj: DefiningObjectiveNode) => void;
}

export function RallyCryColumn({
  rallyCry,
  onEditRallyCry,
  onArchiveRallyCry,
  onEditObjective,
  onArchiveObjective,
  onAddObjective,
  onEditOutcome,
  onArchiveOutcome,
  onAddOutcome,
}: RallyCryColumnProps) {
  const objectiveCount = rallyCry.definingObjectives.length;
  const outcomeCount = rallyCry.definingObjectives.reduce(
    (sum, d) => sum + d.outcomes.length,
    0,
  );

  return (
    <div
      className="group min-w-[340px] max-w-[440px] flex-[1_0_340px]
        flex flex-col animate-fade-up
        [&+&]:before:content-[''] [&+&]:before:absolute [&+&]:before:-left-4
        [&+&]:before:top-0 [&+&]:before:bottom-0 [&+&]:before:w-px
        [&+&]:before:bg-outline-variant/15 relative"
    >
      {/* Column Header */}
      <div className="bg-surface-lowest rounded-t-sm px-6 pt-6 pb-4 relative border-b-2 border-b-accent">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-[1.1875rem] font-medium text-on-surface leading-tight pr-6">
            {rallyCry.title}
          </h3>
          <StrategyDropdownMenu onEdit={onEditRallyCry} onArchive={onArchiveRallyCry} />
        </div>

        {rallyCry.description && (
          <p className="mt-1.5 text-[0.8125rem] text-on-surface-variant leading-relaxed">
            {rallyCry.description}
          </p>
        )}

        <div className="mt-2.5 text-[0.6875rem] text-muted tabular-nums">
          {objectiveCount} objective{objectiveCount !== 1 ? 's' : ''} &middot;{' '}
          {outcomeCount} outcome{outcomeCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Column Body */}
      <div className="bg-surface-container-low rounded-b-sm p-4 flex-1 flex flex-col gap-3">
        {rallyCry.definingObjectives.map((obj) => (
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            onEdit={() => { onEditObjective(obj); }}
            onArchive={() => { onArchiveObjective(obj); }}
            onEditOutcome={(oc) => { onEditOutcome(oc, obj); }}
            onArchiveOutcome={onArchiveOutcome}
            onAddOutcome={() => { onAddOutcome(obj); }}
          />
        ))}

        {/* Add objective link */}
        <button
          type="button"
          onClick={onAddObjective}
          className="text-[0.8125rem] text-accent bg-transparent border-0 px-2 py-2
            cursor-pointer relative inline-block text-left transition-colors duration-[150ms]
            hover:text-accent-dark
            after:content-[''] after:absolute after:bottom-1.5 after:left-2 after:w-0
            after:h-px after:bg-accent-dark after:transition-[width] after:duration-[200ms]
            hover:after:w-[calc(100%-1rem)]"
        >
          + Add objective
        </button>
      </div>
    </div>
  );
}
