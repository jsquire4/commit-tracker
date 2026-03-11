# ST6 Weekly Commit Module — Requirements

## Strategic Context

ST6 operates as a turnaround PE firm — acquiring mid-sized businesses, revamping operations
with AI-enabled software, and exiting to other PE groups. This module isn't just a 15-Five
replacement for one company. It's a potential component of ST6's operational playbook:
deployable into any portfolio company to rapidly measure whether teams are executing against
the turnaround strategy or just going through the motions.

That context informs every design decision below — the system must be fast to deploy (CSV
import, not a 6-month migration), easy to read at a glance (alignment signals, not just
lists), and honest by design (people have to actually use it truthfully or the data is
worthless).

---

## Core Spec (what we build)

These map directly to the ST6 functional requirements.

### Weekly Commit CRUD
- Create, read, update, delete weekly commitments
- Each commitment links to the RCDO hierarchy (Rally Cry, Defining Objective, Outcome)
- RCDO linking is required per commitment (with escape hatch for unlinked/operational work)

### Chess Layer
> **OPEN QUESTION:** The spec calls out a "chess layer" for categorization and prioritization
> but does not define the framework. The interpretation below is our best reading of intent —
> needs confirmation from ST6 stakeholders.

**Concept:** A strategic positioning layer that forces employees to think about what kind of
work each commitment represents and where to deploy limited capacity.

- Categorization — each commitment tagged by nature of work:
  - Strategic (directly advances a Rally Cry / Defining Objective)
  - Operational (keeps the lights on — recurring, maintenance, admin)
  - Defensive (risk mitigation, tech debt, compliance)
  - Capability building (learning, tooling, process improvement)
  - Exact taxonomy TBD — may need org-specific language
- Prioritization — rank ordering within the week based on strategic value
  - Visual, interactive interface (drag-and-drop, not a number field)
  - Forces a deliberate decision: "If I can only finish 3 of these 6, which 3?"

### Weekly Lifecycle State Machine
- States: DRAFT → LOCKED → RECONCILING → RECONCILED
- Carry Forward: unfinished reconciled items roll into the next cycle
- State transitions are enforced — no backdating, no editing locked commitments
- Clear rules for who/what triggers each transition

### Reconciliation
- End-of-cycle view comparing planned commitments vs. actual outcomes
- Per-commitment status: completed, partially completed, not started, carried forward
- Capture of what changed and why
- Unplanned work capture: ability to add unplanned commitments during reconciliation
  - Tagged as unplanned, immediately reconciled upon entry
  - Full RCDO linking still required

### Manager Dashboard
- Team roll-up view: all direct reports' commitments in one place
- Filterable by RCDO hierarchy, status, team member
- Aggregate view of team alignment to strategic objectives

### Roles and Visibility
- **Primary axis:** corporate hierarchy — you see your level and your downline
  - **Employee:** own commitments, own history, own reconciliation
  - **Manager:** own commitments + direct reports' roll-up
  - **Director / VP / Executive:** own commitments + full tree below (aggregated)
- **Secondary axis:** RCDO / project ownership — cross-cutting visibility that follows
  the work, not the org chart
  - RCDO owners see all commitments linked to their objective regardless of reporting line
- **Analyst:** read-only cross-cutting view into a defined organizational segment
  - Scoped to a specific slice (e.g., a Rally Cry, a division, a department)
  - Top-to-bottom visibility within that scope
  - Observability only — no commit entry or editing
- Auth integrates with the PA host app's existing identity/role system

> **OPEN QUESTION:** How are analyst scopes defined — by RCDO segment, org unit, or both?

### Micro-Frontend Integration
- Runs as a remote module inside the existing PA host app
- Follows the PM (module federation) remote pattern
- No layout jank, works within host app navigation and auth

### Production Readiness
- **Deployment:** Railway — single-command deploy, Docker-based, portable to self-hosted
- **Local dev:** `docker compose up` for full stack, seed data for demo
- **Testing:** unit tests on business logic + API integration tests against real database
- **Observability:** structured JSON logging, aggressive coverage — log every state
  transition, API request/response, permission check, RCDO link change, reconciliation
  action, and error with full context
- **Data migration:** CSV import tool with defined schema, ships with sample seed data,
  proves the migration path without assuming access to 15-Five
- **Rollout:** pilot → phased launch → full rollout, per-team activation

