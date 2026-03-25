import { useHasDraftCycles } from './WeekRangeSelector';

/**
 * Amber warning banner shown globally when the selected date range
 * includes unreconciled (DRAFT) cycles.
 */
export function DraftDisclaimer() {
  const { hasDraft, draftLabel } = useHasDraftCycles();

  if (!hasDraft) return null;

  return (
    <div className="bg-warning/[0.06] border-b border-warning/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-2.5">
        <svg className="w-4 h-4 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-small text-on-surface-variant">
          <span className="font-medium text-on-surface">Includes unreconciled data</span>
          {' — '}
          {draftLabel} {draftLabel?.includes(',') ? 'have' : 'has'} not been locked yet. Numbers may change.
        </p>
      </div>
    </div>
  );
}
