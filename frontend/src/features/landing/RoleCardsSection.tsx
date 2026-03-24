import { useRef } from 'react';
import { useFadeUp } from '../../hooks/useMotion';
import { RevealCard } from '../../components/RevealCard';

const BG_COOL = '#F0F7F7';
const BG_SURFACE = '#F9F9F7';

const ROLES = [
  {
    title: 'Individual Contributors',
    description:
      "30 seconds. Enter your commitments, rank them, link to strategy, done. The fastest weekly check-in you've ever used.",
    features: [
      'Drag-and-drop priority ranking',
      'One-click strategy linking',
      '30-second weekly check-in',
    ],
    icon: (
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 stroke-accent stroke-[1.2] fill-none">
        <rect x="10" y="6" width="28" height="36" rx="3" />
        <polyline points="16,17 18,19 22,15" />
        <line x1="26" y1="17" x2="34" y2="17" />
        <polyline points="16,25 18,27 22,23" />
        <line x1="26" y1="25" x2="34" y2="25" />
        <line x1="16" y1="33" x2="22" y2="33" />
        <line x1="26" y1="33" x2="34" y2="33" />
      </svg>
    ),
  },
  {
    title: 'Managers',
    description:
      "See your team's alignment at a glance. Assign work to cover strategic gaps. Review displacement patterns. Act on AI-generated suggestions.",
    features: [
      'Team alignment heatmap by rally cry',
      'AI-suggested assignment recommendations',
      'Carry-forward and displacement tracking',
    ],
    icon: (
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 stroke-accent stroke-[1.2] fill-none">
        <circle cx="24" cy="14" r="5" />
        <path d="M14,34 C14,27 19,23 24,23 C29,23 34,27 34,34" />
        <circle cx="12" cy="18" r="3.5" />
        <path d="M4,32 C4,27 7,24 12,24" />
        <circle cx="36" cy="18" r="3.5" />
        <path d="M44,32 C44,27 41,24 36,24" />
      </svg>
    ),
  },
  {
    title: 'Executives & Leadership',
    description:
      'Weekly intelligence briefings with AI narrative. Organization-wide health dashboard. Drill from company to team to person to commitment in seconds.',
    features: [
      'AI-generated narrative briefings weekly',
      'Drift detection with multi-week trend analysis',
      'Portfolio view across all companies',
    ],
    icon: (
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 stroke-accent stroke-[1.2] fill-none">
        <rect x="18" y="6" width="12" height="8" rx="2" />
        <rect x="6" y="28" width="12" height="8" rx="2" />
        <rect x="30" y="28" width="12" height="8" rx="2" />
        <line x1="24" y1="14" x2="24" y2="20" />
        <line x1="12" y1="20" x2="36" y2="20" />
        <line x1="12" y1="20" x2="12" y2="28" />
        <line x1="36" y1="20" x2="36" y2="28" />
      </svg>
    ),
  },
];

function RoleCard({ role, index }: { role: (typeof ROLES)[number]; index: number }) {
  return (
    <RevealCard index={index} className="rounded-sm bg-surface p-8 transition-colors duration-150 hover:bg-surface-container-low">
      <div className="mb-5">{role.icon}</div>
      <h3 className="font-serif text-[1.125rem] font-normal text-on-surface mb-3">
        {role.title}
      </h3>
      <p className="text-body text-on-surface-variant leading-[1.7]">
        {role.description}
      </p>
      <ul className="mt-4 flex flex-col gap-2 list-none">
        {role.features.map((f) => (
          <li
            key={f}
            className="text-[0.8125rem] text-on-surface-variant leading-[1.5] flex items-start gap-2"
          >
            <span className="text-accent font-medium flex-shrink-0" aria-hidden="true">
              &rarr;
            </span>
            {f}
          </li>
        ))}
      </ul>
    </RevealCard>
  );
}

export function RoleCardsSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useFadeUp(headlineRef);

  return (
    <>
      {/* Gradient transition into teal-tint */}
      <div className="h-[60px]" style={{ background: `linear-gradient(to bottom, ${BG_SURFACE}, ${BG_COOL})` }} />

      <section className="py-20" style={{ background: BG_COOL }}>
        <div className="mx-auto max-w-[1080px] px-10">
          <h2
            ref={headlineRef}
            className="reveal font-serif text-headline font-normal text-on-surface mb-12 text-center"
          >
            Built for Every Level
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ROLES.map((role, i) => (
              <RoleCard key={role.title} role={role} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Gradient transition out of teal-tint */}
      <div className="h-[60px]" style={{ background: `linear-gradient(to bottom, ${BG_COOL}, ${BG_SURFACE})` }} />
    </>
  );
}
