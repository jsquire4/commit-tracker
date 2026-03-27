# Compass Execution Observatory

PE turnaround execution observatory that connects strategic intent to ground-level work patterns. Surfaces misalignment, drift, and dark work attribution before they hit the P&L. Designed to be rapidly deployable into any portfolio company to measure whether teams execute against strategy or just go through the motions.

## Stack

- **Backend:** Java 21, Spring Boot 3.2.5, Spring Data JPA, PostgreSQL 16, Flyway
- **Frontend:** React 18, TypeScript (strict), Vite, TanStack Query, Zustand, Tailwind CSS, Recharts, Module Federation (`@originjs/vite-plugin-federation`) for host-app integration
- **LLM:** OpenAI (default), Anthropic fallback — configurable model and base URL
- **Infrastructure:** Docker Compose (PostgreSQL + API + static UI), **nginx inside the frontend image** (SPA + `/api` reverse proxy to the backend — there is no separate nginx Compose service)
- **Observability:** Spring Boot Actuator (`health`, `info`, `metrics`); JSON logs on the `railway` profile (Logstash encoder)
- **Testing:** JUnit 5, Testcontainers, Vitest, Testing Library, MSW

## Infrastructure (what runs where)

| Piece | Role |
|-------|------|
| **PostgreSQL 16** | Primary datastore; Flyway migrations on backend startup |
| **Backend** | Spring Boot on port **8080** (`server.port`) |
| **Frontend image** | **nginx:alpine** serves the Vite build from `/usr/share/nginx/html` and proxies **`/api/*`** to the backend (`BACKEND_URL` in the frontend container — `http://backend:8080` under Compose) |

Compose project name is **`compass`** (see `name:` in the YAML files).

**Ports**

| Service | Local dev (native) | `docker compose` |
|---------|-------------------|------------------|
| UI | `http://localhost:3001` (Vite dev server) | `http://localhost:3000` (container **80** → host **3000**) |
| API | `http://localhost:8080` | `http://localhost:8080` |
| PostgreSQL | `127.0.0.1:5432` | `127.0.0.1:5432` |

Health check: `GET http://localhost:8080/actuator/health`

## Installation

### Prerequisites

- **Docker** and **Docker Compose** (for full stack or DB-only)
- **Java 21** + **Gradle wrapper** (for running the backend outside Docker)
- **Node.js 20+** with **pnpm** (Corepack: `corepack enable` then use `pnpm` — lockfile is `pnpm-lock.yaml`)

### Option A: Full stack with Docker (demo / production-like)

Builds backend and frontend images, starts PostgreSQL, API, and UI.

```bash
docker compose up --build
```

Open **`http://localhost:3000`**. The browser talks to nginx on 3000; API calls go to **`/api/...`**, which nginx forwards to the backend container.

