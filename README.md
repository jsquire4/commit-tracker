# Compass Execution Observatory

PE turnaround execution observatory that connects strategic intent to ground-level work patterns. Surfaces misalignment, drift, and dark work attribution before they hit the P&L.

## What It Does

- **Executive Health View** — org-unit-level health signals (GREEN/YELLOW/RED) with drill-down to team, manager, and individual contributor level
- **Drift Detection** — configurable week-over-week trend analysis detecting alignment, velocity, and coverage drift with severity escalation (emerging / sustained / structural)
- **Displacement Tracking** — structured reconciliation flow capturing why strategic work was displaced, with automated note clustering to surface systemic themes
- **Cost-Weighted Misalignment** — role-tier and dollar-denominated cost analysis showing which misalignment costs the most
- **Dark Work Attribution** — surfaces which managers assign non-strategic work, weighted by the seniority of the people involved
- **Signal Integrity** — detects data gaming (uniform categorization, manager/team divergence, duplicate notes)
- **Portfolio View** — cross-portco comparison for PE managing directors with sparkline trends
- **Weekly Commitment Lifecycle** — commit entry, prioritization, reconciliation, carry-forward, and manager oversight

## Stack

- **Backend:** Java 21, Spring Boot 3.2.5, Spring Data JPA, PostgreSQL 16, Flyway
- **Frontend:** React 18, TypeScript (strict), Vite, TanStack Query, Zustand, Tailwind CSS, Recharts
- **Infrastructure:** Docker Compose, nginx reverse proxy
- **Testing:** JUnit 5, Mockito, Testcontainers, Vitest, Testing Library, MSW

## Quick Start

```bash
# Start database
docker compose -f docker-compose.dev.yml up -d

# Backend (with seed data)
cd backend
./gradlew bootRun  # runs on :8080, profile=local, seeds 10 users / 3 weeks

# Frontend
cd frontend
pnpm install
pnpm dev           # runs on :3000
```

For the full observatory seed data (3 orgs, ~150 users, 12 weeks of drift narratives):

```bash
# In application-local.yml, set:
# compass.seed.observatory: true
# compass.seed.enabled: false
```

## Architecture

```
frontend/          React 18 SPA (Vite + TypeScript strict)
  src/
    features/
      commit-entry/       Weekly commitment CRUD with drag-to-reorder
      weekly-lifecycle/   Cycle state machine (DRAFT -> LOCKED -> RECONCILING -> RECONCILED)
      reconciliation/     Planned vs actual with displacement tracking
      manager-dashboard/  Alignment gap chart, assignment signals, team rollup
      chessboard/         Priority x category grid with week-over-week deltas
      observatory/        Executive health, drift signals, org chart, portfolio view
    api/                  Axios-based API modules
    hooks/                React Query hooks
    types/                TypeScript interfaces mirroring backend DTOs

backend/           Spring Boot 3.2.5 (Java 21)
  domain/
    commit/               Commitment, TaskBullet, ChessCategory entities + service
    cycle/                Cycle state machine + carry-forward orchestration
    reconciliation/       Reconciliation records + displacement flow
    dashboard/            Manager-level analytics (alignment, attribution, RCDO coverage)
    observatory/          Executive analytics, drift detection, displacement aggregation,
                          cost-weighted misalignment, portfolio health, observatory config
    rcdo/                 Rally Cry > Defining Objective > Outcome hierarchy
    user/                 AppUser, Org, team activation
    importexport/         CSV importers for users, RCDO, categories, commitments
  security/               JWT auth, role-based visibility strategies, analyst scoping
  audit/                  Append-only audit trail
  seed/                   Seed data generators (small + observatory-scale)
```

## Key Design Decisions

- **Role-based visibility** — EMPLOYEE sees own work, MANAGER sees direct reports, DIRECTOR+ sees full subtree, EXECUTIVE sees entire org
- **Configurable thresholds** — drift detection sensitivity, alignment targets, and warning levels are all adjustable per-org by executives
- **No dollar amounts required** — cost weighting works with role tiers as proxy; dollar rates are optional
- **Displacement over surveillance** — the platform detects misalignment through work pattern analysis, not activity monitoring
- **Pattern-based signals** — individual data points are invisible at the executive level; only recurring themes surface

## Status

Feature-complete. Observatory platform built and audited.

**Demo & stakeholder narrative** (26-week story index, “not just the front end”): see [`docs/stakeholder-narrative.md`](docs/stakeholder-narrative.md) and the full arc in [`docs/scenario-bible.md`](docs/scenario-bible.md).
