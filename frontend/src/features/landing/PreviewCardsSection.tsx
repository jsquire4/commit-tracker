import { useRef } from 'react';
import { useFadeUp } from '../../hooks/useMotion';
import { RevealCard } from '../../components/RevealCard';

/* ── Static view mockups ─────────────────────────────────────────── */

function BriefingMockup() {
  return (
    <div className="flex flex-col gap-3">
      {/* Narrative card */}
      <div className="bg-surface-container-low rounded-sm p-4 border border-outline-variant/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-accent/60" />
          <div className="h-2 bg-accent/20 rounded w-24" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-2.5 bg-on-surface/10 rounded w-full" />
          <div className="h-2.5 bg-on-surface/10 rounded w-5/6" />
          <div className="h-2.5 bg-on-surface/10 rounded w-full" />
          <div className="h-2.5 bg-accent/15 rounded w-3/4" />
          <div className="h-2.5 bg-on-surface/10 rounded w-full" />
          <div className="h-2.5 bg-on-surface/10 rounded w-4/5" />
        </div>
      </div>
      {/* Metrics strip */}
      <div className="grid grid-cols-3 gap-2">
        {['Alignment', 'Coverage', 'Drift'].map((label) => (
          <div key={label} className="bg-surface-lowest rounded-sm p-2.5 text-center border border-outline-variant/15">
            <div className="font-serif text-[1rem] text-accent">—</div>
            <div className="text-[0.6rem] text-muted uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      {/* Chat input suggestion */}
      <div className="bg-surface-lowest rounded-sm px-3 py-2 border border-outline-variant/15 flex items-center gap-2">
        <div className="h-2 bg-surface-container rounded w-full" />
        <div className="w-5 h-5 rounded-sm bg-accent/15 flex-shrink-0" />
      </div>
    </div>
  );
}

function MyTeamMockup() {
  const members = [
    { initials: 'EC', chess: [55, 20, 15, 10] },
    { initials: 'RC', chess: [30, 45, 15, 10] },
    { initials: 'TJ', chess: [20, 30, 35, 15] },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="h-2 bg-on-surface/10 rounded w-16" />
        <div className="flex gap-1">
          {['S', 'O', 'D', 'C'].map((cat) => (
            <div key={cat} className="text-[0.6rem] text-muted w-6 text-center font-medium">{cat}</div>
          ))}
        </div>
      </div>
      {members.map(({ initials, chess }) => (
        <div
          key={initials}
          className="bg-surface-lowest rounded-sm px-3 py-2.5 border border-outline-variant/15 flex items-center gap-3"
        >
          {/* Avatar */}
          <div className="w-6 h-6 rounded-sm bg-accent text-white text-[0.6rem] font-medium flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          {/* Name placeholder */}
          <div className="h-2 bg-on-surface/10 rounded flex-1" />
          {/* CHESS mini bar */}
          <div className="flex gap-0.5 items-end h-5">
            {chess.map((pct, i) => (
              <div
                key={i}
                className="w-5 rounded-sm"
                style={{
                  height: `${Math.round((pct / 55) * 20)}px`,
                  background: i === 0
                    ? 'rgb(var(--color-accent-rgb) / 0.6)'
                    : i === 1
                    ? 'rgb(var(--color-on-surface-variant-rgb) / 0.25)'
                    : i === 2
                    ? 'rgb(var(--color-error-rgb) / 0.3)'
                    : 'rgb(var(--color-navy-rgb) / 0.35)',
                }}
              />
            ))}
          </div>
        </div>
      ))}
      {/* Summary tag strip */}
      <div className="flex gap-1.5 mt-1 flex-wrap">
        {['3 carry-forwards', '1 unlinked', '2 assigned'].map((tag) => (
          <span key={tag} className="bg-accent/10 text-accent rounded-full px-2 py-0.5 text-[0.6rem] font-medium">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function MyWeekMockup() {
  const commitments = [
    { title: 'ERP migration sprint planning', tags: ['Strategic', 'Systems Design'] },
    { title: 'Q2 capacity review with ops', tags: ['Operational'] },
    { title: 'Cross-team sync — engineering', tags: ['Strategic', 'Leadership'] },
  ];
  return (
    <div className="flex flex-col gap-3">
      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { num: '4', label: 'This Week' },
          { num: '75%', label: 'Strategic' },
          { num: '1', label: 'Carry-fwd' },
          { num: '2', label: 'Assigned' },
        ].map(({ num, label }) => (
          <div key={label} className="bg-surface-lowest rounded-sm p-2 text-center border border-outline-variant/15">
            <div className="font-serif text-[0.9rem] text-on-surface">{num}</div>
            <div className="text-[0.55rem] text-muted uppercase tracking-wide mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>
      {/* Commitment cards */}
      {commitments.map(({ title, tags }) => (
        <div
          key={title}
          className="bg-surface-lowest rounded-sm px-3 py-2.5 border border-outline-variant/15"
        >
          <div className="text-[0.7rem] font-medium text-on-surface mb-1.5 leading-snug">{title}</div>
          <div className="flex gap-1 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="bg-accent/10 text-accent rounded-full px-2 py-0.5 text-[0.6rem] font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Preview card shell ──────────────────────────────────────────── */

const PREVIEWS = [
  {
    header: 'The Briefing',
    label: 'AI-generated executive intelligence',
    description:
      'Conversational analytics with drift detection, coverage analysis, and actionable recommendations.',
    mockup: <BriefingMockup />,
  },
  {
    header: 'My Team',
    label: 'Team alignment at a glance',
    description:
      'Manager view with per-person alignment, assignment tools, and displacement pattern tracking.',
    mockup: <MyTeamMockup />,
  },
  {
    header: 'My Week',
    label: 'Your commitments, linked to strategy',
    description:
      'Enter, rank, and reconcile weekly priorities in under a minute. Every item maps to the strategic framework.',
    mockup: <MyWeekMockup />,
  },
];

function PreviewCard({ preview, index }: { preview: (typeof PREVIEWS)[number]; index: number }) {
  return (
    <RevealCard index={index} className="border-[1.5px] border-accent rounded-sm p-6 bg-surface-lowest transition-shadow duration-150 hover:shadow-whisper flex flex-col gap-5">
      <div className="font-sans text-small font-medium uppercase tracking-[0.05rem] text-accent">
        {preview.header}
      </div>

      {/* Static view mockup */}
      <div className="flex-1">
        {preview.mockup}
      </div>

      <div>
        <div className="font-serif text-title font-normal text-on-surface text-center">
          {preview.label}
        </div>
        <div className="font-sans text-[0.8125rem] text-on-surface-variant text-center mt-2 leading-[1.6]">
          {preview.description}
        </div>
      </div>
    </RevealCard>
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