First startup runs Flyway and, with the default **`local`** profile in Compose, seeds the small demo dataset (see [Seed data](#seed-data)).

To stop: `Ctrl+C` or `docker compose down`. To reset the DB volume: `docker compose down -v` (destructive).

### Option B: Database in Docker, apps on the host (recommended for development)

Keeps Postgres in Docker; run Spring Boot and Vite locally for fast reload.

```bash
# 1) Start PostgreSQL only
docker compose -f docker-compose.dev.yml up -d

# 2) Backend — uses application-local.yml (localhost:5432, seed on)
cd backend
./gradlew bootRun
# API: http://localhost:8080

# 3) Frontend (separate terminal)
cd frontend
pnpm install
pnpm dev
# UI: http://localhost:3001 — Vite proxies /api to :8080
```

Optional: copy **`.env.example`** to **`.env`** in the repo root and export variables your shell (or IDE) should pass to the JVM — Spring Boot does not auto-load `.env`; use `export`, direnv, or IDE run configuration. Backend picks up standard env vars (see below). For the Vite app, only variables prefixed with **`VITE_`** are exposed to the client.

### Module Federation (host remote) build

The default `pnpm build` produces the standalone app. To emphasize the federated remote entry (for a parent/host app that consumes this module):

```bash
cd frontend
pnpm run build:remote
```

### Environment variables

Values below match **`backend/src/main/resources/application*.yml`**. Prefer env vars in production; local defaults live in **`application-local.yml`** when **`SPRING_PROFILES_ACTIVE=local`**.

**Backend — core**

| Variable | Typical / default | Description |
|----------|-------------------|-------------|
| `SPRING_PROFILES_ACTIVE` | `local` (dev), `railway` (hosted) | Loads `application-{profile}.yml` |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/compass` (local file) | JDBC URL; Compose sets `jdbc:postgresql://db:5432/compass` |
| `SPRING_DATASOURCE_USERNAME` | `compass` | |
| `SPRING_DATASOURCE_PASSWORD` | `compasslocal` | |
| `DATABASE_URL` | — | **Railway:** JDBC URL injected by the platform (see `application-railway.yml`) |

**Backend — product**

| Variable | Typical / default | Description |
|----------|-------------------|-------------|
| `COMPASS_SEED_ENABLED` | `true` (local profile), `false` (Railway default) | Run demo seed on startup |
| `COMPASS_SEED_OBSERVATORY` | `false` | Large seed: 3 orgs, ~150 users, 12 weeks (~30s) |
| `COMPASS_CORS_ALLOWED_ORIGINS` | Local: `http://localhost:3000,http://localhost:3001` | Comma-separated origins; **must** be set to your real frontend origin in production or CORS will block |
| `COMPASS_JWT_ISSUER` | — | Production (`railway`): JWT issuer |
| `COMPASS_JWT_PUBLIC_KEY` | — | Production: PEM for RS256 validation |

**Backend — LLM**

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Primary provider |
| `ANTHROPIC_API_KEY` | — | Used when OpenAI is not configured or as configured by code paths |
| `LLM_MODEL` | `gpt-4.1-nano` | Model name |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base |

Template / fallback narratives are used when keys are absent so the app still runs.

**Frontend (Vite)**

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | *(empty)* | API base URL for Axios. Empty = relative **`/api`** (correct behind Compose nginx or Vite proxy). Set to an absolute URL only if the API is on another origin without a proxy |

**Frontend container (Docker / production)**

| Variable | Default in image | Description |
|----------|------------------|-------------|
| `BACKEND_URL` | `http://backend:8080` | Upstream for **`location /api/`** in nginx. Under Compose, hostname **`backend`** resolves. **On split hosts (e.g. Railway), set this to your backend’s public origin**, e.g. `https://your-api.up.railway.app` |

### Database

**PostgreSQL 16** — with **`docker-compose.dev.yml`** or full **`docker-compose.yml`**, the server is on **`127.0.0.1:5432`**, database **`compass`**, user **`compass`**, password **`compasslocal`**. Flyway runs automatically when the backend starts; no manual DDL.

### Seed data

**Small seed** (default when `COMPASS_SEED_ENABLED=true` with the local profile): 1 org (Meridian Manufacturing), **10** users, 2 Rally Cries, 4 defining objectives, 5 outcomes, 3 weeks of commitments and reconciliation records.

**Observatory seed** (`COMPASS_SEED_OBSERVATORY=true`): 3 orgs, ~150 users, 12 weeks of generated data. Allow ~30 seconds on boot.

### Running tests

```bash
# Backend — Docker must be running (Testcontainers)
cd backend && ./gradlew test

# Frontend
cd frontend && pnpm test
```

Optional: `cd frontend && pnpm run typecheck` / `pnpm run lint`

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

Uses OpenAI by default (`LLM_MODEL` / `LLM_BASE_URL`) with Anthropic available. Hardcoded template narratives serve as fallback when no API key is configured.

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

The **`local`** Spring profile uses **`DevTokenValidator`** so you can develop without a real IdP; production (`railway`) uses RS256 validation when JWT properties are set.

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

### Railway (or any split API + UI hosting)

There is **no `railway.toml`** in this repo; configure services in the Railway dashboard (or CLI).

1. **Postgres** — Use Railway’s PostgreSQL plugin. **`DATABASE_URL`** is injected for the backend.
2. **Backend service** — Build from **`backend/Dockerfile`**. Set:
   - `SPRING_PROFILES_ACTIVE=railway`
   - `COMPASS_CORS_ALLOWED_ORIGINS` = your **frontend** public origin (e.g. `https://your-app.up.railway.app`)
   - `COMPASS_JWT_ISSUER` / `COMPASS_JWT_PUBLIC_KEY` for production auth
   - `COMPASS_SEED_ENABLED=false` for normal operation (enable briefly if you need a first-time demo seed)
3. **Frontend service** — Build from **`frontend/Dockerfile`**. Set **`BACKEND_URL`** to the backend’s **public** base URL (scheme + host, no trailing path), e.g. `https://your-api.up.railway.app`, so nginx can proxy `/api` to the API.

Connection pool size is **10** on Railway vs **5** for local (`application-railway.yml` vs `application-local.yml`).

### Docker production build (self-hosted)

Same as [Option A](#option-a-full-stack-with-docker-demoproduction-like): multi-stage **`backend/Dockerfile`** (Eclipse Temurin 21) and **`frontend/Dockerfile`** (Node build → nginx). Override **`BACKEND_URL`** on the frontend container if the API hostname is not `http://backend:8080`.

## Ports (summary)

| Service | Local dev | Docker Compose |
|---------|-----------|----------------|
| Frontend | `localhost:3001` | `localhost:3000` → container **80** |
| Backend | `localhost:8080` | `localhost:8080` |
| PostgreSQL | `localhost:5432` | `127.0.0.1:5432` |
