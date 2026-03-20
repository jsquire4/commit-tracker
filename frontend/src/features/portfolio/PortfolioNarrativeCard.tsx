/**
 * PortfolioNarrativeCard — AI narrative stub for portfolio.
 * Same pattern as BriefingNarrativeCard.
 */
import Card from '@/components/Card';
import type { PortfolioNarrative } from '@/types/portfolio.types';

interface PortfolioNarrativeCardProps {
  narrative: PortfolioNarrative;
}

export function PortfolioNarrativeCard({ narrative }: PortfolioNarrativeCardProps) {
  const generatedDate = new Date(narrative.generatedAt);
  const dateLabel = generatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = generatedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Card padding="spacious" className="animate-fade-up">
      {/* Label */}
      <div className="label-caps text-muted mb-4">
        AI Briefing &middot; Portfolio Overview &middot; Generated {dateLabel} {timeLabel}
      </div>

      {/* Headline */}
      <h2 className="font-serif text-headline text-on-surface mb-4 font-normal">
        {narrative.headline}
      </h2>

      {/* Narrative prose */}
      <p className="text-[0.9375rem] leading-[1.7] text-on-surface mb-6">
        {narrative.narrative}
      </p>

      {/* Suggested Focus Areas */}
      {narrative.focusAreas.length > 0 && (
        <>
          <h3 className="font-serif text-[1.125rem] text-on-surface mb-3 font-normal">
            Suggested Focus Areas
          </h3>
          <ul className="space-y-2">
            {narrative.focusAreas.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-2 text-[0.9375rem] leading-[1.6] text-on-surface"
              >
                <span className="text-accent font-medium flex-shrink-0 mt-px">&rarr;</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
