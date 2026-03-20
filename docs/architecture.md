# Compass Weekly Commit Module — Architecture

## Table of Contents
1. [Repository Structure](#1-repository-structure)
2. [Data Model](#2-data-model)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Infrastructure & Deployment](#5-infrastructure--deployment)

---

## 1. Repository Structure

Monorepo with clear separation between frontend, backend, and shared infrastructure.

```
compass/
├── README.md
├── .gitignore
├── docker-compose.yml              # Full-stack local dev
├── docker-compose.dev.yml          # DB-only for native dev
├── .env.example
│
├── docs/
│   ├── requirements.md
│   └── architecture.md
│
├── backend/
│   ├── Dockerfile
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle/wrapper/
│   ├── gradlew
│   └── src/
│       ├── main/
│       │   ├── java/com/compass/platform/
│       │   │   ├── CommitTrackerApplication.java
│       │   │   ├── config/
│       │   │   ├── domain/
│       │   │   │   ├── commit/
│       │   │   │   ├── cycle/
│       │   │   │   ├── reconciliation/
│       │   │   │   ├── rcdo/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── user/
│       │   │   │   └── importexport/
│       │   │   ├── audit/
│       │   │   ├── security/
│       │   │   ├── shared/
│       │   │   └── logging/
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-local.yml
│       │       ├── application-railway.yml
│       │       ├── application-test.yml
│       │       ├── logback-spring.xml
│       │       ├── db/migration/
│       │       └── seed/
│       └── test/
│           ├── java/com/compass/platform/
│           │   ├── domain/
│           │   ├── integration/
│           │   └── support/
│           └── resources/
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   ├── webpack.config.ts
│   ├── tailwind.config.ts
│   ├── jest.config.ts
│   └── src/
│       ├── bootstrap.tsx
│       ├── App.tsx
│       ├── index.ts
│       ├── api/
│       ├── types/
│       ├── hooks/
│       ├── stores/
│       ├── features/
│       │   ├── commit-entry/
│       │   ├── weekly-lifecycle/
│       │   ├── reconciliation/
│       │   ├── manager-dashboard/
│       │   └── chessboard/
│       ├── components/
│       ├── lib/
│       └── test/
│
└── .github/workflows/ci.yml
```

### Build Tools

| Concern | Tool | Rationale |
|---|---|---|
| Backend build | Gradle 8.x (Kotlin DSL) | Spring Boot standard, fast incremental |
| Backend framework | Spring Boot 3.2+ / Java 21 | Mature, virtual threads support |
| DB migrations | Flyway | Convention-based versioned SQL |
| Frontend build | Webpack 5 | Module Federation requirement |
| Frontend framework | React 18 + TypeScript strict | Host app compatibility |
| CSS | Tailwind CSS 3 (prefix: `compass-`) | Scoped styles in host app |
| Package manager | pnpm | Fast, strict resolution |

---

## 2. Data Model

PostgreSQL. All entities are org-scoped for multi-tenant readiness.

### 2.1 Design Principles

- **Org-scoped everything.** Every table carries `org_id`. Enables simple RLS policies, prepares for superorg without restructuring.
- **UUIDs as primary keys.** Portable across environments, safe for CSV import/export.
- **Soft deletes on RCDO entities.** `archived_at` timestamp, never hard delete. Historical commitments retain their links.
- **Cycle as first-class entity.** Per-user, not derived from dates. Each user manages their own weekly lifecycle independently. Supports flexible cadence.
- **State machine: application logic, database audit.** `commitments.state` for fast reads, `commitment_state_transitions` as append-only audit log. Both `cycles.state` and `commitments.state` share the `commitment_state` Postgres enum. When a cycle transitions, the service layer bulk-updates all `commitments.state` values for that cycle to match — `commitments.state` is denormalized for queryability but always kept in sync with its parent cycle.
- **Three nullable RCDO FKs with consistency constraint.** Typed foreign keys (not polymorphic), referential integrity enforced by Postgres.
- **Chess categories as org-scoped lookup table.** Customizable per portfolio company.
- **Carry-forward as lineage.** New row in next cycle with `carried_from_id`, not mutation of original.

### 2.2 Schema

```sql
-- ============================================================
-- EXTENSIONS & ENUMS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE commitment_state AS ENUM ('DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED');
CREATE TYPE completion_horizon AS ENUM ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW');
CREATE TYPE reconciliation_status AS ENUM ('COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_STARTED', 'CARRIED_FORWARD');
CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE', 'ANALYST');

-- ============================================================
-- ORGS
-- ============================================================
CREATE TABLE orgs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    external_id     TEXT,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'EMPLOYEE',
    reports_to      UUID REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, email)
);

-- ============================================================
-- RCDO HIERARCHY
-- ============================================================
CREATE TABLE rally_cries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    title           TEXT NOT NULL,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE defining_objectives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    rally_cry_id    UUID NOT NULL REFERENCES rally_cries(id),
    title           TEXT NOT NULL,
    description     TEXT,
    owner_user_id   UUID REFERENCES users(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outcomes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    defining_objective_id UUID NOT NULL REFERENCES defining_objectives(id),
    title           TEXT NOT NULL,
    description     TEXT,
    owner_user_id   UUID REFERENCES users(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHESS CATEGORIES
-- ============================================================
CREATE TABLE chess_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    name            TEXT NOT NULL,
    description     TEXT,
    color_hex       TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

-- ============================================================
-- CYCLES
-- ============================================================
CREATE TABLE cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    label           TEXT NOT NULL,
    state           commitment_state NOT NULL DEFAULT 'DRAFT',
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cycle_date_order CHECK (ends_at > starts_at),
    UNIQUE (org_id, user_id, starts_at)
);

-- ============================================================
-- COMMITMENTS
-- ============================================================
CREATE TABLE commitments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES orgs(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    cycle_id            UUID NOT NULL REFERENCES cycles(id),
    rally_cry_id        UUID REFERENCES rally_cries(id),
    defining_objective_id UUID REFERENCES defining_objectives(id),
    outcome_id          UUID REFERENCES outcomes(id),
    chess_category_id   UUID REFERENCES chess_categories(id),
    priority_rank       INTEGER NOT NULL DEFAULT 0,
    title               TEXT NOT NULL,
    description         TEXT,
    completion_horizon  completion_horizon NOT NULL DEFAULT 'EOW',
    state               commitment_state NOT NULL DEFAULT 'DRAFT',
    assigned_by         UUID REFERENCES users(id),
    carried_from_id     UUID REFERENCES commitments(id),
    is_unplanned        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rcdo_hierarchy_consistency CHECK (
        (outcome_id IS NULL OR defining_objective_id IS NOT NULL)
        AND (defining_objective_id IS NULL OR rally_cry_id IS NOT NULL)
    )
);

-- ============================================================
-- TASK BULLETS
-- ============================================================
CREATE TABLE task_bullets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id   UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES orgs(id),
    body            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RECONCILIATION RECORDS
-- ============================================================
CREATE TABLE reconciliation_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    commitment_id   UUID NOT NULL REFERENCES commitments(id),
    cycle_id        UUID NOT NULL REFERENCES cycles(id),
    status          reconciliation_status NOT NULL,
    notes           TEXT,
    planned_horizon completion_horizon,
    reconciled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    reconciled_by   UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (commitment_id, cycle_id)
);

-- ============================================================
-- STATE TRANSITION AUDIT LOG
-- ============================================================
CREATE TABLE commitment_state_transitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    commitment_id   UUID NOT NULL REFERENCES commitments(id),
    from_state      commitment_state,
    to_state        commitment_state NOT NULL,
    triggered_by    UUID NOT NULL REFERENCES users(id),
    reason          TEXT,
    transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ANALYST SCOPES
-- ============================================================
CREATE TABLE analyst_scopes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    analyst_user_id UUID NOT NULL REFERENCES users(id),
    rally_cry_id    UUID REFERENCES rally_cries(id),
    org_unit_root_user_id UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT at_least_one_scope CHECK (
        rally_cry_id IS NOT NULL OR org_unit_root_user_id IS NOT NULL
    )
);

-- ============================================================
-- AUDIT ENTRIES
-- ============================================================
CREATE TABLE audit_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,
    actor_id        UUID NOT NULL REFERENCES users(id),
    actor_role      TEXT NOT NULL,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Updated_at Trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to: orgs, users, rally_cries, defining_objectives, outcomes,
-- chess_categories, cycles, commitments, task_bullets
```

### 2.4 Indexing Strategy

```sql
-- USERS
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_reports_to ON users(reports_to) WHERE reports_to IS NOT NULL;
CREATE INDEX idx_users_org_active ON users(org_id) WHERE is_active = TRUE;

-- RCDO HIERARCHY
CREATE INDEX idx_rally_cries_org ON rally_cries(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_defining_objectives_rally_cry ON defining_objectives(rally_cry_id) WHERE archived_at IS NULL;
CREATE INDEX idx_defining_objectives_owner ON defining_objectives(owner_user_id) WHERE owner_user_id IS NOT NULL AND archived_at IS NULL;
CREATE INDEX idx_outcomes_defining_objective ON outcomes(defining_objective_id) WHERE archived_at IS NULL;
CREATE INDEX idx_outcomes_owner ON outcomes(owner_user_id) WHERE owner_user_id IS NOT NULL AND archived_at IS NULL;

-- CYCLES
CREATE UNIQUE INDEX idx_cycles_user_active ON cycles(org_id, user_id) WHERE is_active = TRUE;
CREATE INDEX idx_cycles_org_dates ON cycles(org_id, starts_at, ends_at);
CREATE INDEX idx_cycles_user ON cycles(user_id);

-- COMMITMENTS
CREATE INDEX idx_commitments_user_cycle ON commitments(user_id, cycle_id);
CREATE INDEX idx_commitments_org_cycle ON commitments(org_id, cycle_id);
CREATE INDEX idx_commitments_rally_cry ON commitments(rally_cry_id) WHERE rally_cry_id IS NOT NULL;
CREATE INDEX idx_commitments_defining_objective ON commitments(defining_objective_id) WHERE defining_objective_id IS NOT NULL;
CREATE INDEX idx_commitments_outcome ON commitments(outcome_id) WHERE outcome_id IS NOT NULL;
CREATE INDEX idx_commitments_org_cycle_chess ON commitments(org_id, cycle_id, chess_category_id);
CREATE INDEX idx_commitments_assigned_by ON commitments(assigned_by, cycle_id) WHERE assigned_by IS NOT NULL;
CREATE INDEX idx_commitments_carried_from ON commitments(carried_from_id) WHERE carried_from_id IS NOT NULL;
CREATE INDEX idx_commitments_org_cycle_state ON commitments(org_id, cycle_id, state);

-- TASK BULLETS
CREATE INDEX idx_task_bullets_commitment ON task_bullets(commitment_id, sort_order);

-- RECONCILIATION RECORDS
CREATE INDEX idx_reconciliation_commitment ON reconciliation_records(commitment_id);
CREATE INDEX idx_reconciliation_org_cycle ON reconciliation_records(org_id, cycle_id);
CREATE INDEX idx_reconciliation_status ON reconciliation_records(org_id, cycle_id, status);

-- STATE TRANSITIONS
CREATE INDEX idx_state_transitions_commitment ON commitment_state_transitions(commitment_id, transitioned_at);
CREATE INDEX idx_state_transitions_org ON commitment_state_transitions(org_id, transitioned_at);

-- ANALYST SCOPES
CREATE INDEX idx_analyst_scopes_analyst ON analyst_scopes(analyst_user_id);

-- AUDIT ENTRIES
CREATE INDEX idx_audit_entries_org ON audit_entries(org_id, created_at DESC);
CREATE INDEX idx_audit_entries_entity ON audit_entries(entity_type, entity_id);
CREATE INDEX idx_audit_entries_actor ON audit_entries(actor_id);
```

**Key indexing notes:**
- Partial indexes (`WHERE archived_at IS NULL`, `WHERE is_active = TRUE`) keep index sizes small.
- `idx_cycles_user_active` is a unique partial index enforcing at-most-one active cycle per user per org at the DB level.
- Composite indexes on `(org_id, cycle_id, ...)` cover the dominant access pattern: everything in an org for a cycle.

### 2.5 CSV Import Schema

Three CSV files processed in dependency order:

**`users.csv`**: `email, display_name, role, reports_to_email, external_id`
- Two-pass import: create users, then resolve `reports_to` references.

**`rcdo_hierarchy.csv`**: `rally_cry, defining_objective, outcome, owner_email`
- Flat CSV expressing the tree. Deduplicates by title within each level.

**`chess_categories.csv`** (optional): `name, description, color_hex`
- Defaults seeded if absent: Strategic (#2563EB), Operational (#6B7280), Defensive (#DC2626), Capability Building (#059669).

Cycles are not imported via CSV — they are auto-created per-user by `CycleService.getCurrentCycle()` and seeded by `DataInitializer` for demo data.

All imports are idempotent (upsert by natural key) and produce a structured JSON report of rows imported/skipped/errored.

---

## 3. Backend Architecture

Spring Boot 3.2+ / Java 21 / Gradle (Kotlin DSL).

### 3.1 Package Layout

```
com.compass.platform/
├── CommitTrackerApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── JacksonConfig.java
│   ├── AuditConfig.java
│   └── CorsConfig.java
├── domain/
│   ├── commit/        (Commitment entity, repo, service, controller)
│   ├── cycle/         (Cycle entity, CycleStateMachine, repo, service, controller)
│   ├── reconciliation/(ReconciliationRecord entity, repo, service, controller)
│   ├── rcdo/          (RallyCry, DefiningObjective, Outcome entities, service, controller)
│   ├── dashboard/     (DashboardService, DashboardController, DTOs)
│   ├── user/          (AppUser entity, repo, service)
│   └── importexport/  (CsvImportService, CsvImportController)
├── audit/             (AuditEntry entity, repo, service — append-only)
├── security/
│   ├── JwtAuthenticationFilter.java
│   ├── HostAppTokenValidator.java
│   ├── SecurityContext.java
│   └── VisibilityEnforcer.java
├── shared/
│   ├── ApiResponse.java
│   ├── PagedResponse.java
│   ├── ErrorResponse.java
│   ├── GlobalExceptionHandler.java
│   └── TenantContext.java
└── logging/
    ├── RequestLoggingFilter.java
    └── StructuredLogFields.java
```

### 3.2 Key Dependencies

| Dependency | Purpose |
|---|---|
| `spring-boot-starter-web` | REST API |
| `spring-boot-starter-data-jpa` | JPA / Hibernate |
| `spring-boot-starter-security` | Auth filter chain |
| `spring-boot-starter-validation` | Bean validation |
| `spring-boot-starter-actuator` | Health endpoints |
| `flyway-core` | Schema migrations |
| `postgresql` (runtime) | DB driver |
| `logstash-logback-encoder` | Structured JSON logging |
| `nimbus-jose-jwt` | JWT validation |
| `opencsv` | CSV import parsing |
| `spring-boot-starter-test` | JUnit 5, MockMvc |
| `testcontainers:postgresql` | Integration tests against real Postgres |

### 3.3 API Design

All endpoints prefixed with `/api/v1`. Standard response envelope:

```json
{
  "data": { ... },
  "meta": { "timestamp": "...", "requestId": "..." },
  "errors": []
}
```

#### Commitments

| Method | Path | Description |
|---|---|---|
| `POST` | `/commitments` | Create commitment in current DRAFT cycle |
| `POST` | `/commitments/unplanned` | Create unplanned work during RECONCILING (auto-creates reconciliation record) |
| `GET` | `/commitments/{id}` | Get single commitment |
| `PUT` | `/commitments/{id}` | Update (DRAFT state only) |
| `DELETE` | `/commitments/{id}` | Delete (DRAFT only) |
| `GET` | `/commitments` | List with filters |
| `PUT` | `/commitments/reorder` | Batch reorder (ordered list of IDs) |

**Filters:** `cycleId`, `userId`, `rcdoType`, `rcdoId`, `chessCategory`, `status`, `assignedBy`, `page`, `size`, `sort`

**Create request:**
```json
{
  "title": "Create BD deck for Acme",
  "bullets": ["Copy slides from prior deck", "Create 1-2 new slides", "Send for review"],
  "completionHorizon": "AFTERNOON",
  "chessCategoryId": "uuid",
  "rallyCryId": "uuid",
  "definingObjectiveId": "uuid",
  "outcomeId": "uuid",
  "assignedBy": "uuid-or-null"
}
```

#### Cycles

| Method | Path | Description |
|---|---|---|
| `GET` | `/cycles/current` | Get or create current DRAFT cycle for authenticated user |
| `GET` | `/cycles/{id}` | Get specific cycle |
| `GET` | `/cycles` | List cycle history |
| `POST` | `/cycles/{id}/transition` | Trigger state transition |

**Transition request:** `{ "targetState": "LOCKED", "reason": "optional note" }`

#### Reconciliation

| Method | Path | Description |
|---|---|---|
| `GET` | `/cycles/{cycleId}/reconciliation` | Get reconciliation view |
| `PUT` | `/commitments/{id}/reconcile` | Record reconciliation for one commitment |
| `POST` | `/cycles/{cycleId}/reconciliation/complete` | Mark reconciliation complete → RECONCILED |

**Reconcile request:**
```json
{
  "status": "PARTIALLY_COMPLETED",
  "completionNotes": "Slides done, review pending",
  "carryForward": true,
  "bulletStatuses": [
    { "bulletId": "uuid", "done": true },
    { "bulletId": "uuid", "done": false }
  ]
}
```

#### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/team` | Manager team roll-up |
| `GET` | `/dashboard/alignment` | Alignment gap signal (chess category distribution) |
| `GET` | `/dashboard/assignment-attribution` | Assignment attribution stats |
| `GET` | `/dashboard/rcdo-coverage` | RCDO coverage analysis |

**Shared filters:** `cycleWeekStart`, `teamMemberId`, `rcdoId`, `rcdoType`, `includeSubtree`

**Alignment response:**
```json
{
  "teamSize": 8,
  "distribution": {
    "STRATEGIC": { "count": 22, "percentage": 45.8 },
    "OPERATIONAL": { "count": 18, "percentage": 37.5 },
    "DEFENSIVE": { "count": 5, "percentage": 10.4 },
    "CAPABILITY_BUILDING": { "count": 3, "percentage": 6.3 }
  },
  "unlinkedCount": 2,
  "byTeamMember": [ ... ]
}
```

#### RCDO Hierarchy

| Method | Path | Description |
|---|---|---|
| `GET` | `/rcdo/tree` | Full hierarchy for dropdowns |
| `GET` | `/rcdo/rally-cries` | List rally cries |
| `POST` | `/rcdo/rally-cries` | Create (admin/director) |
| `PUT` | `/rcdo/{type}/{id}` | Update |
| `DELETE` | `/rcdo/{type}/{id}` | Archive (soft-delete) |

#### CSV Import

| Method | Path | Description |
|---|---|---|
| `POST` | `/import/users` | Upload users CSV |
| `POST` | `/import/rcdo` | Upload RCDO hierarchy CSV |
| `POST` | `/import/chess-categories` | Upload chess categories CSV (optional — defaults seeded if absent) |
| `POST` | `/import/commitments` | Upload commitments CSV (async) |
| `GET` | `/import/{jobId}/status` | Check async import status |

#### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me` | Current user profile |
| `GET` | `/users/team` | Direct reports |
| `GET` | `/users/tree` | Full org subtree (director+) |

### 3.4 State Machine

```
DRAFT → LOCKED → RECONCILING → RECONCILED → (carry forward creates new DRAFT)
```

Implemented as a standalone class `CycleStateMachine` — pure Java, no Spring dependencies, trivially unit-testable.

| Transition | Who Can Trigger | Preconditions |
|---|---|---|
| DRAFT → LOCKED | Cycle user (owner) or their manager | At least 1 commitment exists. No backdating. |
| LOCKED → RECONCILING | System (at cycle end) or cycle user/manager | Week end date has passed (or manager override) |
| RECONCILING → RECONCILED | Cycle user (owner) only | Every commitment has a reconciliation record |
| RECONCILED → carry forward | System (automatic) | All `carryForward: true` items cloned into next cycle DRAFT |

**Cycle ownership:** Each cycle belongs to a specific user (`cycles.user_id`). The "owner" is the user whose cycle it is. Each user manages their own weekly lifecycle independently — locking, reconciling, and completing their own commitments without affecting other users' cycles.

**Carry-forward mechanics:**
1. Transition current cycle to RECONCILED
2. Clone commitments where `carryForward == true` into next cycle
3. Cloned item retains title, bullets, RCDO link, category, `assigned_by`
4. Sets `carried_from_id` to original, resets rank and completion horizon
5. Original retains its reconciliation record showing CARRIED_FORWARD

**Enforcement:**
- `CommitmentService.update()` and `.delete()` check `cycle.state == DRAFT`, throw 409 Conflict otherwise
- Every transition writes to `commitment_state_transitions` audit log with actor, timestamp, reason, metadata

### 3.5 Service Layer

| Service | Responsibilities |
|---|---|
| `CommitmentService` | CRUD with cycle-state guards, RCDO validation, rank ordering, assignment attribution, carry-forward cloning |
| `CycleService` | Per-user lifecycle management, delegates to `CycleStateMachine` for validation, orchestrates carry-forward, auto-creates DRAFT cycle for the requesting user |
| `ReconciliationService` | Per-commitment reconciliation recording, bullet-level completion, summary computation |
| `DashboardService` | Read-only aggregation — alignment signal, team roll-up, assignment attribution, RCDO coverage |
| `CsvImportService` | CSV parsing, validation, fuzzy RCDO matching, batch upsert, async processing for large imports |
| `RcdoService` | RCDO CRUD, soft-delete with referential integrity warnings, tree query |
| `AuditService` | Write-only append log, query interface for compliance |

### 3.6 Logging Strategy

**Infrastructure:** Logback + `logstash-logback-encoder` for structured JSON. MDC fields on every log line: `requestId`, `userId`, `orgId`.

**What gets logged (exhaustive):**

| Event | Level | Fields |
|---|---|---|
| Every API request/response | INFO | method, path, status, durationMs, userId, orgId, requestId, bodySize |
| Every state transition | INFO | entityType, entityId, fromState, toState, actorId, actorRole, reason, metadata |
| Every permission check | DEBUG (ALLOWED), WARN (DENIED) | action, targetEntityType, targetEntityId, actorId, actorRole, result, reason |
| Every RCDO link change | DEBUG | commitmentId, previousLink, newLink, actorId |
| Every reconciliation action | INFO | commitmentId, cycleId, status, carryForward, bulletProgress, actorId |
| Every carry-forward | INFO | sourceCommitmentId, targetCommitmentId, consecutiveCarries |
| Every CSV import | INFO | jobId, type, rowsReceived, validRows, errorRows, durationMs |
| Every error | ERROR | exceptionClass, message, stackTrace, requestId, userId, context (commitmentId, cycleState, etc.) |

### 3.7 Security & Auth

**Authentication:** PA host app issues JWTs. Backend validates signature against host app's public key. Extracts: userId, orgId, role, reports_to, rcdo_ownership.

**Visibility enforcement** — `VisibilityEnforcer` component called by every service method:
1. Same user → always allowed
2. Direct manager of target → allowed
3. In management chain above target → allowed (DIRECTOR+)
4. EXECUTIVE → allowed for same org
5. ANALYST → allowed within defined scope
6. RCDO owner → allowed for commitments linked to their objective

**Authorization matrix:**

| Endpoint | EMPLOYEE | MANAGER | DIRECTOR+ | ANALYST |
|---|---|---|---|---|
| Own commitments CRUD | R/W | R/W | R/W | — |
| Own cycle transitions | Yes | Yes | Yes | — |
| View direct reports | — | Yes | Yes | Read (scoped) |
| View full subtree | — | — | Yes | Read (scoped) |
| Dashboard | — | Yes | Yes | Read (scoped) |
| RCDO CRUD | — | — | Yes | — |
| CSV Import | — | — | Yes | — |

### 3.8 Testing Strategy

| Layer | Tool | Approach |
|---|---|---|
| Unit (business logic) | JUnit 5 + Mockito | `CycleStateMachine`, service logic, no Spring context |
| Repository slice | `@DataJpaTest` + Testcontainers (Postgres 16) | Query validation against real Postgres (H2 diverges on enums, partial indexes) |
| Integration (full stack) | `@SpringBootTest` + Testcontainers (Postgres 16) | Real DB, authenticated requests via MockMvc |

**Key test cases for the state machine:**

- DRAFT→LOCKED succeeds with valid commitments
- DRAFT→LOCKED fails with no commitments
- DRAFT→LOCKED fails with past week start (no backdating)
- LOCKED→RECONCILING fails before week end
- RECONCILING→RECONCILED fails with unreconciled commitments
- Invalid skip (DRAFT→RECONCILING) rejected
- RECONCILED is terminal
- Non-owner cannot trigger transitions
- Carry-forward creates cloned commitments in next cycle
- Concurrent transition (optimistic locking) — only one succeeds

---

## 4. Frontend Architecture

React 18 / TypeScript strict / Webpack 5 Module Federation.

### 4.1 Core Stack

| Layer | Choice | Rationale |
|---|---|---|
| Build | Webpack 5 + Module Federation | PM remote pattern requirement |
| State (server) | TanStack Query v5 | Cache, background refetch, optimistic updates |
| State (UI) | Zustand | Lightweight, no boilerplate |
| Routing | React Router 6 | Host passes basename, remote handles sub-routes |
| CSS | Tailwind CSS 3 (prefix: `compass-`) | Scoped styles, rapid development |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable | Modern, accessible, maintained |
| Charts | Recharts | Lightweight, React-native |
| Forms | React Hook Form + Zod | Complex form validation, Zod doubles as API schema validator |
| HTTP | Axios | Interceptor-based auth injection |

### 4.2 Module Federation Configuration

```typescript
new ModuleFederationPlugin({
  name: 'compassCommitModule',
  filename: 'remoteEntry.js',
  exposes: {
    './App': './src/index.ts',
    './CommitEntry': './src/features/commit-entry/CommitEntryPage.tsx',
    './Dashboard': './src/features/manager-dashboard/ManagerDashboardPage.tsx',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.3' },
    'react-dom': { singleton: true, requiredVersion: '^18.3' },
    'react-router-dom': { singleton: true, requiredVersion: '^6.22' },
  },
})
```

**Primary export (`./App`):** Full application with internal routing. Host mounts at a route prefix, remote handles all sub-routing.

**Auth handoff:** Host passes `AuthContext` (token, user, refreshToken) as props at the mount boundary. Axios client reads token via React ref and injects as Bearer header.

**Style isolation:** Tailwind prefix `compass-` prevents class collisions with host app.

### 4.3 Routing

```typescript
function App({ basename, authContext }: RemoteAppProps) {
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider value={authContext}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/" element={<CommitEntryPage />} />
            <Route path="/cycle" element={<WeeklyLifecyclePage />} />
            <Route path="/reconciliation" element={<ReconciliationPage />} />
            <Route path="/dashboard" element={<ManagerDashboardPage />} />
            <Route path="/chessboard" element={<ChessboardPage />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 4.4 Component Architecture

#### Commit Entry (`/commitments`)

```
CommitEntryPage
├── PageHeader (week label, cycle state badge)
├── CommitmentForm (modal/inline panel)
│   ├── RcdoAutocomplete (3-tier cascading: RC → DO → Outcome)
│   ├── CategorySelector (radio group: Strategic | Operational | Defensive | Capability)
│   ├── HorizonSelector (segmented buttons: Morning → EOW)
│   ├── TaskBulletEditor (dynamic 2-5 items, freeform text)
│   └── AssignmentAttribution (self-directed toggle or manager dropdown)
├── CommitmentList (drag-and-drop sortable)
│   └── CommitmentCard (draggable, expandable for bullets)
└── CycleStateIndicator
```

- Drag-and-drop reorder sets priority implicitly (position = rank)
- Form disabled when cycle state is not DRAFT
- RCDO autocomplete: debounced server search, recent selections pinned, "unlinked" escape hatch
- Category auto-suggested from RCDO selection (strategic if linked, operational if unlinked)

#### Reconciliation (`/reconciliation`)

```
ReconciliationPage
├── PlannedVsActualTable (two-column per commitment)
│   ├── CommitmentStatusMarker (Completed | Partial | Not Started | Carried Forward)
│   ├── Bullet-level checkboxes
│   └── ChangeReasonCapture (textarea, required if status != Completed)
├── UnplannedWorkEntry (simplified commitment form, tagged as unplanned)
└── ReconciliationSummary (aggregate stats + submit button)
```

#### Manager Dashboard (`/dashboard`)

```
ManagerDashboardPage
├── DashboardFilters (team member, RCDO, week, status, category)
├── AlignmentGapChart ← THE key differentiator
│   └── Stacked horizontal bars: X% Strategic | Y% Operational | Z% Defensive | W% Capability
│   └── Aggregate bar at top (team-level headline)
│   └── Per-member bars below
│   └── Hover tooltip: "Alice — 60% Strategic (3 of 5 commitments)"
│   └── Click segment → filters roll-up table
├── AssignmentSignals
│   └── "X% of team work is manager-assigned"
│   └── "80% of assignments go to [person]" (dependency risk)
└── TeamRollupTable (row per report, expandable to commitment detail)
```

#### Chessboard (`/chessboard`)

```
ChessboardPage
└── ChessboardGrid (CSS Grid)
    └── X-axis: chess categories
    └── Y-axis: priority tiers (High / Medium / Low)
    └── Cells contain commitment chips (compact pills with hover detail)
```

Read-only strategic overview. Managers can toggle between own view and any direct report's.

### 4.5 State Management

**Server state (TanStack Query):**

| Query Key | Stale Time | Notes |
|---|---|---|
| `['cycle', weekId]` | 30s | Refetch on window focus |
| `['commitments', cycleId]` | 30s | Invalidated on mutation |
| `['rcdo', 'search', query]` | 60s | Debounced, keepPreviousData |
| `['rcdo', 'hierarchy']` | 5min | Full tree for filters |
| `['reconciliation', cycleId]` | 30s | |
| `['team', 'dashboard', filters]` | 60s | |

**Optimistic updates** only for drag-and-drop reorder. All state transitions wait for server confirmation.

**Client state (Zustand):** modal open/close, active drag session, dashboard filters (synced to URL params). Auth comes from host app context.

### 4.6 TypeScript Strict Mode

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

ESLint: `@typescript-eslint/strict-type-checked` — `no-explicit-any: error`, `no-non-null-assertion: error`, `switch-exhaustiveness-check: error`.

**Zod schemas** mirror TypeScript interfaces for runtime API response validation. If the backend changes its response shape, Zod throws at parse time rather than propagating undefined through the UI.

### 4.7 Key Domain Types

```typescript
export type CycleState = 'DRAFT' | 'LOCKED' | 'RECONCILING' | 'RECONCILED';
export type CompletionHorizon = 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'EOD' | 'EOW';
export type ReconciliationStatus = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'NOT_STARTED' | 'CARRIED_FORWARD';

export interface Cycle {
  id: string;
  orgId: string;
  userId: string;
  label: string;
  state: CycleState;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  commitmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChessCategory {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
}

export type AssignmentAttribution =
  | { kind: 'SELF_DIRECTED' }
  | { kind: 'ASSIGNED_BY'; assignedById: string; assignedByName: string };

export interface Commitment {
  id: string;
  cycleId: string;
  userId: string;
  title: string;
  rcdoLink: { rallyCryId: string | null; definingObjectiveId: string | null; outcomeId: string | null };
  chessCategoryId: string | null;
  chessCategoryName: string | null;
  completionHorizon: CompletionHorizon;
  priorityRank: number;
  bullets: TaskBullet[];
  attribution: AssignmentAttribution;
  carriedFromCommitmentId: string | null;
  isUnplanned: boolean;
  reconciliationStatus: ReconciliationStatus | null;
  reconciliationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlignmentBreakdown {
  categoryId: string;
  categoryName: string;
  colorHex: string;
  count: number;
  percentage: number;
}

export interface DashboardData {
  teamSize: number;
  teamAggregate: AlignmentBreakdown[];
  unlinkedCount: number;
  members: TeamMemberSummary[];
  assignmentSignals: AssignmentSignal;
}
```

---

## 5. Infrastructure & Deployment

### 5.1 Docker Setup

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
RUN pnpm run build

FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml** (full stack):
```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: compass
      POSTGRES_USER: compass
      POSTGRES_PASSWORD: compasslocal
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U compass"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: { context: ./backend }
    environment:
      SPRING_PROFILES_ACTIVE: local
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/compass
      SPRING_DATASOURCE_USERNAME: compass
      SPRING_DATASOURCE_PASSWORD: compasslocal
      COMPASS_SEED_ENABLED: "true"
    ports: ["8080:8080"]
    depends_on: { db: { condition: service_healthy } }

  frontend:
    build: { context: ./frontend, args: { REACT_APP_API_BASE_URL: "" } }
    ports: ["3000:80"]
    depends_on: [backend]

volumes:
  pgdata:
```

**docker-compose.dev.yml** (DB only, for native dev with hot reload):
```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: compass, POSTGRES_USER: compass, POSTGRES_PASSWORD: compasslocal }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
```

### 5.2 Railway Deployment

Single Railway project with three services:

| Service | Source | Builder |
|---|---|---|
| backend | `/backend` | Dockerfile |
| frontend | `/frontend` | Dockerfile |
| db | — | Railway Postgres plugin |

**Environment variables:**

| Variable | Local | Railway |
|---|---|---|
| `DATABASE_URL` | — | Auto-injected by Railway |
| `SPRING_PROFILES_ACTIVE` | `local` | `railway` |
| `COMPASS_SEED_ENABLED` | `true` | `false` (set `true` once for initial seed) |
| `COMPASS_CORS_ALLOWED_ORIGINS` | `localhost:*` | Frontend Railway URL |
| `REACT_APP_API_BASE_URL` | (empty, proxied) | Backend Railway URL |

**Deploy:** `railway up` or auto-deploy on push to main.

### 5.3 Local Development Workflow

```bash
# Full demo (no dev tools, just see it work)
git clone <repo> compass && cd compass
docker compose up --build
open http://localhost:3000

# Development (hot reload)
git clone <repo> compass && cd compass
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d    # Postgres only
cd backend && ./gradlew bootRun &                  # Spring Boot on :8080
cd frontend && pnpm install && pnpm dev            # Webpack dev server on :3001
open http://localhost:3001
```

Webpack dev server proxies `/api/*` to `localhost:8080` via `devServer.proxy` config. Backend Spring DevTools provides auto-restart on class changes.

### 5.4 Seed Data

Demo dataset: **Meridian Manufacturing** — a fictional mid-size manufacturer (matches PE turnaround context).

| Aspect | Detail |
|---|---|
| Users | 9 (1 executive, 1 director, 2 managers, 4 employees, 1 analyst) |
| Org depth | 4 levels |
| Rally Cries | 2 (Operational Excellence, Digital Transformation) |
| Defining Objectives | 4 |
| Outcomes | 5+ |
| Commitments | 3 weeks: Week 1 reconciled, Week 2 locked, Week 3 draft |
| Mix | Strategic + operational categories, range of completion horizons, some manager-assigned |

Loaded by `DataInitializer` (Spring `ApplicationRunner`) on first boot when `compass.seed.enabled=true`. Idempotent — checks if data exists before inserting.

### 5.5 CI Pipeline Shape

```yaml
# .github/workflows/ci.yml
jobs:
  backend:
    # Java 21 + Postgres service container
    # ./gradlew check (compile + unit + integration tests)
    # ~90s

  frontend:
    # Node 20 + pnpm
    # pnpm lint && pnpm typecheck && pnpm test
    # ~45s
```

Both jobs run in parallel. Target: under 2 minutes total.
