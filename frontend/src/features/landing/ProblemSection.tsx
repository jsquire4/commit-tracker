import { useRef } from 'react';
import { useFadeUp } from '../../hooks/useMotion';

// Landing page section transition colors
const BG_WARM = '#F5F0EB';
const BG_SURFACE = '#F9F9F7';

const PROBLEMS = [
  {
    title: 'Information Asymmetry',
    description:
      "Leadership doesn't know what's actually happening at the IC level. Weekly reports are curated theater. By the time misalignment surfaces, you've lost months.",
  },
  {
    title: 'Drift is Silent',
    description:
      "The dangerous situation isn't a team at 40% strategic. It's a team that was 80% strategic in Week 2 and is 40% now — without anyone making a conscious decision.",
  },
  {
    title: 'Middle Management is the Lever',
    description:
      'ICs follow what managers assign. A manager who assigns 80% operational work is a risk to strategic execution, whether intentionally or not. You need to see this.',
  },
];

function ProblemCard({ title, description, index }: { title: string; description: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref);

  return (
    <div
      ref={ref}
      className="reveal"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <h3 className="font-sans text-title font-medium text-on-surface mb-3">
        {title}
      </h3>
      <p className="text-body text-on-surface-variant leading-[1.7]">
        {description}
      </p>
    </div>
  );
}

export function ProblemSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useFadeUp(headlineRef);

  return (
    <>
      {/* Gradient transition into warm */}
      <div className="h-[60px]" style={{ background: `linear-gradient(to bottom, ${BG_SURFACE}, ${BG_WARM})` }} />

      <section className="py-20" style={{ background: BG_WARM }}>
        <div className="mx-auto max-w-[1080px] px-10">
          <h2
            ref={headlineRef}
            className="reveal font-serif text-headline font-normal text-on-surface mb-12 text-center"
          >
            The Problem
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {PROBLEMS.map((p, i) => (
              <ProblemCard key={p.title} title={p.title} description={p.description} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Gradient transition out of warm */}
      <div className="h-[60px]" style={{ background: `linear-gradient(to bottom, ${BG_WARM}, ${BG_SURFACE})` }} />
    </>
  );
}
