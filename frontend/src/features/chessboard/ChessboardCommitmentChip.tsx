import { useState } from 'react';
import type { Commitment } from '@/types';
import type { CompletionHorizon } from '@/types/enums';

interface ChessboardCommitmentChipProps {
  commitment: Commitment;
}

/** Returns a Tailwind bg color class based on horizon — darker means longer horizon */
function horizonBgClass(horizon: CompletionHorizon): string {
  switch (horizon) {
    case 'MORNING':
      return 'bg-blue-100 text-blue-800';
    case 'MIDDAY':
      return 'bg-blue-200 text-blue-900';
    case 'AFTERNOON':
      return 'bg-blue-300 text-blue-900';
    case 'EOD':
      return 'bg-blue-400 text-blue-950';
    case 'EOW':
      return 'bg-blue-600 text-white';
  }
}

/** Returns a Tailwind bg color class for the horizon indicator dot */
function horizonDotClass(horizon: CompletionHorizon): string {
  switch (horizon) {
    case 'MORNING':
      return 'bg-blue-300';
    case 'MIDDAY':
      return 'bg-blue-400';
    case 'AFTERNOON':
      return 'bg-blue-500';
    case 'EOD':
      return 'bg-blue-600';
    case 'EOW':
      return 'bg-blue-800';
  }
}

function horizonLabel(horizon: CompletionHorizon): string {
  switch (horizon) {
    case 'MORNING':
      return 'Morning';
    case 'MIDDAY':
      return 'Midday';
    case 'AFTERNOON':
      return 'Afternoon';
    case 'EOD':
      return 'End of Day';
    case 'EOW':
      return 'End of Week';
  }
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function buildRcdoBreadcrumb(commitment: Commitment): string | null {
  const parts: string[] = [];
  if (commitment.rcdoLink.rallyCryId) parts.push('Rally Cry');
  if (commitment.rcdoLink.definingObjectiveId) parts.push('DO');
  if (commitment.rcdoLink.outcomeId) parts.push('Outcome');
  return parts.length > 0 ? parts.join(' › ') : null;
}

export function ChessboardCommitmentChip({ commitment }: ChessboardCommitmentChipProps) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const rcdoBreadcrumb = buildRcdoBreadcrumb(commitment);

  return (
    <div
      className="relative"
      onMouseEnter={() => { setPopoverVisible(true); }}
      onMouseLeave={() => { setPopoverVisible(false); }}
      onFocus={() => { setPopoverVisible(true); }}
      onBlur={() => { setPopoverVisible(false); }}
    >
      {/* Chip pill */}
      <div
        tabIndex={0}
        role="button"
        aria-label={commitment.title}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default',
          'border border-transparent transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-400',
          horizonBgClass(commitment.completionHorizon),
        ].join(' ')}
      >
        {/* Horizon indicator dot */}
        <span
          className={[
            'inline-block w-2 h-2 rounded-full flex-shrink-0',
            horizonDotClass(commitment.completionHorizon),
          ].join(' ')}
          aria-hidden="true"
        />
        <span className="truncate max-w-[180px]">
          {truncate(commitment.title, 30)}
        </span>
      </div>

      {/* Hover popover */}
      {popoverVisible && (
        <div
          role="tooltip"
          className={[
            'absolute z-50 bottom-full left-0 mb-2 w-72',
            'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3',
            'text-sm text-gray-700 dark:text-gray-300',
          ].join(' ')}
        >
          {/* Full title */}
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{commitment.title}</p>

          {/* RCDO breadcrumb */}
          {rcdoBreadcrumb && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">{rcdoBreadcrumb}</p>
          )}

          {/* Horizon */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Horizon: <span className="font-medium">{horizonLabel(commitment.completionHorizon)}</span>
          </p>

          {/* Bullets */}
          {commitment.bullets.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
              {commitment.bullets.map((bullet) => (
                <li key={bullet.id} className={bullet.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                  {bullet.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
