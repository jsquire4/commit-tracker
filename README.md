# Compass Execution Observatory

PE turnaround execution observatory that connects strategic intent to ground-level work patterns. Surfaces misalignment, drift, and dark work attribution before they hit the P&L. Designed to be rapidly deployable into any portfolio company to measure whether teams execute against strategy or just go through the motions.

## Stack

- **Backend:** Java 21, Spring Boot 3.2.5, Spring Data JPA, PostgreSQL 16, Flyway
- **Frontend:** React 18, TypeScript (strict), Vite, TanStack Query, Zustand, Tailwind CSS, Recharts
- **LLM:** OpenAI (GPT-4.1-nano default), Anthropic fallback
- **Infrastructure:** Docker Compose, nginx reverse proxy, Railway (production)
- **Testing:** JUnit 5, Testcontainers, Vitest, Testing Library, MSW

## Installation

### Prerequisites

- Docker & Docker Compose
- Java 21 (for local backend development)
- Node.js 20+ with pnpm (for local frontend development)

### Option A: Full Stack with Docker

```bash
docker compose up
```

This starts PostgreSQL, the Spring Boot backend, and the React frontend behind nginx. Access the app at `http://localhost:3000`.

### Option B: Database in Docker, App Locally (Recommended for Development)

```bash
# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Start backend (seeds demo data on first run)
cd backend
./gradlew bootRun    # http://localhost:8080

# Start frontend (in a separate terminal)
cd frontend
pnpm install
pnpm dev             # http://localhost:3001 (proxies /api to :8080)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | `local` | Spring profile (`local`, `railway`, `test`) |
| `COMPASS_SEED_ENABLED` | `true` (local) | Seed demo data on startup |
| `COMPASS_SEED_OBSERVATORY` | `false` | Full observatory seed: 3 orgs, ~150 users, 12 weeks |
| `OPENAI_API_KEY` | — | Required for AI-generated briefings and narratives |
| `ANTHROPIC_API_KEY` | — | Fallback LLM provider |
| `LLM_MODEL` | `gpt-4.1-nano` | LLM model to use |
| `COMPASS_CORS_ALLOWED_ORIGINS` | `localhost:3000,3001` | Allowed CORS origins |

### Database

**PostgreSQL 16** runs on `127.0.0.1:5432` with credentials `compass` / `compasslocal`. Flyway migrations run automatically on startup. No manual schema setup required.

### Seed Data

**Small seed** (default for local dev): 1 org (Meridian Manufacturing), 10 users, 2 Rally Cries, 3 weeks of commitments and reconciliation records.

**Observatory seed** (set `COMPASS_SEED_OBSERVATORY=true`): 3 orgs, ~150 users, 12 weeks of generated data with realistic drift narratives. Takes ~30 seconds to load.

### Running Tests

```bash
# Backend (uses Testcontainers — Docker must be running)
cd backend && ./gradlew test

