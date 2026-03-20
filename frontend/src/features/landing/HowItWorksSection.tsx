import { useRef, useEffect, useState } from 'react';
import { useFadeUp } from '../../hooks/useMotion';

const STEPS = [
  {
    number: 'Step 1',
    title: 'Set Strategy',
    description:
      "Executives define Rally Cries, Defining Objectives, and Outcomes — the strategic framework from Lencioni's proven methodology.",
    detail:
      "Rally Cries are time-bound, organization-wide priorities that give every team a shared target. Compass makes them structural — every commitment traces back to one, so you always know what's covered and what's not.",
    icon: (
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 stroke-accent stroke-[1.5] fill-none">
        <circle cx="16" cy="6" r="3" />
        <line x1="16" y1="9" x2="16" y2="16" />
        <circle cx="8" cy="22" r="3" />
        <circle cx="24" cy="22" r="3" />
        <line x1="16" y1="16" x2="8" y2="19" />
        <line x1="16" y1="16" x2="24" y2="19" />
      </svg>
    ),
  },
  {
    number: 'Step 2',
    title: 'Weekly Commitments',
    description:
      'Every team member enters their 3-5 priorities for the week. Each commitment links to strategy, gets categorized, and ranked by priority.',
    detail:
      "The input takes 30 seconds, not 30 minutes. Drag to rank, tap to link, done. The low friction is intentional — high adoption is what makes the data meaningful over time.",
    icon: (
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 stroke-accent stroke-[1.5] fill-none">
        <rect x="6" y="5" width="20" height="22" rx="2" />
        <line x1="10" y1="11" x2="13" y2="11" />
        <line x1="16" y1="11" x2="22" y2="11" />
        <line x1="10" y1="16" x2="13" y2="16" />
        <line x1="16" y1="16" x2="22" y2="16" />
        <line x1="10" y1="21" x2="13" y2="21" />
        <line x1="16" y1="21" x2="22" y2="21" />
        <polyline points="10,11 11,12 13,10" />
        <polyline points="10,16 11,17 13,15" />
      </svg>
    ),
  },
  {
    number: 'Step 3',
    title: 'Reconcile',
    description:
      'End of week: what actually happened? Completed, partially done, displaced, or carried forward. No gaming — the data tells the truth.',
    detail:
      'Reconciliation captures what actually happened versus what was planned. Displacement patterns reveal when unplanned work is silently consuming capacity that was allocated to strategy.',
    icon: (
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 stroke-accent stroke-[1.5] fill-none">
        <polygon points="16,4 4,28 28,28" />
        <line x1="16" y1="14" x2="16" y2="28" />
        <circle cx="10" cy="22" r="1.5" />
        <circle cx="22" cy="22" r="1.5" />
      </svg>
    ),
  },
  {
    number: 'Step 4',
    title: 'Intelligence',
    description:
      'AI-generated briefings surface drift, coverage gaps, and displacement patterns. Leaders see the signal, not the noise.',
    detail:
      'Every week, Compass produces a narrative briefing that explains what changed, why it matters, and what to do about it. Ask follow-up questions in natural language to drill into any signal.',
    icon: (
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 stroke-accent stroke-[1.5] fill-none">
        <polyline points="4,24 10,18 16,20 22,10 28,6" />
        <circle cx="28" cy="6" r="2" />
        <line x1="4" y1="28" x2="28" y2="28" />
        <line x1="4" y1="8" x2="4" y2="28" />
      </svg>
    ),
  },
];

function StepConnector({ drawn }: { drawn: boolean }) {
  return (
    <div className="absolute top-[36px] right-[-1px] w-[calc(100%-72px)] h-px translate-x-1/2">
      <div
        className="w-full h-px bg-accent opacity-30 origin-left transition-transform duration-[400ms]"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transform: drawn ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />
    </div>
  );
}

function StepCard({
  step,
  index,
  isLast,
}: {
  step: (typeof STEPS)[number];
  index: number;
  isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  useFadeUp(ref);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setTimeout(() => setDrawn(true), 200 + index * 150);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="reveal text-center px-6 relative"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="font-sans text-small font-medium text-muted uppercase tracking-[0.05rem] mb-4">
        {step.number}
      </div>

      <div className="w-[72px] h-[72px] mx-auto mb-5 flex items-center justify-center rounded-full bg-accent/[0.08]">
        {step.icon}
      </div>

      <h3 className="font-sans text-body font-medium text-on-surface tracking-[0.02em] mb-2.5">
        {step.title}
      </h3>

      <p className="text-[0.8125rem] text-on-surface-variant leading-[1.65]">
        {step.description}
      </p>
      <p className="text-[0.8125rem] text-on-surface-variant leading-[1.65] mt-2">
        {step.detail}
      </p>

      {!isLast && <StepConnector drawn={drawn} />}
    </div>
  );
}

export function HowItWorksSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useFadeUp(headlineRef);

  return (
    <section id="how-it-works" className="py-20 bg-surface">
      <div className="mx-auto max-w-[1080px] px-10">
        <h2
          ref={headlineRef}
          className="reveal font-serif text-headline font-normal text-on-surface mb-12 text-center"
        >
          How Compass Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} isLast={i === STEPS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
