import { RevealCard } from '@/components/RevealCard';

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
  return (
    <RevealCard index={index} className="rounded bg-surface-lowest p-6">
      <div className="font-serif text-[1.0625rem] text-on-surface mb-2">
        {company.name}
      </div>
      <div className="text-small text-on-surface-variant leading-relaxed">
        {company.description}
      </div>
    </RevealCard>
  );
}

export function SimulationSection() {
  return (
    <section
      className="-mx-8 mt-16 rounded-none bg-surface-container-low px-8 py-12 max-[640px]:-mx-4 max-[640px]:px-4"
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

        {/* Harness Architecture */}
        <div className="rounded bg-surface-lowest p-7 mb-8">
          <h3 className="font-serif text-[1.25rem] text-on-surface mb-4">
            The Simulation Harness
          </h3>
          <div className="text-body text-on-surface-variant leading-relaxed space-y-4">
            <p>
              The harness lives at{' '}
              <code className="font-mono text-small bg-surface-container px-1.5 py-0.5 rounded-sm">
                st6-simulation/harness/
              </code>{' '}
              and is a TypeScript project that calls the Compass REST API to build out the
              full simulation state week by week. It reads from a scenario bible
              ({' '}
              <code className="font-mono text-small bg-surface-container px-1.5 py-0.5 rounded-sm">
                docs/scenario-bible.md
              </code>
              {' '}) &mdash; a narrative specification for each of the 4 portfolio companies
              covering 26 weeks of organizational events, leadership dynamics, and
              performance trajectories.
            </p>
            <p>
              Each harness run creates users, rally cries, cycles, commitments, and
              reconciliation records in sequence. The harness respects cycle state
              transitions: it opens a DRAFT, enters commitments, locks the cycle, then
              reconciles &mdash; exactly as a real user would, but at machine speed across
              178 people simultaneously. Carry-forward chains, displacement records, and
              assignment attribution are all generated according to the scripted narrative
              for each persona.
            </p>
            <p>
              The growth area injection was a separate, AI-assisted pass. After all 26 weeks
              of commitments were loaded, 9 parallel AI agents each assumed 2&ndash;5
              personas and processed their full commitment history. Each agent made
              per-task judgment calls: does this specific task align to this person&rsquo;s
              growth areas, given their role, character arc, and the week&rsquo;s context?
              The result is 2,312 commitment-to-growth-area links and 915 personal
              reflections &mdash; not generated from heuristics, but from reading actual
              task titles, bullet points, and narrative context.
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-4 gap-4 max-[640px]:grid-cols-2">
            {[
              { label: 'Companies', value: '4' },
              { label: 'People', value: '~178' },
              { label: 'Weeks', value: '26' },
              { label: 'Commitments', value: '~18,500' },
              { label: 'Growth Areas', value: '107' },
              { label: 'Alignment Links', value: '2,312' },
              { label: 'Reflections', value: '915' },
              { label: 'Scenario Weeks', value: '104' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded bg-surface-container p-3 text-center">
                <div className="font-serif text-[1.375rem] text-on-surface">{value}</div>
                <div className="text-[0.6875rem] uppercase tracking-wide text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 mb-8">
          {COMPANIES.map((c, i) => (
            <CompanyCard key={c.name} company={c} index={i} />
          ))}
        </div>

        {/* Persona-Driven Data Injection */}
        <div className="rounded bg-surface-lowest p-7 mb-8">
          <h3 className="font-serif text-[1.25rem] text-on-surface mb-4">
            Persona-Driven Growth Area Injection
          </h3>
          <div className="text-body text-on-surface-variant leading-relaxed space-y-4">
            <p>
              Each of 34 Meridian employees was assigned 3 growth areas based directly on
              their scenario bible character arc. A force-multiplier manager received
              &ldquo;cross-team leadership&rdquo; and &ldquo;systems thinking.&rdquo; A
              sandbagged star performer received &ldquo;technical depth&rdquo; and
              &ldquo;project ownership&rdquo; &mdash; areas they want to grow but keep
              getting pulled away from. An absent manager received leadership-focused areas
              that their behavior never actually maps to, producing realistic low-alignment
              data for that persona.
            </p>
            <p>
              Nine parallel AI agents were each assigned 2&ndash;5 Meridian personas. For
              each persona, the agent read their full 26-week commitment history and made
              individual judgment calls on each task: does this commitment align to growth
              area X? The decision was not a keyword match &mdash; it required understanding
              the task in context of that person&rsquo;s role, their week, and what the
              growth area actually means for someone at their level. An &ldquo;ERP migration
              coordination call&rdquo; aligns to &ldquo;cross-team leadership&rdquo; for a
              senior manager but not for a junior analyst doing the same task.
            </p>
            <p>
              One persona &mdash; Wei Zhang, &ldquo;The Drifter&rdquo; &mdash; changes
              growth areas every 4 weeks to verify that the platform correctly tracks
              alignment across changing goals without contaminating historical records. The
              join table preserves every commitment-to-growth-area link with the growth
              area&rsquo;s state at time of tagging, so growth area deactivation never
              rewrites history.
            </p>
            <p>
              The result is realistic variation in alignment rates that mirrors what
              executive intuition would predict from each character: star performers like
              Carlos Vega at ~70% personal alignment, the sandbagged Robert Chang at ~20%
              (high org alignment, near-zero personal &mdash; exactly the retention risk
              signal), and absent manager Tom Jackson&rsquo;s team at ~30% across the board
              because their work is reactive and unconnected to their growth directions.
            </p>
          </div>
        </div>

        <div className="text-small text-on-surface-variant leading-relaxed max-w-[780px]">
          <p>
            The simulation proves the platform&rsquo;s analytical capabilities against data
            with known ground truth. Every drift pattern, every gaming behavior, every
            cost-weighted misalignment is scripted &mdash; so the observatory&rsquo;s
            ability to detect and surface these patterns can be validated against the
            intended narrative.
          </p>
        </div>
      </div>
    </section>
  );
}
