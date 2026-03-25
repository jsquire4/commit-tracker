import { RevealCard } from '@/components/RevealCard';

interface CompanyNarrative {
  name: string;
  description: string;
}

const COMPANIES: CompanyNarrative[] = [
  {
    name: 'Meridian Advanced Manufacturing',
    description:
      'Industrial turnaround. 35 people across 3 divisions. Starts strong with 55% strategic alignment (Weeks 1\u20138), hits production crisis at Week 10 with displacement cascading into the engineering division, enters confirmed strategic drift by Week 16 as ERP migration fails, CEO intervenes at Week 18 using observatory data, partial recovery to ~50% alignment by Week 27. Key narratives: a force-multiplier manager (Elena) vs. an absent manager (Tom), a sandbagged star (Robert Chang) wasted on operational work, a system-gamer (Victor) whose vague commitments mask low visibility, and cross-division displacement where engineering teams are pulled into production firefighting.',
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
          spanning 27 weeks at Meridian Advanced Manufacturing, a company under Apex Capital
          Partners, a mid-market PE firm specializing in industrial and services roll-ups.
          The simulation follows a scripted scenario arc with realistic organizational dynamics &mdash; not
          random data, but an encoded story with known ground truth.
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
              {' '}) &mdash; a narrative specification for Meridian covering 27 weeks of
              organizational events, leadership dynamics, and performance trajectories.
            </p>
            <p>
              Each harness run creates users, rally cries, cycles, commitments, and
              reconciliation records in sequence. The harness respects cycle state
              transitions: it opens a DRAFT, enters commitments, locks the cycle, then
              reconciles &mdash; exactly as a real user would, but at machine speed across
              35 people simultaneously. Carry-forward chains, displacement records, and
              assignment attribution are all generated according to the scripted narrative
              for each persona.
            </p>
            <p>
              After all 27 weeks of commitments were generated, growth area data was
              injected through a persona-driven AI process. Each of 35 Meridian employees
              was assigned 3 growth areas based on their scenario bible character arc &mdash;
              a force-multiplier manager received &ldquo;Team Development&rdquo; and
              &ldquo;Strategic Translation,&rdquo; while a sandbagged star performer
              received areas like &ldquo;Supply Chain Strategy&rdquo; that reflect their
              true capability, not their assigned work.
            </p>
            <p>
              Nine parallel AI agents each assumed 2&ndash;5 personas and processed their
              full 27-week commitment history. For each task, the agent made individual
              judgment calls: does this specific commitment align to this person&rsquo;s
              growth areas, given their role, character arc, and the week&rsquo;s context?
              This was not keyword matching &mdash; an &ldquo;ERP migration coordination
              call&rdquo; aligns to &ldquo;Cross-Functional Leadership&rdquo; for a senior
              manager but not for a junior analyst doing the same task.
            </p>
            <p>
              One persona &mdash; Wei Zhang, &ldquo;The Drifter&rdquo; &mdash; changes
              growth areas every 4 weeks to verify that the platform correctly tracks
              alignment across changing goals. The join table preserves every link with the
              growth area&rsquo;s state at time of tagging, so deactivation never rewrites
              history.
            </p>
            <p>
              Each agent also wrote weekly personal reflections in character &mdash; 915
              total, each with an alignment signal (closer/same/further to goals) and a
              learning note in the persona&rsquo;s voice. Carlos Vega&rsquo;s notes cite
              specific data: &ldquo;SPC analysis on Line 3 confirmed my hypothesis about
              vibration patterns.&rdquo; Miguel Fernandez&rsquo;s notes show struggle:
              &ldquo;Carried over two items again. Need to scope better but not sure
              how.&rdquo;
            </p>
            <p>
              The result: realistic variation in alignment rates that mirrors executive
              intuition &mdash; star performers at ~70%, sandbagged talent at ~20%, absent
              managers&rsquo; teams at ~30%. Not random, not uniform, not heuristic. Judgment
              at scale.
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-4 gap-4 max-[640px]:grid-cols-2">
            {[
              { label: 'Company', value: '1' },
              { label: 'People', value: '35' },
              { label: 'Weeks', value: '27' },
              { label: 'Commitments', value: '2,584' },
              { label: 'Growth Areas', value: '107' },
              { label: 'Alignment Links', value: '2,312' },
              { label: 'Reflections', value: '915' },
              { label: 'Rally Cries', value: '3' },
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
