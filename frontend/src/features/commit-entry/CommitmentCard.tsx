import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/Badge';
import type { Commitment, CycleState } from '@/types';

interface CommitmentCardProps {
  commitment: Commitment;
  cycleState: CycleState;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isAssigned?: boolean;
}

const HORIZON_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  MIDDAY: 'Midday',
  AFTERNOON: 'Afternoon',
  EOD: 'EOD',
  EOW: 'EOW',
};

/** Maps display names from the API (chessCategoryName) to Badge category colors */
const DISPLAY_NAME_TO_VARIANT: Record<string, 'strategic' | 'operational' | 'defensive' | 'capability'> = {
  Strategic: 'strategic',
  Operational: 'operational',
  Defensive: 'defensive',
  'Capability Building': 'capability',
};

export function CommitmentCard({ commitment, cycleState, onEdit, onDelete: _onDelete, isAssigned }: CommitmentCardProps) {
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

  const categoryName = commitment.chessCategoryName;
  const categoryVariant = categoryName ? DISPLAY_NAME_TO_VARIANT[categoryName] ?? null : null;
  const hasAssignedBy = commitment.attribution.kind === 'ASSIGNED_BY';
  const showAccent = isAssigned || hasAssignedBy;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'bg-surface-lowest rounded-sm relative group',
        'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'hover:bg-surface',
        showAccent ? 'border-l-[3px] border-l-accent' : '',
        isDragging ? 'opacity-70 shadow-whisper' : '',
      ].join(' ')}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle — braille dots */}
          {isDraft && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="flex-shrink-0 mt-0.5 text-muted opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none focus:outline-none transition-opacity duration-[var(--duration-fast)]"
              aria-label="Drag to reorder"
            >
              <span className="text-base leading-none select-none">&#10303;</span>
            </button>
          )}

          {/* Priority rank circle */}
          <div className={[
            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
            showAccent
              ? 'bg-accent text-white'
              : 'bg-surface-container',
          ].join(' ')}>
            <span className={[
              'text-small font-semibold',
              showAccent ? 'text-white' : 'text-on-surface-variant',
            ].join(' ')}>
              {showAccent ? 'A' : `#${commitment.priorityRank}`}
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Assigned by label */}
            {hasAssignedBy && (
              <div className="flex items-center gap-1 text-small text-accent font-medium mb-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
                Assigned by {commitment.attribution.kind === 'ASSIGNED_BY' ? commitment.attribution.assignedByName : ''}
              </div>
            )}

            {/* Title */}
            <h3 className="text-title font-medium text-on-surface leading-snug">{commitment.title}</h3>

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="default" size="sm">
                {HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon}
              </Badge>

              {categoryVariant && (
                <Badge variant="category" color={categoryVariant} size="sm">
                  {categoryName}
                </Badge>
              )}

              {commitment.rcdoLink.rallyCryId ? (
                <a
                  href="#"
                  className="text-small text-accent font-medium hover:text-accent-dark transition-colors duration-[var(--duration-fast)]"
                  onClick={(e) => e.preventDefault()}
                >
                  &rarr; {commitment.rcdoLink.rallyCryTitle}
                </a>
              ) : (
                <span className="text-small text-muted italic">Unlinked</span>
              )}

              {commitment.isUnplanned && (
                <Badge variant="default" size="sm">Unplanned</Badge>
              )}
            </div>

            {/* Expandable task bullets */}
            {expanded && commitment.bullets.length > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant flex flex-col gap-2">
                {commitment.bullets.map((bullet) => (
                  <label key={bullet.id} className="flex items-start gap-2 text-[0.8125rem] text-on-surface-variant cursor-default">
                    <input
                      type="checkbox"
                      checked={bullet.isCompleted}
                      readOnly
                      className="flex-shrink-0 w-4 h-4 rounded-sm border-[1.5px] border-outline-variant bg-surface-lowest mt-0.5 accent-accent"
                    />
                    <span className={bullet.isCompleted ? 'line-through text-muted' : ''}>
                      {bullet.body}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Right side: edit pencil + chevron */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {/* Edit pencil — visible on hover */}
            {isDraft && (
              <button
                type="button"
                onClick={() => { onEdit(commitment.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent focus:outline-none transition-opacity duration-[var(--duration-fast)]"
                aria-label="Edit commitment"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Expand chevron */}
            {commitment.bullets.length > 0 && (
              <button
                type="button"
                onClick={() => { setExpanded((prev) => !prev); }}
                className="p-1 text-muted hover:text-on-surface-variant focus:outline-none transition-colors duration-[var(--duration-fast)]"
                aria-label={expanded ? 'Collapse bullets' : 'Expand bullets'}
                aria-expanded={expanded}
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
