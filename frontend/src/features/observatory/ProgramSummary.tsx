/**
 * ProgramSummary — LLM summary stub card.
 * Teal left border, small-caps label, Newsreader body text.
 */
interface ProgramSummaryProps {
  weekCount: number;
  peopleCount?: number;
}

export function ProgramSummary({ weekCount, peopleCount = 0 }: ProgramSummaryProps) {
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg border-l-4 border-l-accent p-5">
      <p
        className="text-xs font-semibold tracking-widest uppercase mb-3"
        style={{ color: 'var(--color-accent)', fontVariant: 'small-caps' }}
      >
        Program Summary
      </p>
      <p
        className="text-base leading-relaxed text-on-surface"
        style={{ fontFamily: 'Newsreader, Georgia, serif' }}
      >
        Summary will be generated after LLM integration. Currently showing data for{' '}
        <strong>{weekCount}</strong> reconciled week{weekCount !== 1 ? 's' : ''} across{' '}
        <strong>{peopleCount}</strong> contributor{peopleCount !== 1 ? 's' : ''}.
      </p>
      <p className="mt-3 text-xs text-on-surface-variant">
        Generated from reconciliation data
      </p>
    </div>
  );
}
