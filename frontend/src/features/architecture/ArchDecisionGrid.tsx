import { RevealCard } from '@/components/RevealCard';

interface Decision {
  title: string;
  rationale: string;
}

const DECISIONS: Decision[] = [
  {
    title: 'RCDO Framework (Lencioni)',
    rationale:
      'Based on Patrick Lencioni\u2019s Thematic Goal methodology. Rally Cries \u2192 Defining Objectives \u2192 Outcomes. Every commitment links back to this tree, creating structural alignment between individual work and organizational strategy.',
  },
  {
    title: 'Completion Horizons, Not Hours',
    rationale:
      'People know if something is a "morning task" without estimating hours. We capture expected completion time (Morning / Midday / Afternoon / EOD) with a day selector. This gives the system relative effort signals without the theater of hour tracking.',
  },
  {
    title: 'Displacement, Not Blame',
    rationale:
      'When work doesn\u2019t get done, we capture WHY (Manager Reassigned, Production Emergency, Resource Blocked, etc.) \u2014 not to blame, but to surface systemic patterns. A team with 40% Production Emergency displacement has a different problem than one with 40% Deprioritized.',
  },
  {
    title: 'Org-Scoped Multi-Tenancy',
    rationale:
      'Every entity is scoped to an Org. Portfolio sits above Org. This means Compass can deploy into any portfolio company and the data stays isolated. Adding a cross-portfolio view is additive, not a rewrite.',
  },
  {
    title: 'Audit Trail by Design',
    rationale:
      'Every state transition, RCDO link change, commitment edit, and reconciliation action is logged with actor, timestamp, and full context. The audit trail IS the product for compliance-sensitive PE environments.',
  },
  {
    title: 'AI with Citations',
    rationale:
      'LLM-generated briefings reference specific data points with links back to the source. No hallucinated metrics. Every number in the narrative is validated against the database before presentation.',
  },
  {
    title: 'Spring Data JPA + Flyway',
    rationale:
      'Type-safe queries via Spring Data JPA and versioned migrations via Flyway. Every schema change is tracked, reversible, and auditable. No manual SQL \u2014 the migration history IS the schema documentation.',
  },
  {
    title: 'TanStack Query (React Query)',
    rationale:
      'Client-side data layer with automatic caching, background refetching, and optimistic updates. Mutations invalidate related queries automatically \u2014 no stale data, no manual cache management.',
  },
  {
    title: 'Headless UI + Tailwind CSS',
    rationale:
      'Unstyled, accessible component primitives styled with Tailwind\u2019s utility classes. No opinionated component library to fight against. Full control over the design system from day one.',
  },
  {
    title: 'Zustand for UI State',
    rationale:
      'Minimal client state management. Server state lives in TanStack Query, UI-only state (modals, form visibility) lives in a tiny Zustand store. No Redux, no boilerplate, no accidental complexity.',
  },
  {
    title: 'Role-Based Visibility (not RBAC)',
    rationale:
      'Visibility follows the org hierarchy: you see your level and your downline. RCDO owners get cross-cutting visibility. This mirrors how PE firms actually think about information access \u2014 by reporting line, not by permission matrix.',
  },
  {
    title: 'CSV Import for Fast Deployment',
    rationale:
      'Portfolio companies onboard via CSV import, not a 6-month migration. Seed data proves the migration path. The tool is useful in Week 1, not Month 6.',
  },
];

function DecisionCard({ decision, index }: { decision: Decision; index: number }) {
  return (
    <RevealCard index={index} className="rounded bg-surface-lowest p-6 transition-colors duration-150 hover:bg-surface">
      <div className="font-serif text-[1.0625rem] text-on-surface mb-2.5">
        {decision.title}
      </div>
      <div className="text-small text-on-surface-variant leading-relaxed">
        {decision.rationale}
      </div>
    </RevealCard>
  );
}

export function ArchDecisionGrid() {
  return (
    <div className="grid grid-cols-3 gap-5 max-[960px]:grid-cols-2 max-[640px]:grid-cols-1">
      {DECISIONS.map((d, i) => (
        <DecisionCard key={d.title} decision={d} index={i} />
      ))}
    </div>
  );
}