### Tech Stack
- TypeScript (strict mode) — frontend
- Java 21 — backend
- SQL — persistence

---

## Differentiators (built, not just documented)

These are not in the spec. They're cheap to build, visible in the demo, and show depth
of thinking that other candidates won't have.

### 1. Completion Horizons (instead of hour estimates)
- Per commitment, employee selects expected completion: Morning, Midday, Afternoon, EOD, EOW
- Each commitment includes 2-5 high-level bullets describing what's involved
  - Example: "Create BD deck" → "copy slides from prior deck, create 1-2 new slides
    for [client], send to manager for review"
- Natural and honest — people know if something is a "morning task" without estimating hours
- Gives reconciliation specific sub-items to check against
- System can infer relative effort without anyone self-reporting utilization

### 2. Alignment Gap Signal (on the manager dashboard)
- One visualization showing: X% strategic, Y% operational, Z% unlinked across the team
- Immediately answers "is this team executing against the strategy or just busy?"
- For a PE turnaround firm, this is the core value — deploy into a portco and see within
  2-3 weeks whether teams are aligned to the turnaround plan

### 3. Assignment Attribution
- Optional `assigned_by` field on each commitment (self-directed or pick a manager)
- Enables dashboard signals:
  - "Manager X has assigned 60% of their team's overhead work" — management drag
  - "80% of Manager Y's assignments go to one person" — dependency risk
  - A manager who assigns almost nothing — disengaged or highly autonomous team?
- Cheap to capture (one dropdown), high signal on the dashboard
- Surfaces at team/manager level, not used to evaluate individual employees

---

## Roadmap (documented, not built)

Features we considered and would build next. Included to demonstrate product thinking
and understanding of the deeper organizational dynamics this tool creates.

### Incentive Alignment and Dark Work
- Operational/overhead work as a first-class category (not a failure state)
- Capacity vs. alignment as separate dashboard lenses
- Aggregate dark work signals at team/org level (anonymous, no individual exposure)
- Structural guardrails: utilization data never feeds into performance reviews

### Effort Estimation Intelligence
- Pattern detection: flag misalignment between task scope and completion horizon
  (both overestimation and underestimation, surfaced to managers only as patterns)
- Estimation drift feedback for individuals: "your 'morning' tasks tend to finish by EOD"
- Capacity inferred from commitment data, never directly exposed per individual
- Capacity matching: surface available bandwidth alongside unassigned RCDO outcomes

### Recurring Responsibilities
- Define once, auto-populate each cycle — no weekly re-entry
- Variance tracking: lighter / normal / heavier than usual + optional note
- Simplified reconciliation: "anything unusual?" not "did you do it?"
- Baseline load visibility: "this team is 60% recurring, 40% available for strategic work"
- Template management: pause, retire, adjust frequency without losing history

### Additional Enhancements
- Flexible cycle model (configurable cadence, not hardcoded to Monday–Friday)
- Unplanned work capture enhancements (auto-categorization, pattern detection)
- RCDO hierarchy resilience (soft references, graceful archival)
- Carry-forward escalation (after 3 consecutive carries, prompt to escalate/rescope/drop)
- AI-accelerated features (RCDO mapping suggestions, manager summaries, risk prediction)
- Notifications and nudges for lifecycle transitions
- CSV export and clean API surface for integrations

### Superorg Layer (PE portfolio visibility)
- **Superorg** entity sits above individual orgs — represents ST6 itself
- Each portfolio company is an org within the superorg
- ST6 leadership gets a cross-portco dashboard:
  - "Portco A has 80% strategic alignment after 6 weeks — turnaround is tracking"
  - "Portco B has 45% — teams aren't executing against the plan"
  - Comparative view across the portfolio: which acquisitions are on track?
- RCDO hierarchies remain scoped per org, but superorg can define portfolio-level
  Rally Cries that cascade down (e.g., "reduce operational overhead by 30%")
- **Architecture note for the build:** we don't implement superorg, but we ensure the
  data model doesn't prevent it — org/tenant is a first-class concept, not a singleton.
  RCDO hierarchies, users, and commitments are all scoped to an org. Adding the parent
  layer later is additive, not a rewrite.

### Deployment at Scale (PE playbook)
- Multi-tenant deployment across portfolio companies
- Fast standup for new acquisitions (CSV import + phased rollout)
- Cross-portco visibility for ST6 leadership via superorg layer
- Detachability story for exit (tool goes with the portco or stays with ST6?)
