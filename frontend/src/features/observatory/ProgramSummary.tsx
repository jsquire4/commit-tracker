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
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 w-full bg-surface-container rounded-sm" />
          <div className="h-4 w-5/6 bg-surface-container rounded-sm" />
          <div className="h-4 w-4/5 bg-surface-container rounded-sm" />
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
