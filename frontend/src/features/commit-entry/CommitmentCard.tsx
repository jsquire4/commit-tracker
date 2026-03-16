import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/Badge';
import type { Commitment, CycleState, ChessCategoryType } from '@/types';

interface CommitmentCardProps {
  commitment: Commitment;
  cycleState: CycleState;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const HORIZON_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  MIDDAY: 'Midday',
  AFTERNOON: 'Afternoon',
  EOD: 'EOD',
  EOW: 'EOW',
};

const CATEGORY_VARIANTS: Record<ChessCategoryType, 'strategic' | 'operational' | 'defensive' | 'capability'> = {
  STRATEGIC: 'strategic',
  OPERATIONAL: 'operational',
  DEFENSIVE: 'defensive',
  CAPABILITY_BUILDING: 'capability',
};

const CATEGORY_LABELS: Record<ChessCategoryType, string> = {
  STRATEGIC: 'Strategic',
  OPERATIONAL: 'Operational',
  DEFENSIVE: 'Defensive',
  CAPABILITY_BUILDING: 'Capability Building',
};

interface ExpandButtonProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

function ExpandButton({ expanded, onToggle, className = '' }: ExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`p-1 text-gray-400 hover:text-gray-600 focus:outline-none rounded transition-colors ${className}`}
      aria-label={expanded ? 'Collapse bullets' : 'Expand bullets'}
      aria-expanded={expanded}
    >
      <svg
        className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function CommitmentCard({ commitment, cycleState, onEdit, onDelete }: CommitmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDraft = cycleState === 'DRAFT';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: commitment.id, disabled: !isDraft });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const categoryKey = commitment.chessCategoryName as ChessCategoryType | null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'bg-white rounded-lg border shadow-sm transition-shadow',
        isDragging ? 'shadow-lg opacity-70 border-blue-300' : 'border-gray-200 hover:shadow-md',
      ].join(' ')}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {isDraft && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none focus:outline-none"
              aria-label="Drag to reorder"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Priority rank */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500">{commitment.priorityRank}</span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <button
              type="button"
              onClick={() => { setExpanded((prev) => !prev); }}
              className="w-full text-left focus:outline-none"
            >
              <h3 className="text-sm font-semibold text-gray-900 leading-snug">{commitment.title}</h3>
            </button>

            {/* RCDO breadcrumb */}
            {commitment.rcdoLink.rallyCryId && (
              <p className="mt-0.5 text-xs text-gray-400 truncate">
                {commitment.rcdoLink.rallyCryId}
                {commitment.rcdoLink.definingObjectiveId && ` › ${commitment.rcdoLink.definingObjectiveId}`}
                {commitment.rcdoLink.outcomeId && ` › ${commitment.rcdoLink.outcomeId}`}
              </p>
            )}

            {/* Badges row */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {categoryKey && (
                <Badge variant={CATEGORY_VARIANTS[categoryKey]}>
                  {CATEGORY_LABELS[categoryKey]}
                </Badge>
              )}
              <Badge variant="blue">{HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon}</Badge>
              {commitment.attribution.kind === 'ASSIGNED_BY' && (
                <Badge variant="yellow">
                  Assigned by {commitment.attribution.assignedByName}
                </Badge>
              )}
              {commitment.isUnplanned && (
                <Badge variant="gray">Unplanned</Badge>
              )}
            </div>

            {/* Expanded bullets */}
            {expanded && commitment.bullets.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                {commitment.bullets.map((bullet) => (
                  <li key={bullet.id} className="flex items-start gap-2 text-xs text-gray-600">
                    <span
                      className={`flex-shrink-0 mt-0.5 w-3 h-3 rounded-full border ${bullet.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                    />
                    <span className={bullet.isCompleted ? 'line-through text-gray-400' : ''}>
                      {bullet.body}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions (DRAFT only) */}
          {isDraft && (
            <div className="flex-shrink-0 flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => { onEdit(commitment.id); }}
                className="p-1 text-gray-400 hover:text-blue-600 focus:outline-none rounded transition-colors"
                aria-label="Edit commitment"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { onDelete(commitment.id); }}
                className="p-1 text-gray-400 hover:text-red-600 focus:outline-none rounded transition-colors"
                aria-label="Delete commitment"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {/* Expand toggle */}
              {commitment.bullets.length > 0 && (
                <ExpandButton expanded={expanded} onToggle={() => { setExpanded((prev) => !prev); }} />
              )}
            </div>
          )}

          {/* Non-draft: just expand toggle */}
          {!isDraft && commitment.bullets.length > 0 && (
            <ExpandButton
              expanded={expanded}
              onToggle={() => { setExpanded((prev) => !prev); }}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
