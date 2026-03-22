/**
 * ProgramSummary — LLM-generated narrative card.
 * Teal left border, small-caps label, Newsreader body text.
 * Shows a spinner while the LLM is generating; falls back gracefully on error.
 */
import { useProgramSummary } from '@/hooks/useObservatory';

interface ProgramSummaryProps {
  weekCount: number;
}

export function ProgramSummary({ weekCount }: ProgramSummaryProps) {
  const { data, isLoading, isError } = useProgramSummary(weekCount);

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg border-l-4 border-l-accent p-5">
      <p
        className="text-xs font-semibold tracking-widest uppercase mb-3"
        style={{ color: 'var(--color-accent)', fontVariant: 'small-caps' }}
      >
        Program Summary
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-on-surface-variant">
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm italic">Generating summary…</span>
        </div>
      ) : isError ? (
        <p
          className="text-base leading-relaxed text-on-surface-variant italic"
          style={{ fontFamily: 'Newsreader, Georgia, serif' }}
        >
          Summary unavailable. Please try again later.
        </p>
      ) : (
        <p
          className="text-base leading-relaxed text-on-surface"
          style={{ fontFamily: 'Newsreader, Georgia, serif' }}
        >
          {data?.narrative}
        </p>
      )}

      <p className="mt-3 text-xs text-on-surface-variant">
        Generated from {weekCount} reconciled week{weekCount !== 1 ? 's' : ''} of data
      </p>
    </div>
  );
}
