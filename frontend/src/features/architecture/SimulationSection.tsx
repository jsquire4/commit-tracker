import { useRef } from 'react';
import { useFadeUp } from '@/hooks/useMotion';

interface CompanyNarrative {
  name: string;
  description: string;
}

const COMPANIES: CompanyNarrative[] = [
  {
    name: 'Meridian Advanced Manufacturing',
    description:
      'Industrial turnaround. ~50 people across 3 divisions. Starts strong with 55% strategic alignment (Weeks 1\u20138), hits production crisis at Week 10 with displacement cascading into the engineering division, enters confirmed strategic drift by Week 16 as ERP migration fails, CEO intervenes at Week 18 using observatory data, partial recovery to ~50% alignment by Week 26. Key narratives: a force-multiplier manager (Elena) vs. an absent manager (Tom), a sandbagged star (Robert Chang) wasted on operational work, a system-gamer (Victor) whose vague commitments mask low visibility, and cross-division displacement where engineering teams are pulled into production firefighting.',
  },
  {
    name: 'Pinnacle Health Systems',
    description:
      'Healthcare consolidation. ~48 people, 3 hospitals. The "false yellow" \u2014 surface metrics stay acceptable for all 26 weeks, but cost-weighted analysis reveals senior physician-administrators ($110\u2013$160/hr) spending majority time on defensive compliance work while consolidation falls to junior staff. Key narratives: a hospital director (Dr. Mitchell) who silently resists standardization, a frustrated shared-services team whose carry-forward chains trace back to hospital directors blocking progress, and a before/after manager transfer story (Jason Miller moves from a fortress manager to a collaborative one \u2014 same person, different outcomes).',
  },
  {
    name: 'Atlas Logistics Group',
    description:
      'Crisis and turnaround. ~46 people, 3 divisions. The most dramatic arc. Weeks 1\u201315 under legacy leadership: portfolio-worst 25% strategic alignment, 40%+ carry-forward, pervasive displacement. Week 16: Apex installs new VP Diana Chen. Weeks 17\u201320: transition chaos (metrics dip further before improving). Weeks 22\u201326: recovery trajectory \u2014 alignment climbs to 42%, carry-forward drops to 25%. Key narratives: a manager whose transformation under new leadership is the strongest "leadership matters" data point (Steve Cooper), a resistor whose team stays red while everyone else improves (Karen Turner), and a technology division that was always strategic but blocked by old-guard leadership until the change.',
  },
  {
    name: 'Vanguard Digital Services',
    description:
      'The false positive. ~34 people, 2 divisions. Headline metrics look green for all 26 weeks \u2014 65%+ strategic alignment, strong completion. But deeper analysis reveals: concentration risk (3 people carry 85% of strategic output \u2014 when one takes PTO at Week 16, output drops 50%), an overcrowded rally cry objective with 8 people while other objectives have zero coverage, and a managed services division that learned to tag operational work as "strategic" without changing substance. Key narratives: gaming detection through shallow RCDO linkage depth, an honest operator (Jack Thompson) whose team looks "worst" because he refuses to relabel operational work, and a house-of-cards strategic posture that only surfaces when you drill past headlines.',
  },
];

function CompanyCard({ company, index }: { company: CompanyNarrative; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref);

  return (
    <div
      ref={ref}
      className="reveal rounded bg-surface-lowest p-6"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="font-serif text-[1.0625rem] text-on-surface mb-2">
        {company.name}
      </div>
      <div className="text-small text-on-surface-variant leading-relaxed">
        {company.description}
      </div>
    </div>
  );
}

export function SimulationSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useFadeUp(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="reveal -mx-8 mt-16 rounded-none bg-surface-container-low px-8 py-12 max-[640px]:-mx-4 max-[640px]:px-4"
    >
      <div className="max-w-[780px]">
        <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
          Simulation Architecture
        </h2>
        <p className="text-body text-on-surface-variant leading-relaxed mb-6 max-w-none">
          The data shown in the platform is generated through a narrative-driven simulation
          spanning 26 weeks across 4 portfolio companies under Apex Capital Partners, a
          mid-market PE firm specializing in industrial and services roll-ups. Each company
          follows a scripted scenario arc with realistic organizational dynamics &mdash; not
          random data, but encoded stories with known ground truth.
        </p>

        <div className="grid grid-cols-1 gap-5 mb-8">
          {COMPANIES.map((c, i) => (
            <CompanyCard key={c.name} company={c} index={i} />
          ))}
        </div>

        <div className="text-small text-on-surface-variant leading-relaxed max-w-[780px]">
          <p className="mb-3">
            The simulation generates approximately 18,500 commitments across 178 people, 23
            managers, and 11 divisions &mdash; each with realistic RCDO linkages,
            reconciliation outcomes, displacement patterns, carry-forward chains, and
            assignment attribution following character-driven narratives.
          </p>
          <p>
            The simulation proves the platform&rsquo;s analytical capabilities against data
            with known ground truth. Every drift pattern, every gaming behavior, every
            cost-weighted misalignment is scripted &mdash; so the observatory&rsquo;s ability
            to detect and surface these patterns can be validated against the intended
            narrative.
          </p>
        </div>
      </div>
    </section>
  );
}
