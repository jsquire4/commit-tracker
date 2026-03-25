import { Link } from 'react-router-dom';
import { ArchitectureNav } from './ArchitectureNav';
import { TechStackStrip } from './TechStackStrip';
import { MermaidDiagram } from './MermaidDiagram';
import { ArchDecisionGrid } from './ArchDecisionGrid';
import { ApiReferenceTable } from './ApiReferenceTable';
import { SimulationSection } from './SimulationSection';

/* ── Mermaid Diagram Definitions ─────────────────────────────────── */

const SYSTEM_OVERVIEW = `graph TB
  subgraph Frontend ["Frontend (React + TypeScript)"]
    UI["Views: My Week, My Team,<br/>Briefing, Strategy, Settings"]
    API_CLIENT["API Client Layer<br/>TanStack Query"]
  end
  subgraph Backend ["Backend (Java 21 + Spring Boot)"]
    REST["REST API Controllers"]
    SERVICES["Service Layer"]
    OBSERVATORY["Observatory Engine"]
    AI["AI Briefing Service"]
    AUDIT["Audit Trail"]
  end
  subgraph Data ["Data (PostgreSQL)"]
    DB[("PostgreSQL 15")]
  end
  subgraph External ["External"]
    LLM["LLM Provider"]
  end
  UI --> API_CLIENT --> REST --> SERVICES --> DB
  SERVICES --> OBSERVATORY --> DB
  SERVICES --> AUDIT --> DB
  AI --> LLM
  OBSERVATORY --> AI`;

const DATA_MODEL = `erDiagram
  Org ||--o{ AppUser : contains
  Org ||--o{ Cycle : has
  Org ||--o{ RallyCry : defines
  Org ||--o{ ChessCategory : configures
  AppUser ||--o{ Commitment : creates
  AppUser ||--o{ AppUser : manages
  AppUser ||--o{ GrowthArea : sets
  AppUser ||--o{ PersonalReflection : reflects
  Cycle ||--o{ Commitment : contains
  Cycle ||--o{ PersonalReflection : for_cycle
  RallyCry ||--o{ DefiningObjective : has
  DefiningObjective ||--o{ Outcome : has
  Commitment ||--o{ TaskBullet : includes
  Commitment ||--o{ ReconciliationRecord : reconciled_by
  Commitment }o--o{ GrowthArea : tagged_with
  Commitment }o--|| RallyCry : links_to
  Commitment }o--|| DefiningObjective : links_to
  Commitment }o--|| Outcome : links_to
  Commitment }o--|| ChessCategory : categorized_as
  Portfolio ||--o{ Org : contains`;

const WEEKLY_LIFECYCLE = `stateDiagram-v2
  [*] --> DRAFT: Cycle Created
  DRAFT --> LOCKED: Lock Commitments (Manager+)
  LOCKED --> RECONCILING: Begin Reconciliation
  RECONCILING --> RECONCILED: Complete Reconciliation
  RECONCILED --> [*]: Carry-forward to next cycle

  note right of DRAFT: ICs enter and edit commitments
  note right of LOCKED: No edits allowed
  note right of RECONCILING: Mark planned vs actual
  note right of RECONCILED: Historical record`;

const COMMITMENT_TO_INTELLIGENCE = `sequenceDiagram
  participant IC as Individual Contributor
  participant App as Compass Application
  participant DB as PostgreSQL
  participant Observatory as Observatory Engine
  participant AI as AI Service
  participant Exec as Executive

  IC->>App: Enter weekly commitments
  App->>DB: Store with RCDO links + CHESS category
  IC->>App: Reconcile at end of week
  App->>DB: Store completion status + displacement
  Observatory->>DB: Compute alignment, drift, coverage
  Observatory->>AI: Generate narrative briefing
  AI-->>Exec: Weekly Intelligence Summary
  Exec->>App: Ask questions via chatbot
  App->>AI: Query with org context
  AI-->>Exec: Data-backed answers`;

