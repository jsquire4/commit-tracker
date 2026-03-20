import { useRef } from 'react';
import { useFadeUp } from '../../hooks/useMotion';

const PREVIEWS = [
  {
    header: 'The Briefing',
    label: 'AI-generated executive intelligence',
    description:
      'Conversational analytics with drift detection, coverage analysis, and actionable recommendations.',
    lines: [
      { width: 'w-full', accent: true },
      { width: 'w-3/4', accent: false },
      { width: 'w-full', accent: false },
      { width: 'w-1/2', accent: true },
      { width: 'w-3/4', accent: false },
      { width: 'w-full', accent: false },
      { width: 'w-3/4', accent: false },
      { width: 'w-1/2', accent: false },
    ],
  },
  {
    header: 'My Team',
    label: 'Team alignment at a glance',
    description:
      'Manager view with per-person alignment, assignment tools, and displacement pattern tracking.',
    lines: [
      { width: 'w-1/2', accent: true },
      { width: 'w-full', accent: false },
      { width: 'w-1/2', accent: true },
      { width: 'w-full', accent: false },
      { width: 'w-1/2', accent: true },
      { width: 'w-3/4', accent: false },
      { width: 'w-full', accent: false },
      { width: 'w-1/2', accent: false },
    ],
  },
  {
    header: 'My Week',
    label: 'Your commitments, linked to strategy',
    description:
      'Enter, rank, and reconcile weekly priorities in under a minute. Every item maps to the strategic framework.',
    lines: [
      { width: 'w-3/4', accent: true },
      { width: 'w-full', accent: false },
      { width: 'w-3/4', accent: true },
      { width: 'w-full', accent: false },
      { width: 'w-3/4', accent: true },
      { width: 'w-1/2', accent: false },
      { width: 'w-3/4', accent: false },
      { width: 'w-1/2', accent: true },
    ],
  },
];

function PreviewCard({ preview, index }: { preview: (typeof PREVIEWS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref);

  return (
    <div
      ref={ref}
      className="reveal border-[1.5px] border-accent rounded-sm p-8 bg-surface-lowest transition-shadow duration-150 hover:shadow-whisper"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="font-sans text-small font-medium uppercase tracking-[0.05rem] text-accent mb-5">
        {preview.header}
      </div>

      <div className="flex flex-col gap-3">
        {preview.lines.map((line, i) => (
          <div
            key={i}
            className={`h-2 rounded-sm ${line.width} ${
              line.accent ? 'bg-accent/[0.15]' : 'bg-surface-container'
            }`}
          />
        ))}
      </div>

      <div className="font-serif text-title font-normal text-on-surface mt-5 text-center">
        {preview.label}
      </div>
      <div className="font-sans text-[0.8125rem] text-on-surface-variant text-center mt-2 leading-[1.6]">
        {preview.description}
      </div>
    </div>
  );
}

export function PreviewCardsSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useFadeUp(headlineRef);

  return (
    <section id="see-it" className="py-20 bg-surface">
      <div className="mx-auto max-w-[1080px] px-10">
        <h2
          ref={headlineRef}
          className="reveal font-serif text-headline font-normal text-on-surface mb-12 text-center"
        >
          See It in Action
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PREVIEWS.map((p, i) => (
            <PreviewCard key={p.header} preview={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