# Frontend
cd frontend && pnpm test
```

## Features

### 3-View Architecture

The platform is organized around three primary views gated by role:

**My Week** (All Users) — Individual contributor hub. Weekly commitment CRUD with drag-to-reorder prioritization, Rally Cry linkage, Chess categorization (Strategic / Operational / Defensive / Capability Building), task bullet breakdowns, and completion horizon estimates. Manages a per-user weekly lifecycle state machine: DRAFT → LOCKED → RECONCILING → RECONCILED. Unfinished items carry forward automatically with full lineage tracking.

**My Team** (Manager+) — Team rollup of all direct reports' commitments with assignment signals, alignment gap detection, Rally Cry coverage cards, and rolling 12-week work history per team member.

**The Briefing** (Director+) — Director-level intelligence with org-unit health signals (GREEN/YELLOW/RED), drill-down navigation (Rally Cry → Team → IC), AI-generated narrative summaries, and KPI metrics strip.

### IC Experience

**My Story** — Personal growth area tracking with progress visualization, AI-generated pattern insights, and auto-generated resume bullets tied to personal alignment. Dual-axis view: personal growth + organizational alignment.

**Close My Week** — End-of-week reconciliation ritual. Planned vs actual comparison for every commitment with structured displacement tracking, unplanned work entry, and personal reflection.

**Commitment History** — Rolling 12-week view of past commitments with carry-forward lineage and visual timeline showing a commitment's journey across cycles.

### Executive Intelligence

**Observatory** (VP+) — Program health dashboard with KPI strip (Rally Cry coverage, completion rate, carry-forward count, displacement rate), execution trend charts, configurable drift detection (alignment / velocity / coverage drift with severity escalation: emerging → sustained → structural), team trajectory small multiples, org-chart heatmap, and data integrity signals detecting gaming patterns.

**Portfolio** (VP+) — Cross-portfolio company comparison with sparkline trends, side-by-side metrics, AI-powered chat sidebar for asking questions about portfolio health, and drill-down into individual orgs.

**Strategy** (Director+) — RCDO hierarchy builder: Rally Cry → Defining Objective → Outcome. Kanban-style drag-and-drop with CRUD modals and owner assignment.

### LLM Integration

AI-powered features throughout the platform:

- **Briefing narratives** — Auto-generated prose summaries of team and program state
- **IC insights** — Pattern analysis of commitment history tied to growth goals
- **Portfolio chat** — Conversational interface for portfolio health questions
- **Narrative feedback** — Users can thumbs-up/down AI outputs to improve quality

Uses OpenAI (GPT-4.1-nano) by default with Anthropic fallback. Hardcoded template narratives serve as fallback when no API key is configured.

### Supporting Features

- **Settings** — Profile management, admin panel (Manager+) for user/role/team management, organization config (VP+) for drift thresholds and cost bands
- **Methodology** — Built-in help page explaining platform concepts and best practices
- **Landing Page** — Product introduction with role cards, feature preview, and stats
- **Architecture Page** — Visual system architecture diagram

## Security & Access Control

JWT-based authentication with role-based visibility:

| Role | Sees |
|------|------|
| EMPLOYEE | Own commitments only |
| MANAGER | Own + direct reports |
| DIRECTOR | Full org subtree |
| VP | Full org subtree + portfolio + observatory |
| EXECUTIVE | Entire organization |
| ANALYST | Read-only within scoped boundary |

Dev mode uses `DevTokenValidator` for local testing without real JWT infrastructure.

## Architecture

```
frontend/              React 18 SPA (Vite + TypeScript strict)
  src/
    features/
      my-week/              Weekly commitment hub (V2 IC experience)
      my-story/             Personal growth & narrative
      my-team/              Manager team rollup & analytics
      briefing/             Director-level AI briefings
      observatory/          Executive health, drift, heatmap
      portfolio/            Cross-company comparison & AI chat
      strategy/             RCDO hierarchy builder
      reconciliation/       Planned vs actual + displacement
      weekly-lifecycle/     Cycle state machine UI
      commitment-history/   Rolling history & lineage
      growth-areas/         Personal growth area CRUD
      settings/             Profile, admin, org config
      methodology/          Help & best practices
      landing/              Product intro page
      architecture/         System architecture page
    api/                    Axios-based API modules (15 files)
    hooks/                  React Query hooks + auth context
    components/             Shared UI (Layout, nav, date range selector)

backend/               Spring Boot 3.2.5 (Java 21)
  domain/
    commit/                 Commitment, TaskBullet, ChessCategory
    cycle/                  Cycle state machine + carry-forward
    reconciliation/         Reconciliation records + displacement
    dashboard/              Manager analytics, alignment, RCDO coverage
    observatory/            Executive analytics, drift detection,
                            displacement aggregation, portfolio health
    briefing/               Director narratives + LLM integration
    icinsights/             IC narrative generation
    growth/                 Growth area CRUD
    rcdo/                   Rally Cry > Defining Objective > Outcome
    user/                   AppUser, Org, roles, team activation
    importexport/           CSV importers (users, RCDO, categories, commitments)
  security/                 JWT auth, role-based visibility, analyst scoping
  audit/                    Append-only audit trail
  seed/                     Seed data generators (small + observatory-scale)
```

## Key Design Decisions

- **Weekly cycle as first-class entity** — Not derived from dates; each user manages their own lifecycle independently
- **State machine enforcement** — DRAFT → LOCKED → RECONCILING → RECONCILED, no backdating
- **Carry-forward as lineage** — New row in next cycle with parent reference, preserving full history
- **Displacement over surveillance** — Detects misalignment through work pattern analysis, not activity monitoring
- **Pattern-based signals** — Individual data points invisible at executive level; only recurring themes surface via clustering
- **No dollar amounts required** — Cost weighting works with role tiers as proxy; dollar rates are optional
- **Configurable thresholds** — Drift detection sensitivity, alignment targets, and warning levels are adjustable per-org

## Deployment

### Railway

Set `SPRING_PROFILES_ACTIVE=railway`. Railway provides `DATABASE_URL` automatically. Configure `COMPASS_CORS_ALLOWED_ORIGINS` with your Railway domain. Connection pool is 10 (vs 5 locally).

```bash
git push origin main   # Railway auto-deploys via webhook
```

### Docker Production Build

Backend uses a multi-stage build (Eclipse Temurin 21 Alpine). Frontend builds with Node 20 Alpine and serves via nginx with SPA routing and API reverse proxy.

```bash
docker compose up --build
```

## Ports

| Service | Local Dev | Docker |
|---------|-----------|--------|
| Frontend | `localhost:3001` | `localhost:3000` |
| Backend | `localhost:8080` | `localhost:8080` |
| PostgreSQL | `localhost:5432` | `localhost:5432` |