const GROWTH_AREA_FLOW = `graph LR
  IC["IC sets Growth Areas<br/>(up to 5 labels)"] --> TAG["Tags commitments<br/>to growth areas"]
  TAG --> RECON["Closes week<br/>(reflection + learning)"]
  RECON --> STORY["My Story builds:<br/>progress, patterns,<br/>resume bullets"]
  STORY --> LLM["LLM generates<br/>career highlights"]

  MGR["Manager sees:<br/>team alignment<br/>to personal goals"] --> TAG

  style IC fill:#036A6A,color:#fff
  style STORY fill:#455F87,color:#fff
  style LLM fill:#5A7A6B,color:#fff`;

/* ── Section wrapper ──────────────────────────────────────────────── */

function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mt-16 ${className}`}>
      {children}
    </section>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */

export function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-surface">
      <ArchitectureNav />

      <div className="mx-auto max-w-[1080px] px-8 pb-24 max-[640px]:px-4 max-[640px]:pb-16">
        {/* Hero */}
        <Section className="pt-20 pb-8 text-center">
          <h1 className="font-serif text-[3rem] leading-[1.1] text-on-surface mb-4 max-[640px]:text-[2.25rem]">
            System Architecture
          </h1>
          <p className="text-title text-on-surface-variant max-w-[600px] mx-auto leading-relaxed">
            A production-grade execution intelligence platform built with Java 21,
            React, and PostgreSQL.
          </p>
        </Section>

        {/* Executive Overview (BLUF) */}
        <Section id="executive-overview">
          <div className="rounded bg-surface-lowest p-10">
            <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
              Executive Overview
            </h2>
            <div className="text-body text-on-surface-variant leading-relaxed max-w-[780px]">
              <p className="mb-5">
                Compass is not a task tracking application. It is an execution
                observability platform designed to answer one question:{' '}
                <strong className="text-on-surface">
                  is this organization executing against its stated strategy, or is
                  it drifting?
                </strong>
              </p>
              <p className="mb-5">
                Traditional weekly check-ins (15Five, Lattice, etc.) collect data but
                don&rsquo;t tell a story. Compass enforces structural connection
                between individual weekly commitments and organizational strategy
                through a complete lifecycle: plan &rarr; commit &rarr; execute &rarr;
                reconcile &rarr; learn. Every commitment links to the strategic
                framework via the RCDO hierarchy (Rally Cries &rarr; Defining
                Objectives &rarr; Outcomes). Every week generates intelligence. The
                dangerous situation isn&rsquo;t a team that&rsquo;s always been 40%
                strategic &mdash; it&rsquo;s a team that was 80% strategic in week 2
                and is 40% now, without anyone making a conscious decision. Drift
                happens through accumulated individual weekly choices, and the system
                is built to detect it.
              </p>
              <p className="mb-5">
                The system is designed for honesty by architecture. Displacement
                tracking captures <em>why</em> work doesn&rsquo;t get done &mdash;
                not to blame, but to surface systemic patterns. A team with 40%
                production emergency displacement has a different problem than one
                with 40% deprioritized. Assignment attribution reveals whether
                managers are creating strategic alignment or operational drag.
                AI-generated briefings synthesize raw data into narrative intelligence
                that executives can act on in 60 seconds. The product is not the data
                collection &mdash; the product is the signal.
              </p>
              <p>
                The platform you&rsquo;re seeing is populated with data from a
                narrative-driven simulation spanning 27 weeks at Meridian Advanced
                Manufacturing. The company follows a scripted scenario arc &mdash; from
                strong initial alignment through crisis, drift, leadership
                intervention, and recovery. This simulation demonstrates the
                platform&rsquo;s analytical capabilities against data with known
                ground truth: when we say the system detects drift, we know the drift
                is real because we wrote the story that created it.
              </p>
            </div>
          </div>
        </Section>

        {/* Product Philosophy */}
        <Section id="product-philosophy">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            Product Philosophy
          </h2>
          <div className="space-y-6">
            <div className="rounded bg-surface-lowest p-8">
              <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">
                Not Surveillance &mdash; Drift Detection
              </h3>
              <p className="text-body text-on-surface-variant leading-relaxed">
                Compass doesn&rsquo;t monitor people. It monitors organizational alignment.
                The difference matters: surveillance asks &ldquo;who is slacking?&rdquo;
                Drift detection asks &ldquo;are we doing what we said we&rsquo;d do?&rdquo;
                The platform uses neutral, directional language throughout &mdash;
                increasing&thinsp;/&thinsp;decreasing&thinsp;/&thinsp;stable, never
                good&thinsp;/&thinsp;bad&thinsp;/&thinsp;at-risk. Colors are
                teal-to-gray, not green-to-red. Heatmaps show direction, not judgment. This
                framing is not cosmetic &mdash; it is the reason people enter honest data.
                Systems that punish deviation get gamed. Systems that reflect reality build
                institutional memory.
              </p>
            </div>

            <div className="rounded bg-surface-lowest p-8">
              <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">
                IC-First Design
              </h3>
              <p className="text-body text-on-surface-variant leading-relaxed">
                The platform only works if individuals enter honest data. That means the IC
                must have a selfish reason to log &mdash; not just organizational duty. The
                IC value proposition: every honest week builds a professional narrative.
                Growth areas, career highlights, pattern recognition, personal alignment
                trends. The system is building their brag doc, tracking their growth, and
                surfacing when they&rsquo;re being misaligned by management. An IC who sees
                that 80% of their work is assigned by others and maps to zero of their
                growth areas has data they can act on. That&rsquo;s the selfish reason.
                Management gets honest data as a consequence of designing for the individual
                first.
              </p>
            </div>

            <div className="rounded bg-surface-lowest p-8">
              <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">
                Dual Alignment Model
              </h3>
              <p className="text-body text-on-surface-variant leading-relaxed">
                Every commitment can align to two separate systems simultaneously: the
                organizational strategy (Rally Cries via the RCDO hierarchy) and the
                individual&rsquo;s personal growth direction. This creates two-dimensional
                alignment: &ldquo;Am I doing what the org needs?&rdquo; and &ldquo;Is the
                org&rsquo;s work building me?&rdquo; These are independent signals. High
                org alignment with zero personal alignment is not a success state &mdash;
                it&rsquo;s a retention risk that managers can now see coming. A team member
                who is perfectly aligned to organizational objectives but whose work maps to
                none of their growth areas will leave when something better appears. The
                dual model makes that pattern visible before it becomes a resignation.
              </p>
            </div>

            <div className="rounded bg-surface-lowest p-8">
              <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">
                The Shutdown Ritual
              </h3>
              <p className="text-body text-on-surface-variant leading-relaxed">
                Reconciliation is reframed as &ldquo;Close My Week&rdquo; &mdash; a
                satisfying end-of-week ritual, not a compliance exercise. The IC reflects on
                their alignment signal (closer&thinsp;/&thinsp;same&thinsp;/&thinsp;further
                to their goals), records one learning, and receives an LLM-generated summary
                of their week: what they accomplished, what they deferred, how their
                commitments mapped to their growth areas. This is the moment the IC thinks
                &ldquo;I&rsquo;m glad I logged this.&rdquo; Without that moment, honesty
                degrades over time. With it, the platform becomes a practice rather than a
                chore, and the longitudinal data that powers My Story becomes rich enough to
                be genuinely useful.
              </p>
            </div>
          </div>
        </Section>

        {/* Tech Stack */}
        <Section id="tech-stack">
          <TechStackStrip />
        </Section>

        {/* System Overview Diagram */}
        <Section id="system-overview">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            System Overview
          </h2>
          <p className="text-body text-on-surface-variant mb-8 max-w-[640px] leading-relaxed">
            Request flow from user interface through the service layer to persistence
            and external AI integrations.
          </p>
          <MermaidDiagram definition={SYSTEM_OVERVIEW} />
        </Section>

        {/* Core Data Model Diagram */}
        <Section id="data-model">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            Core Data Model
          </h2>
          <p className="text-body text-on-surface-variant mb-8 max-w-[640px] leading-relaxed">
            Every entity is org-scoped for multi-tenant isolation. UUIDs as primary
            keys. Soft deletes on RCDO entities preserve historical links.
          </p>
          <MermaidDiagram definition={DATA_MODEL} />
        </Section>

        {/* Weekly Lifecycle Diagram */}
        <Section id="lifecycle">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            Weekly Lifecycle State Machine
          </h2>
          <p className="text-body text-on-surface-variant mb-8 max-w-[640px] leading-relaxed">
            Each user manages their own weekly cycle independently. State transitions
            are enforced at both the application and database level.
          </p>
          <MermaidDiagram definition={WEEKLY_LIFECYCLE} />
        </Section>

        {/* Commitment to Intelligence Diagram */}
        <Section id="data-flow">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            From Commitment to Intelligence
          </h2>
          <p className="text-body text-on-surface-variant mb-8 max-w-[640px] leading-relaxed">
            The full data flow from individual contributor entry through
            reconciliation, aggregation, and AI-generated executive insight.
          </p>
          <MermaidDiagram definition={COMMITMENT_TO_INTELLIGENCE} />
        </Section>

        {/* Growth Areas & Personal Narrative */}
        <Section id="growth-areas">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            Growth Areas &amp; Personal Narrative
          </h2>
          <p className="text-body text-on-surface-variant mb-8 max-w-[640px] leading-relaxed">
            The second alignment dimension: personal growth. Lightweight labels, not OKRs
            &mdash; directions, not contracts.
          </p>
          <MermaidDiagram definition={GROWTH_AREA_FLOW} />

          <div className="mt-10 rounded bg-surface-lowest p-8">
            <div className="grid grid-cols-2 gap-8 max-[640px]:grid-cols-1">
              <div>
                <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">
                  How Growth Areas Work
                </h3>
                <div className="text-body text-on-surface-variant leading-relaxed space-y-3">
                  <p>
                    Growth areas are lightweight labels &mdash; &ldquo;system
                    design,&rdquo; &ldquo;cross-team leadership,&rdquo;
                    &ldquo;mentorship&rdquo; &mdash; not measurable OKRs with targets
                    and scores. There is no pass or fail. The system reflects patterns
                    back to the IC without grading them, deliberately avoiding the OKR
                    trap where goals become performance contracts that people manage
                    rather than pursue.
                  </p>
                  <p>
                    Commitments are tagged to growth areas during creation (step 2 of
                    the two-step form, after org alignment is established). Each IC can
                    maintain up to 5 active growth areas. The system computes personal
                    alignment percentage per week and over time, building a longitudinal
                    picture of how work is actually developing the person.
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">
                  My Story
                </h3>
                <div className="text-body text-on-surface-variant leading-relaxed space-y-3">
                  <p>
                    My Story is the longitudinal view that makes growth area tracking
                    valuable. It shows a stacked bar chart of alignment over time,
                    growth area progress across every recorded week, pattern insights
                    (which areas dominate, which are absent), and LLM-generated
                    resume bullets built from actual work history rather than
                    self-reported summaries.
                  </p>
                  <p>
                    Historical data persists even when growth areas are deactivated.
                    The join table preserves every commitment-to-growth-area link with
                    the growth area&rsquo;s state at time of tagging &mdash; so
                    changing goals never rewrites history. This is how Wei Zhang
                    (&ldquo;The Drifter&rdquo; in the simulation) can change growth
                    areas every 4 weeks and still produce coherent longitudinal
                    analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Architecture Decisions */}
        <Section id="decisions">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            Architecture Decisions
          </h2>
          <ArchDecisionGrid />
        </Section>

        {/* API Reference */}
        <Section id="api">
          <h2 className="font-serif text-[1.75rem] leading-tight text-on-surface mb-6">
            REST API
          </h2>
          <p className="text-body text-on-surface-variant mb-8 max-w-[640px] leading-relaxed">
            All endpoints prefixed with{' '}
            <code className="font-mono text-small bg-surface-container px-1.5 py-0.5 rounded-sm">
              /api/v1
            </code>
            . Standard JSON response envelope with data, meta, and errors.
          </p>
          <ApiReferenceTable />
        </Section>

        {/* Simulation Architecture */}
        <SimulationSection />
      </div>

      {/* Footer */}
      <footer className="border-t border-outline-variant text-center py-12 mt-20">
        <p className="text-small text-muted">
          Compass &mdash; Built with Java 21, React, TypeScript, PostgreSQL
          {' '}&middot;{' '}
          <Link to="/" className="text-navy no-underline hover:underline">
            Back to application
          </Link>
        </p>
      </footer>
    </div>
  );
}
