/**
 * BriefingNarrativeCard — AI-generated narrative with timestamp,
 * suggested focus areas, and collapsible sources/citations.
 */
import { useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import type { BriefingResponse } from '@/types/briefing.types';

interface BriefingNarrativeCardProps {
  briefing: BriefingResponse;
  onExportPdf?: () => void;
}

export function BriefingNarrativeCard({ briefing, onExportPdf }: BriefingNarrativeCardProps) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const generatedDate = new Date(briefing.generatedAt);
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
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="label-caps text-muted">
          AI Briefing &middot; Generated {dateLabel} {timeLabel}
        </span>
        {onExportPdf && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportPdf}
            className="!border !border-accent !bg-transparent !text-accent hover:!bg-accent hover:!text-white"
          >
            Export PDF &darr;
          </Button>
        )}
      </div>

      {/* Headline */}
      <h2 className="font-serif text-headline text-on-surface mb-4 font-normal">
        {briefing.headline}
      </h2>

      {/* Narrative prose */}
      <p className="text-[0.9375rem] leading-[1.7] text-on-surface mb-6">
        {briefing.narrative}
      </p>

      {/* Sources & Validation */}
      {briefing.citations.length > 0 && (
        <div className="border-t border-outline-variant pt-4 mb-6">
          <button
            type="button"
            className="text-[0.8125rem] text-muted bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-on-surface-variant"
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            aria-expanded={sourcesExpanded}
          >
            {sourcesExpanded ? 'Hide sources' : 'View sources'}{' '}
            <span className="text-[0.75rem]">{sourcesExpanded ? '\u25B4' : '\u25BE'}</span>
          </button>

          <div
            className="overflow-hidden transition-all"
            style={{
              maxHeight: sourcesExpanded ? '400px' : '0',
              opacity: sourcesExpanded ? 1 : 0,
              transitionDuration: 'var(--duration-entrance, 300ms)',
              transitionTimingFunction: 'var(--ease-entrance)',
            }}
          >
            <ul className="mt-3 space-y-2">
              {briefing.citations.map((c) => (
                <li key={c.id} className="flex items-baseline gap-2 text-[0.8125rem] text-on-surface-variant">
                  <span>{c.label}</span>
                  <span className="text-[0.75rem] font-mono text-muted">&mdash; {c.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.75rem] text-muted italic">
              All metrics validated against source data. AI narrative generated from verified inputs only.
            </p>
          </div>
        </div>
      )}

      {/* Suggested Focus Areas */}
      {briefing.suggestions.length > 0 && (
        <>
          <h3 className="font-serif text-[1.125rem] text-on-surface mb-3 font-normal">
            Suggested Focus Areas
          </h3>
          <ul className="space-y-2">
            {briefing.suggestions.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-[0.9375rem] leading-[1.6] text-on-surface">
                <span className="text-accent font-medium flex-shrink-0 mt-px">&rarr;</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
