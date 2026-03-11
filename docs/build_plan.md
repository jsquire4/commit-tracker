# ST6 Weekly Commit Module — Build Plan: Phases 1 & 2

## PHASE 1: Foundation & Scaffolding

Everything needed before a single line of business logic is written. After this phase: backend starts, frontend builds, docker compose runs the full stack, health check responds, Flyway runs all migrations against a real Postgres.

---

### 1.1 Backend: Gradle Project Initialization

**Step 1: Generate Spring Boot project skeleton**

From the repo root `/Users/js/dev/st6`:

```bash
mkdir -p backend
cd backend
```

Use Spring Initializr CLI (or manually create files). The generated wrapper is critical — do not skip it.

```bash
# Generate Gradle wrapper (8.5+)
gradle wrapper --gradle-version 8.5
```

This creates:
- `backend/gradlew`
- `backend/gradlew.bat`
- `backend/gradle/wrapper/gradle-wrapper.jar`
- `backend/gradle/wrapper/gradle-wrapper.properties`

**Step 2: `backend/settings.gradle.kts`**

```kotlin
rootProject.name = "commit-tracker"
```

**Step 3: `backend/build.gradle.kts`**

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.2.5"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.st6"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Database
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // Logging
    implementation("net.logstash.logback:logstash-logback-encoder:7.4")

    // JWT
    implementation("com.nimbusds:nimbus-jose-jwt:9.37.3")

    // CSV
    implementation("com.opencsv:opencsv:5.9")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:postgresql:1.19.7")
    testImplementation("org.testcontainers:junit-jupiter:1.19.7")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

**Step 4: Create package directory structure**

Every directory under `backend/src/main/java/com/st6/committracker/`:

```
backend/src/main/java/com/st6/committracker/
backend/src/main/java/com/st6/committracker/config/
backend/src/main/java/com/st6/committracker/domain/commit/
backend/src/main/java/com/st6/committracker/domain/cycle/
backend/src/main/java/com/st6/committracker/domain/reconciliation/
backend/src/main/java/com/st6/committracker/domain/rcdo/
backend/src/main/java/com/st6/committracker/domain/dashboard/
backend/src/main/java/com/st6/committracker/domain/user/
backend/src/main/java/com/st6/committracker/domain/importexport/
backend/src/main/java/com/st6/committracker/audit/
backend/src/main/java/com/st6/committracker/security/
backend/src/main/java/com/st6/committracker/shared/
```

Test directories:

```
backend/src/test/java/com/st6/committracker/domain/
backend/src/test/java/com/st6/committracker/integration/
backend/src/test/java/com/st6/committracker/support/
backend/src/test/resources/
```

Resources directories:

```
backend/src/main/resources/
backend/src/main/resources/db/migration/
backend/src/main/resources/seed/
```

---

### 1.2 Backend: Application Configuration Files

**File: `backend/src/main/resources/application.yml`**

```yaml
spring:
  application:
    name: commit-tracker
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        jdbc:
          time_zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false
    deserialization:
      fail-on-unknown-properties: false

server:
  port: 8080
  servlet:
    context-path: /

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when_authorized

st6:
  seed:
    enabled: false
  cors:
    allowed-origins: ""
  jwt:
    issuer: ""
    public-key: ""

logging:
  level:
    com.st6.committracker: DEBUG
    org.hibernate.SQL: WARN
```

**File: `backend/src/main/resources/application-local.yml`**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/st6
    username: st6
    password: st6local
    hikari:
      maximum-pool-size: 5
  jpa:
    show-sql: true

st6:
  seed:
    enabled: true
  cors:
    allowed-origins: "http://localhost:3000,http://localhost:3001"
  jwt:
    # Dev bypass is profile-gated via @Profile("local") on DevTokenValidator,
    # NOT a boolean flag. No dev-mode property needed.

logging:
  level:
    com.st6.committracker: DEBUG
    org.hibernate.SQL: DEBUG
```

**File: `backend/src/main/resources/application-railway.yml`**

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    hikari:
      maximum-pool-size: 10

st6:
  seed:
    enabled: ${ST6_SEED_ENABLED:false}
  cors:
    allowed-origins: ${ST6_CORS_ALLOWED_ORIGINS:}
  jwt:
    issuer: ${ST6_JWT_ISSUER:}
    public-key: ${ST6_JWT_PUBLIC_KEY:}

logging:
  level:
    com.st6.committracker: INFO
    org.hibernate.SQL: WARN
```

**File: `backend/src/main/resources/application-test.yml`**

```yaml
spring:
  datasource:
    # Overridden by Testcontainers dynamically
    url: jdbc:tc:postgresql:16-alpine:///st6_test
  jpa:
    show-sql: false
  flyway:
    clean-disabled: false

st6:
  seed:
    enabled: false

logging:
  level:
    com.st6.committracker: WARN
    org.hibernate.SQL: WARN
```

**File: `backend/src/main/resources/logback-spring.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <springProfile name="local">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="!local">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdc>true</includeMdc>
                <includeCallerData>false</includeCallerData>
                <fieldNames>
                    <timestamp>timestamp</timestamp>
                    <version>[ignore]</version>
                </fieldNames>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>
</configuration>
```

---

### 1.3 Backend: Foundation Java Classes

**File: `backend/src/main/java/com/st6/committracker/CommitTrackerApplication.java`**
- Package: `com.st6.committracker`
- Standard `@SpringBootApplication` class with `public static void main(String[] args)` calling `SpringApplication.run()`

**File: `backend/src/main/java/com/st6/committracker/shared/ApiResponse.java`**
- Package: `com.st6.committracker.shared`
- Simple generic wrapper. Returns `data` directly — no envelope metadata.
- The `requestId` is set as a **response header** (`X-Request-Id`), NOT embedded in the body.

```java
public record ApiResponse<T>(T data) {
    public static <T> ApiResponse<T> of(T data) { return new ApiResponse<>(data); }
}
```

Spring's built-in `ProblemDetail` (RFC 7807) is used for all error responses — no custom error envelope needed. The `GlobalExceptionHandler` returns `ProblemDetail` instances which Spring serializes automatically.

**File: `backend/src/main/java/com/st6/committracker/shared/PagedResponse.java`**
- Package: `com.st6.committracker.shared`

```java
public record PagedResponse<T>(
    List<T> items,
    int page,
    int size,
    long totalElements,
    int totalPages
) {}
```

**File: `backend/src/main/java/com/st6/committracker/shared/GlobalExceptionHandler.java`**
- Package: `com.st6.committracker.shared`
- `@RestControllerAdvice`
- Returns Spring's `ProblemDetail` (RFC 7807) for all errors — no custom error envelope.
- Handlers for:
  - `MethodArgumentNotValidException` -> 400 with field-level errors in `ProblemDetail.properties`
  - `ConstraintViolationException` -> 400
  - `EntityNotFoundException` (custom) -> 404
  - `IllegalStateException` -> 409 Conflict (used for state machine violations)
  - `AccessDeniedException` -> 403
  - `Exception` (catch-all) -> 500 with logged stack trace
- Every handler logs the error with MDC context

**File: `backend/src/main/java/com/st6/committracker/logging/RequestLoggingFilter.java`**
- Package: `com.st6.committracker.logging`
- Extends `OncePerRequestFilter`
- On every request:
  1. Generate `requestId` (UUID)
  2. Set MDC fields: `requestId`, `method`, `path`
  3. **Set `X-Request-Id` response header** (this is how requestId reaches the client — NOT in the response body)
  4. Extract `userId` and `orgId` from security context (if authenticated) and set in MDC
  5. Record start time
  6. Call `filterChain.doFilter()`
  7. On completion: log at INFO: method, path, status code, duration in ms, userId, orgId, requestId, response body size
  8. Clear MDC

**File: `backend/src/main/java/com/st6/committracker/config/CorsConfig.java`**
- Package: `com.st6.committracker.config`
- `@Configuration`
- Reads `st6.cors.allowed-origins` from properties (comma-separated)
- Registers `WebMvcConfigurer` bean with `addCorsMappings` for `/api/**`:
  - Allowed methods: GET, POST, PUT, DELETE, OPTIONS
  - Allowed headers: Authorization, Content-Type, X-Request-ID
  - Exposed headers: X-Request-Id (so frontend can read requestId from response headers)
  - Allow credentials: false (purely token-based API — no cookies)
  - Max age: 3600

**File: `backend/src/main/java/com/st6/committracker/config/JacksonConfig.java`**
- Package: `com.st6.committracker.config`
- `@Configuration`
- Registers `Jackson2ObjectMapperBuilderCustomizer` bean:
  - `JavaTimeModule` registered
  - Serialization: `WRITE_DATES_AS_TIMESTAMPS` disabled
  - Deserialization: `FAIL_ON_UNKNOWN_PROPERTIES` disabled
  - Default property inclusion: `NON_NULL`

**File: `backend/src/main/java/com/st6/committracker/config/SecurityConfig.java`**
- Package: `com.st6.committracker.config`
- `@Configuration`, `@EnableWebSecurity`
- Phase 1 stub: permits all requests (security will be fully wired in a later phase)
- `SecurityFilterChain` bean:
  - `csrf().disable()` (API-only, token-based)
  - `sessionManagement().sessionCreationPolicy(STATELESS)`
  - `authorizeHttpRequests` -> permit all for now
  - CORS enabled with the `CorsConfig`

**File: `backend/src/main/java/com/st6/committracker/config/AuditConfig.java`**
- Package: `com.st6.committracker.config`
- `@Configuration`, `@EnableJpaAuditing`
- Enables `@CreatedDate` / `@LastModifiedDate` annotations

**Health check controller: `backend/src/main/java/com/st6/committracker/config/HealthController.java`**
- Package: `com.st6.committracker.config`
- `@RestController`
- `GET /api/health` -> returns `ApiResponse.of(Map.of("status", "UP", "version", "0.0.1-SNAPSHOT"))`

---

### 1.4 Backend: Flyway Migrations

All files under `backend/src/main/resources/db/migration/`.

**`V001__create_extensions.sql`**

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- NOTE: We use VARCHAR columns with CHECK constraints instead of Postgres ENUM types.
-- Reason: Postgres ENUMs cannot have values removed and adding values cannot be
-- rolled back inside a transaction (before PG 12). VARCHAR + CHECK is equally safe
-- at the DB level, simpler to evolve, and avoids Hibernate NAMED_ENUM mapping issues.
```

**`V002__create_orgs.sql`**

```sql
CREATE TABLE orgs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    timezone        TEXT NOT NULL DEFAULT 'UTC',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`V003__create_users.sql`**

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    external_id     TEXT,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'
                    CHECK (role IN ('EMPLOYEE', 'MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE', 'ANALYST')),
    reports_to      UUID REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, email)
);
```

**`V004__create_rcdo.sql`**

```sql
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
```

**`V005__create_chess_categories.sql`**

```sql
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
```

**`V006__create_cycles.sql`**

Cycles are **org-wide**, not per-user. One cycle per org per week. All users in the org share the same cycle and its lifecycle state. This dramatically simplifies the state machine, dashboard aggregation, carry-forward logic, and manager visibility.

```sql
CREATE TABLE cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    label           TEXT NOT NULL,
    state           VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (state IN ('DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED')),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cycle_date_order CHECK (ends_at > starts_at),
    UNIQUE (org_id, starts_at)
);
```

**`V007__create_commitments.sql`**

```sql
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
    completion_horizon  VARCHAR(20) NOT NULL DEFAULT 'EOW'
                        CHECK (completion_horizon IN ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW')),
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
```

**`V008__create_task_bullets.sql`**

```sql
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
```

**`V009__create_reconciliation.sql`**

```sql
CREATE TABLE reconciliation_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    commitment_id   UUID NOT NULL REFERENCES commitments(id),
    cycle_id        UUID NOT NULL REFERENCES cycles(id),
    status          VARCHAR(30) NOT NULL
                    CHECK (status IN ('COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_STARTED', 'CARRIED_FORWARD')),
    notes           TEXT,
    planned_horizon VARCHAR(20)
                    CHECK (planned_horizon IS NULL OR planned_horizon IN ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW')),
    reconciled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    reconciled_by   UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (commitment_id, cycle_id)
);
```

**`V010__create_analyst_scopes.sql`** (formerly V011)

```sql
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
```

**`V011__create_audit_entries.sql`** (formerly V012)

```sql
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

CREATE INDEX idx_audit_entries_org ON audit_entries(org_id, created_at DESC);
CREATE INDEX idx_audit_entries_entity ON audit_entries(entity_type, entity_id);
CREATE INDEX idx_audit_entries_actor ON audit_entries(actor_id);
```

Note: `audit_entries` is an append-only table. No `updated_at`, no updates, no deletes. The `details` column uses JSONB to store arbitrary context (changed fields, previous values, metadata) without schema rigidity. **State transitions are logged here** with `entity_type = 'CYCLE'`, `action = 'STATE_TRANSITION'`, and `details` containing `{ "from": "DRAFT", "to": "LOCKED", "reason": "..." }`. No separate `commitment_state_transitions` table is needed.

**`V012__create_indexes.sql`** (renumbered)

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
CREATE UNIQUE INDEX idx_cycles_org_active ON cycles(org_id) WHERE is_active = TRUE;
CREATE INDEX idx_cycles_org_dates ON cycles(org_id, starts_at, ends_at);

-- COMMITMENTS
CREATE INDEX idx_commitments_user_cycle ON commitments(user_id, cycle_id);
CREATE INDEX idx_commitments_org_cycle ON commitments(org_id, cycle_id);
CREATE INDEX idx_commitments_rally_cry ON commitments(rally_cry_id) WHERE rally_cry_id IS NOT NULL;
CREATE INDEX idx_commitments_defining_objective ON commitments(defining_objective_id) WHERE defining_objective_id IS NOT NULL;
CREATE INDEX idx_commitments_outcome ON commitments(outcome_id) WHERE outcome_id IS NOT NULL;
CREATE INDEX idx_commitments_org_cycle_chess ON commitments(org_id, cycle_id, chess_category_id);
CREATE INDEX idx_commitments_assigned_by ON commitments(assigned_by, cycle_id) WHERE assigned_by IS NOT NULL;
CREATE INDEX idx_commitments_carried_from ON commitments(carried_from_id) WHERE carried_from_id IS NOT NULL;
-- TASK BULLETS
CREATE INDEX idx_task_bullets_commitment ON task_bullets(commitment_id, sort_order);

-- RECONCILIATION RECORDS
CREATE INDEX idx_reconciliation_commitment ON reconciliation_records(commitment_id);
CREATE INDEX idx_reconciliation_org_cycle ON reconciliation_records(org_id, cycle_id);
CREATE INDEX idx_reconciliation_status ON reconciliation_records(org_id, cycle_id, status);

-- ANALYST SCOPES
CREATE INDEX idx_analyst_scopes_analyst ON analyst_scopes(analyst_user_id);
```

**`V013__create_updated_at_trigger.sql`** (renumbered)

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON orgs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rally_cries_updated_at BEFORE UPDATE ON rally_cries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_defining_objectives_updated_at BEFORE UPDATE ON defining_objectives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_outcomes_updated_at BEFORE UPDATE ON outcomes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chess_categories_updated_at BEFORE UPDATE ON chess_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_commitments_updated_at BEFORE UPDATE ON commitments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_bullets_updated_at BEFORE UPDATE ON task_bullets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Note: Default chess categories (Strategic, Operational, Defensive, Capability Building) are org-scoped, so they are inserted per-org at runtime by the `DataInitializer`, not in a migration. Migration numbering ends at V013.

---

### 1.5 Frontend: Project Initialization

**Step 1: Create frontend directory and initialize with Vite**

```bash
pnpm create vite frontend --template react-ts
cd frontend
```

**Step 2: `frontend/package.json`**

Vite handles TypeScript, JSX, CSS, HMR, and dev server with zero config — no loaders, plugins, or build pipeline to configure.

```json
{
  "name": "@st6/commit-module",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3",
    "@tanstack/react-query": "^5.28.6",
    "zustand": "^4.5.2",
    "axios": "^1.6.8",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "recharts": "^2.12.3",
    "react-hook-form": "^7.51.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",
    "@headlessui/react": "^1.7.19"
  },
  "devDependencies": {
    "typescript": "^5.4.3",
    "@types/react": "^18.2.73",
    "@types/react-dom": "^18.2.23",
    "@types/node": "^20.11.30",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^3.4.3",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^7.4.0",
    "@typescript-eslint/eslint-plugin": "^7.4.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.0",
    "vitest": "^1.4.0",
    "@testing-library/react": "^14.2.2",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^24.0.0",
    "msw": "^2.2.13"
  }
}
```

**Step 3: `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: `frontend/vite.config.ts`**

Vite replaces the entire Webpack + ts-loader + css-loader + postcss-loader + style-loader + MiniCssExtractPlugin + HtmlWebpackPlugin + ModuleFederationPlugin stack with ~20 lines of config.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

**Note on Module Federation:** Module Federation has been **deferred**, not built in this phase. The requirements specify "runs as a remote module inside the existing PA host app" and "follows the PM (module federation) remote pattern." However, Module Federation adds significant build complexity, subtle async boundary bugs, and confusing error surfaces that would slow initial development. Instead, the `App` component accepts `basename` and `authContext` props as the integration surface. When host-app integration is needed, the module can be exported via a thin `bootstrap.tsx` wrapper and consumed as a script-tag embed or npm package — adding Module Federation at that point is additive, not a rewrite.

**Step 5: `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        strategic: '#2563EB',
        operational: '#6B7280',
        defensive: '#DC2626',
        capability: '#059669',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Step 6: `frontend/postcss.config.js`**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 7: `frontend/.eslintrc.cjs`**

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off',
  },
  settings: {
    react: { version: 'detect' },
  },
  ignorePatterns: ['dist/', 'node_modules/', 'vite.config.ts'],
};
```

**Note:** Test configuration is in `vite.config.ts` under the `test` key (Vitest). No separate jest.config is needed — Vitest uses the same Vite transform pipeline, path aliases, and TypeScript config automatically.

**Step 8: Frontend directory structure**

```
frontend/src/
frontend/src/api/
frontend/src/types/
frontend/src/hooks/
frontend/src/stores/
frontend/src/features/commit-entry/
frontend/src/features/weekly-lifecycle/
frontend/src/features/reconciliation/
frontend/src/features/manager-dashboard/
frontend/src/features/chessboard/
frontend/src/components/
frontend/src/lib/
frontend/src/test/
frontend/src/styles/
```

**Step 9: Frontend entry point files**

**`frontend/index.html`** (Vite entry — lives at project root, not src/)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ST6 Commit Module</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**`frontend/src/main.tsx`** (Standard React entry point)

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App basename="/" authContext={{ token: 'dev-token', userId: 'dev-user', orgId: 'dev-org' }} />
    </React.StrictMode>
  );
}
```

**`frontend/src/App.tsx`**

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';

interface AuthContext {
  token: string;
  userId: string;
  orgId: string;
}

interface AppProps {
  basename: string;
  authContext: AuthContext;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export default function App({ basename, authContext }: AppProps) {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <QueryClientProvider client={queryClient}>
          <Layout>
            <Routes>
              <Route path="/" element={<div className="p-4">Commit Entry — coming soon</div>} />
              <Route path="/cycle" element={<div className="p-4">Weekly Lifecycle — coming soon</div>} />
              <Route path="/reconciliation" element={<div className="p-4">Reconciliation — coming soon</div>} />
              <Route path="/dashboard" element={<div className="p-4">Manager Dashboard — coming soon</div>} />
              <Route path="/chessboard" element={<div className="p-4">Chessboard — coming soon</div>} />
            </Routes>
          </Layout>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

**`frontend/src/styles/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`frontend/src/components/ErrorBoundary.tsx`**

```typescript
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ST6 Commit Module error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Something went wrong</h2>
          <p className="mt-2 text-gray-600">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**`frontend/src/components/Layout.tsx`**

```typescript
import React, { type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Weekly Commitments</h1>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

**`frontend/src/api/client.ts`** (Axios instance with auth interceptor stub)

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor — will be wired to host app's auth context
let getToken: (() => string) | null = null;

export function setTokenProvider(provider: () => string): void {
  getToken = provider;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn('ST6: Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**`frontend/src/types/api.types.ts`**

The backend returns `{ data: T }` for success and RFC 7807 `ProblemDetail` for errors.
The `requestId` is read from the `X-Request-Id` response header, not the body.

```typescript
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** RFC 7807 Problem Detail — returned by backend for all errors */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  properties?: Record<string, unknown>;
}
```

**`frontend/src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

---

### 1.6 Infrastructure Files

**`/Users/js/dev/st6/docker-compose.yml`** (full stack)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: st6
      POSTGRES_USER: st6
      POSTGRES_PASSWORD: st6local
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: local
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/st6
      SPRING_DATASOURCE_USERNAME: st6
      SPRING_DATASOURCE_PASSWORD: st6local
    ports:
      - "8080:8080"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

**`/Users/js/dev/st6/docker-compose.dev.yml`** (DB only for local dev)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: st6
      POSTGRES_USER: st6
      POSTGRES_PASSWORD: st6local
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**`/Users/js/dev/st6/.env.example`**

```
# Database
POSTGRES_DB=st6
POSTGRES_USER=st6
POSTGRES_PASSWORD=st6local

# Backend
SPRING_PROFILES_ACTIVE=local
ST6_SEED_ENABLED=true
ST6_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Frontend (Vite requires VITE_ prefix for client-exposed env vars)
VITE_API_BASE_URL=
```

**`backend/Dockerfile`**

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradle gradle
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon
COPY src src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**`frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**`.gitignore` updates** — the existing `.gitignore` needs additions:

```
# Java / Gradle
.gradle/
backend/build/
backend/.gradle/
*.class
*.jar
!gradle/wrapper/gradle-wrapper.jar

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.pnpm-store/

# Docker
pgdata/

# Test
backend/bin/
```

Note: The existing `.gitignore` already covers `node_modules/`, `dist/`, `build/`, `.env` etc. The additions are for Java/Gradle specifics and the gradle wrapper jar exception. Vite does not generate any additional files that need ignoring beyond `dist/`.

---

### 1.7 Phase 1 Verification Checklist

After all files are created, run these commands to verify:

```bash
# 1. Start Postgres
docker compose -f docker-compose.dev.yml up -d

# 2. Backend compiles and starts
cd backend && ./gradlew bootRun --args='--spring.profiles.active=local'
# Verify: "Started CommitTrackerApplication" in logs
# Verify: Flyway runs V001 through V013 successfully

# 3. Health check responds
curl http://localhost:8080/api/health
# Expect: {"data":{"status":"UP","version":"0.0.1-SNAPSHOT"}}

# 4. Frontend installs and builds
cd frontend && pnpm install && pnpm build
# Verify: dist/ directory created with index.html and hashed JS/CSS assets

# 5. Frontend dev server starts
pnpm dev
# Verify: http://localhost:3001 loads, shows "Weekly Commitments" nav + placeholder routes

# 6. Full stack docker compose
docker compose up --build
# Verify: http://localhost:3000 loads (nginx serving frontend)
# Verify: http://localhost:3000/api/health proxied to backend
```

---

## PHASE 2: JPA Entities & Repository Layer (TDD)

TDD order: write test classes first, watch them fail, then implement entities and repositories to make them pass.

---

### 2.1 Test Infrastructure (write FIRST)

**File: `backend/src/test/java/com/st6/committracker/support/AbstractRepositoryTest.java`**

```java
package com.st6.committracker.support;

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public abstract class AbstractRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("st6_test")
            .withUsername("st6_test")
            .withPassword("st6_test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

**File: `backend/src/test/java/com/st6/committracker/support/TestDataFactory.java`**

**Two separate test data classes** to avoid mode confusion:
- `TestFixtures` — static factory methods returning detached (unpersisted) entities. Used in unit tests and `@DataJpaTest` slice tests where the test itself calls `repository.save()`.
- `PersistingTestData` — wraps `TestFixtures` methods and auto-persists via `EntityManager`. Used in `@SpringBootTest` integration tests. Registered as a Spring bean via `TestDataConfig`.

```java
package com.st6.committracker.support;

/**
 * Static factory for detached entities. Used in unit tests and @DataJpaTest.
 * Caller is responsible for persisting.
 */
public final class TestFixtures {
    private TestFixtures() {}

    public static Org createOrg(String name, String slug);
    public static Org createOrg(); // defaults: "Test Org", "test-org"
    public static AppUser createUser(Org org, String email, String displayName, UserRole role, AppUser reportsTo);
    public static AppUser createEmployee(Org org, String email, AppUser manager);
    public static AppUser createManager(Org org, String email, AppUser reportsTo);
    public static AppUser createDirector(Org org, String email, AppUser reportsTo);
    public static AppUser createExecutive(Org org, String email);
    public static AppUser createAnalyst(Org org, String email);
    public static RallyCry createRallyCry(Org org, String title);
    public static DefiningObjective createDefiningObjective(Org org, RallyCry rc, String title, AppUser owner);
    public static Outcome createOutcome(Org org, DefiningObjective dobj, String title, AppUser owner);
    public static ChessCategory createChessCategory(Org org, String name, String colorHex);
    public static List<ChessCategory> createDefaultChessCategories(Org org);
    public static Cycle createCycle(Org org, String label, Instant startsAt, Instant endsAt, boolean isActive);
    public static Cycle createDraftCycle(Org org);
    public static Cycle createLockedCycle(Org org);
    public static Cycle createReconcilingCycle(Org org);
    public static Commitment createCommitment(Org org, AppUser user, Cycle cycle, String title);
    public static Commitment createCommitmentWithBullets(AppUser user, Cycle cycle, String title, ChessCategory cat, List<String> bullets);
    public static TaskBullet createTaskBullet(Org org, Commitment commitment, String body, int sortOrder);
    public static ReconciliationRecord createReconciliationRecord(Commitment commitment, Cycle cycle, ReconciliationStatus status, AppUser reconciledBy);
    public static AnalystScope createAnalystScope(AppUser analyst, RallyCry rallyCry);
    public static AnalystScope createAnalystScope(AppUser analyst, AppUser orgUnitRoot);

    /** Create a full org hierarchy: executive -> director -> 2 managers -> 2 employees each + analyst. */
    public static OrgHierarchy createStandardHierarchy();

    public record OrgHierarchy(
        Org org, AppUser executive, AppUser director,
        AppUser managerA, AppUser managerB,
        AppUser employeeA1, AppUser employeeA2,
        AppUser employeeB1, AppUser employeeB2,
        AppUser analyst
    ) {}

    /** Create standard RCDO tree. */
    public static RcdoTree createStandardRcdoTree(Org org, AppUser dobjOwner);

    public record RcdoTree(
        RallyCry rallyCry1, RallyCry rallyCry2,
        DefiningObjective do1, DefiningObjective do2, DefiningObjective do3,
        Outcome outcome1, Outcome outcome2, Outcome outcome3
    ) {}
}
```

**File: `backend/src/test/java/com/st6/committracker/support/PersistingTestData.java`**

For integration tests — wraps `TestFixtures` and auto-persists. Registered as a Spring bean.

```java
package com.st6.committracker.support;

/**
 * Auto-persisting test data for @SpringBootTest integration tests.
 * Every create method calls em.persist() + em.flush() before returning.
 * Delegates entity construction to TestFixtures.
 */
public class PersistingTestData {

    private final EntityManager em;

    public PersistingTestData(EntityManager em) { this.em = em; }

    private <T> T persist(T entity) {
        em.persist(entity);
        em.flush();
        return entity;
    }

    public Org createOrg() { return persist(TestFixtures.createOrg()); }
    public Org createOrg(String name, String slug) { return persist(TestFixtures.createOrg(name, slug)); }
    public AppUser createEmployee(Org org, String email, AppUser manager) { return persist(TestFixtures.createEmployee(org, email, manager)); }
    // ... same pattern for all other factory methods
    public TestFixtures.OrgHierarchy createStandardHierarchy() {
        var h = TestFixtures.createStandardHierarchy();
        // persist each entity in dependency order
        persist(h.org()); persist(h.executive()); persist(h.director());
        persist(h.managerA()); persist(h.managerB());
        persist(h.employeeA1()); persist(h.employeeA2());
        persist(h.employeeB1()); persist(h.employeeB2());
        persist(h.analyst());
        return h;
    }
}
```

```java
@TestConfiguration
public class TestDataConfig {
    @Bean
    public PersistingTestData persistingTestData(EntityManager em) {
        return new PersistingTestData(em);
    }
}
```

---

### 2.2 Java Enum Types

All enums in package `com.st6.committracker.domain`.

**File: `backend/src/main/java/com/st6/committracker/domain/CycleState.java`**

Lifecycle state for cycles. Commitments do NOT have their own state — they derive it from `commitment.cycle.state`. Named `CycleState` (not `CommitmentState`) to reflect this.

```java
package com.st6.committracker.domain;

public enum CycleState {
    DRAFT, LOCKED, RECONCILING, RECONCILED;

    public Set<CycleState> validTransitions() {
        return switch (this) {
            case DRAFT -> Set.of(LOCKED);
            case LOCKED -> Set.of(RECONCILING);
            case RECONCILING -> Set.of(RECONCILED);
            case RECONCILED -> Set.of();
        };
    }
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/CompletionHorizon.java`**

```java
package com.st6.committracker.domain;

public enum CompletionHorizon {
    MORNING, MIDDAY, AFTERNOON, EOD, EOW
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/ReconciliationStatus.java`**

```java
package com.st6.committracker.domain;

public enum ReconciliationStatus {
    COMPLETED, PARTIALLY_COMPLETED, NOT_STARTED, CARRIED_FORWARD
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/UserRole.java`**

```java
package com.st6.committracker.domain;

public enum UserRole {
    EMPLOYEE, MANAGER, DIRECTOR, VP, EXECUTIVE, ANALYST
}
```

---

### 2.3 JPA Entity: `Org`

**File: `backend/src/main/java/com/st6/committracker/domain/user/Org.java`**

Package: `com.st6.committracker.domain.user`

Fields and annotations:

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `name` | `String` | `@Column(nullable = false)` |
| `slug` | `String` | `@Column(nullable = false, unique = true)` |
| `timezone` | `String` | `@Column(nullable = false)`, default `"UTC"` |
| `isActive` | `boolean` | `@Column(name = "is_active", nullable = false)`, default `true` |
| `createdAt` | `Instant` | `@Column(name = "created_at", nullable = false, updatable = false)`, `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@Column(name = "updated_at", nullable = false)`, `@UpdateTimestamp` |

Table annotation: `@Table(name = "orgs")`

- No-arg constructor (JPA requirement, `protected`).
- All-args constructor or builder pattern. Use Lombok `@Builder`, `@Getter`, `@Setter`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)`, `@AllArgsConstructor` if adding Lombok. If avoiding Lombok: manual getters/setters, builder.
- **Decision: avoid Lombok** to keep the build simple. Manual getters/setters, static `builder()` method or telescoping constructor.
- `equals`/`hashCode`: based on `id` only (UUID). Use `Objects.equals` on `id` in both methods. `hashCode` returns constant (or `Objects.hash(id)`) — safe for detached entities.
- `toString`: include `id`, `name`, `slug`. Do NOT include relationships to avoid lazy-load triggers.

---

### 2.4 JPA Entity: `AppUser`

**File: `backend/src/main/java/com/st6/committracker/domain/user/AppUser.java`**

Package: `com.st6.committracker.domain.user`

Table annotation: `@Table(name = "users")` (the Java class is `AppUser` to avoid Postgres reserved word conflicts, but the table name is `users`).

Fields and annotations:

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = FetchType.LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `externalId` | `String` | `@Column(name = "external_id")` — nullable |
| `email` | `String` | `@Column(nullable = false)` |
| `displayName` | `String` | `@Column(name = "display_name", nullable = false)` |
| `role` | `UserRole` | `@Enumerated(EnumType.STRING)`, `@Column(nullable = false)` |
| `reportsTo` | `AppUser` | `@ManyToOne(fetch = FetchType.LAZY)`, `@JoinColumn(name = "reports_to")` — nullable |
| `isActive` | `boolean` | `@Column(name = "is_active", nullable = false)`, default `true` |
| `createdAt` | `Instant` | `@Column(name = "created_at", nullable = false, updatable = false)`, `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@Column(name = "updated_at", nullable = false)`, `@UpdateTimestamp` |

Unique constraint: `@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "email"}))`

Relationships:
- `@OneToMany(mappedBy = "reportsTo", fetch = FetchType.LAZY)` for `List<AppUser> directReports` — not eagerly loaded, used only in specific queries.

`equals`/`hashCode`: on `id` only.
`toString`: `id`, `email`, `displayName`, `role`. Exclude `org`, `reportsTo` (lazy proxies).

**Hibernate enum mapping:** Since we use `VARCHAR` columns with `CHECK` constraints (not Postgres ENUM types), standard `@Enumerated(EnumType.STRING)` is all that's needed. No `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` or `columnDefinition` hacks required. This applies to ALL enum-typed columns across all entities — just use `@Enumerated(EnumType.STRING)` and it works out of the box.

---

### 2.5 JPA Entity: `RallyCry`

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/RallyCry.java`**

Package: `com.st6.committracker.domain.rcdo`

Table annotation: `@Table(name = "rally_cries")`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `title` | `String` | `@Column(nullable = false)` |
| `description` | `String` | `@Column` — nullable |
| `sortOrder` | `int` | `@Column(name = "sort_order", nullable = false)`, default `0` |
| `archivedAt` | `Instant` | `@Column(name = "archived_at")` — nullable, soft-delete marker |
| `createdAt` | `Instant` | `@CreationTimestamp`, `@Column(name = "created_at", ...)` |
| `updatedAt` | `Instant` | `@UpdateTimestamp`, `@Column(name = "updated_at", ...)` |

Relationships:
- `@OneToMany(mappedBy = "rallyCry", fetch = LAZY)` for `List<DefiningObjective> definingObjectives`

Helper method: `boolean isArchived()` — returns `archivedAt != null`.

---

### 2.6 JPA Entity: `DefiningObjective`

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/DefiningObjective.java`**

Package: `com.st6.committracker.domain.rcdo`

Table annotation: `@Table(name = "defining_objectives")`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `rallyCry` | `RallyCry` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "rally_cry_id", nullable = false)` |
| `title` | `String` | `@Column(nullable = false)` |
| `description` | `String` | `@Column` — nullable |
| `owner` | `AppUser` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "owner_user_id")` — nullable |
| `sortOrder` | `int` | `@Column(name = "sort_order", nullable = false)` |
| `archivedAt` | `Instant` | `@Column(name = "archived_at")` |
| `createdAt` | `Instant` | `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@UpdateTimestamp` |

Relationships:
- `@OneToMany(mappedBy = "definingObjective", fetch = LAZY)` for `List<Outcome> outcomes`

---

### 2.7 JPA Entity: `Outcome`

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/Outcome.java`**

Package: `com.st6.committracker.domain.rcdo`

Table annotation: `@Table(name = "outcomes")`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `definingObjective` | `DefiningObjective` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "defining_objective_id", nullable = false)` |
| `title` | `String` | `@Column(nullable = false)` |
| `description` | `String` | `@Column` — nullable |
| `owner` | `AppUser` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "owner_user_id")` — nullable |
| `sortOrder` | `int` | `@Column(name = "sort_order", nullable = false)`, default `0` |
| `archivedAt` | `Instant` | `@Column(name = "archived_at")` — nullable |
| `createdAt` | `Instant` | `@CreationTimestamp`, `@Column(name = "created_at", nullable = false, updatable = false)` |
| `updatedAt` | `Instant` | `@UpdateTimestamp`, `@Column(name = "updated_at", nullable = false)` |

Helper method: `boolean isArchived()` — returns `archivedAt != null`.

---

### 2.8 JPA Entity: `ChessCategory`

**File: `backend/src/main/java/com/st6/committracker/domain/commit/ChessCategory.java`**

Package: `com.st6.committracker.domain.commit`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `name` | `String` | `@Column(nullable = false)` |
| `description` | `String` | nullable |
| `colorHex` | `String` | `@Column(name = "color_hex")` |
| `sortOrder` | `int` | `@Column(name = "sort_order", nullable = false)` |
| `isActive` | `boolean` | `@Column(name = "is_active", nullable = false)`, default `true` |
| `createdAt` | `Instant` | `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@UpdateTimestamp` |

Unique constraint: `@Table(name = "chess_categories", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "name"}))`

---

### 2.9 JPA Entity: `Cycle`

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/Cycle.java`**

Package: `com.st6.committracker.domain.cycle`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `label` | `String` | `@Column(nullable = false)` |
| `state` | `CycleState` | `@Enumerated(EnumType.STRING)`, `@Column(nullable = false)`, default `DRAFT` |
| `startsAt` | `Instant` | `@Column(name = "starts_at", nullable = false)` |
| `endsAt` | `Instant` | `@Column(name = "ends_at", nullable = false)` |
| `isActive` | `boolean` | `@Column(name = "is_active", nullable = false)`, default `false` |
| `createdAt` | `Instant` | `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@UpdateTimestamp` |

Table: `@Table(name = "cycles", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "starts_at"}))`

Relationships:
- `@OneToMany(mappedBy = "cycle", fetch = LAZY)` for `List<Commitment> commitments`

Note: the `CHECK (ends_at > starts_at)` constraint is enforced at the DB level (migration V006). Optionally add a `@PrePersist`/`@PreUpdate` validation in Java too.

**Important:** Cycles are **org-wide**, not per-user. One cycle per org per week. All users in the org share the same cycle and its lifecycle state. Commitments do NOT have their own `state` column — their lifecycle state is always derived from `commitment.cycle.state`. This eliminates the need for bulk state sync and avoids consistency bugs.

---

### 2.10 JPA Entity: `Commitment`

**File: `backend/src/main/java/com/st6/committracker/domain/commit/Commitment.java`**

Package: `com.st6.committracker.domain.commit`

Table annotation: `@Table(name = "commitments")`

This is the most complex entity.

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id")` |
| `user` | `AppUser` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "user_id")` |
| `cycle` | `Cycle` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "cycle_id")` |
| `rallyCry` | `RallyCry` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "rally_cry_id")` — nullable |
| `definingObjective` | `DefiningObjective` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "defining_objective_id")` — nullable |
| `outcome` | `Outcome` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "outcome_id")` — nullable |
| `chessCategory` | `ChessCategory` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "chess_category_id")` — nullable |
| `priorityRank` | `int` | `@Column(name = "priority_rank", nullable = false)`, default `0` |
| `title` | `String` | `@Column(nullable = false)` |
| `description` | `String` | nullable |
| `completionHorizon` | `CompletionHorizon` | `@Enumerated(EnumType.STRING)`, `@Column(name = "completion_horizon", nullable = false)` |
| `assignedBy` | `AppUser` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "assigned_by")` — nullable |
| `carriedFrom` | `Commitment` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "carried_from_id")` — nullable (self-reference) |
| `isUnplanned` | `boolean` | `@Column(name = "is_unplanned", nullable = false)`, default `false` — marks commitments added during reconciliation |
| `createdAt` | `Instant` | `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@UpdateTimestamp` |

Relationships:
- `@OneToMany(mappedBy = "commitment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = LAZY)` `@OrderBy("sortOrder ASC")` for `List<TaskBullet> taskBullets`

RCDO consistency constraint: enforced at DB level. Optionally add a `@PrePersist`/`@PreUpdate` method that validates `(outcome != null implies definingObjective != null)` and `(definingObjective != null implies rallyCry != null)`.

---

### 2.11 JPA Entity: `TaskBullet`

**File: `backend/src/main/java/com/st6/committracker/domain/commit/TaskBullet.java`**

Package: `com.st6.committracker.domain.commit`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `commitment` | `Commitment` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "commitment_id")` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id")` |
| `body` | `String` | `@Column(nullable = false)` |
| `sortOrder` | `int` | `@Column(name = "sort_order", nullable = false)` |
| `isCompleted` | `boolean` | `@Column(name = "is_completed", nullable = false)`, default `false` |
| `createdAt` | `Instant` | `@CreationTimestamp` |
| `updatedAt` | `Instant` | `@UpdateTimestamp` |

---

### 2.12 JPA Entity: `ReconciliationRecord`

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/ReconciliationRecord.java`**

Package: `com.st6.committracker.domain.reconciliation`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `commitment` | `Commitment` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "commitment_id", nullable = false)` |
| `cycle` | `Cycle` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "cycle_id", nullable = false)` |
| `status` | `ReconciliationStatus` | `@Enumerated(EnumType.STRING)`, `@Column(nullable = false)` |
| `notes` | `String` | nullable |
| `plannedHorizon` | `CompletionHorizon` | `@Enumerated(EnumType.STRING)`, `@Column(name = "planned_horizon")` — nullable |
| `reconciledAt` | `Instant` | `@Column(name = "reconciled_at", nullable = false)` |
| `reconciledBy` | `AppUser` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "reconciled_by")` |
| `createdAt` | `Instant` | `@CreationTimestamp` |

Unique constraint: `@Table(name = "reconciliation_records", uniqueConstraints = @UniqueConstraint(columnNames = {"commitment_id", "cycle_id"}))`

Note: No `updatedAt` — reconciliation records are effectively write-once (update is replace semantics).

---

### 2.13 JPA Entity: `AnalystScope`

**File: `backend/src/main/java/com/st6/committracker/security/AnalystScope.java`**

Package: `com.st6.committracker.security`

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id", nullable = false)` |
| `analyst` | `AppUser` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "analyst_user_id", nullable = false)` |
| `rallyCry` | `RallyCry` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "rally_cry_id")` — nullable |
| `orgUnitRoot` | `AppUser` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "org_unit_root_user_id")` — nullable |
| `createdAt` | `Instant` | `@CreationTimestamp` |

DB-level constraint `at_least_one_scope` ensures `rallyCry` or `orgUnitRoot` is non-null.

---

### 2.15 Repository Interfaces

All extend `JpaRepository<Entity, UUID>`.

**File: `backend/src/main/java/com/st6/committracker/domain/user/OrgRepository.java`**

```java
package com.st6.committracker.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OrgRepository extends JpaRepository<Org, UUID> {
    Optional<Org> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/user/AppUserRepository.java`**

```java
package com.st6.committracker.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByOrgIdAndEmail(UUID orgId, String email);

    List<AppUser> findByOrgIdAndIsActiveTrue(UUID orgId);

    List<AppUser> findByReportsToId(UUID managerId);

    @Query("SELECT u FROM AppUser u WHERE u.org.id = :orgId AND u.reportsTo.id = :managerId AND u.isActive = true")
    List<AppUser> findDirectReports(@Param("orgId") UUID orgId, @Param("managerId") UUID managerId);

    @Query(value = """
        WITH RECURSIVE subtree AS (
            SELECT id, org_id, email, display_name, role, reports_to, is_active
            FROM users WHERE id = :rootUserId
            UNION ALL
            SELECT u.id, u.org_id, u.email, u.display_name, u.role, u.reports_to, u.is_active
            FROM users u INNER JOIN subtree s ON u.reports_to = s.id
        )
        SELECT id FROM subtree WHERE is_active = true AND id != :rootUserId
        """, nativeQuery = true)
    List<UUID> findSubtreeUserIds(@Param("rootUserId") UUID rootUserId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/RallyCryRepository.java`**

```java
package com.st6.committracker.domain.rcdo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RallyCryRepository extends JpaRepository<RallyCry, UUID> {
    List<RallyCry> findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID orgId);
    List<RallyCry> findByOrgIdOrderBySortOrderAsc(UUID orgId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/DefiningObjectiveRepository.java`**

```java
package com.st6.committracker.domain.rcdo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DefiningObjectiveRepository extends JpaRepository<DefiningObjective, UUID> {
    List<DefiningObjective> findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID rallyCryId);
    List<DefiningObjective> findByOwnerIdAndArchivedAtIsNull(UUID ownerUserId);
    List<DefiningObjective> findByOrgIdAndArchivedAtIsNull(UUID orgId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/OutcomeRepository.java`**

```java
package com.st6.committracker.domain.rcdo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OutcomeRepository extends JpaRepository<Outcome, UUID> {
    List<Outcome> findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID definingObjectiveId);
    List<Outcome> findByOwnerIdAndArchivedAtIsNull(UUID ownerUserId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/ChessCategoryRepository.java`**

```java
package com.st6.committracker.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChessCategoryRepository extends JpaRepository<ChessCategory, UUID> {
    List<ChessCategory> findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(UUID orgId);
    Optional<ChessCategory> findByOrgIdAndName(UUID orgId, String name);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/CycleRepository.java`**

```java
package com.st6.committracker.domain.cycle;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CycleRepository extends JpaRepository<Cycle, UUID> {
    Optional<Cycle> findByOrgIdAndIsActiveTrue(UUID orgId);
    List<Cycle> findByOrgIdOrderByStartsAtDesc(UUID orgId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/CommitmentRepository.java`**

```java
package com.st6.committracker.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface CommitmentRepository extends JpaRepository<Commitment, UUID> {

    List<Commitment> findByUserIdAndCycleIdOrderByPriorityRankAsc(UUID userId, UUID cycleId);

    List<Commitment> findByOrgIdAndCycleIdOrderByPriorityRankAsc(UUID orgId, UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.rallyCry.id = :rallyCryId AND c.cycle.id = :cycleId")
    List<Commitment> findByRallyCryIdAndCycleId(@Param("rallyCryId") UUID rallyCryId, @Param("cycleId") UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.definingObjective.id = :doId AND c.cycle.id = :cycleId")
    List<Commitment> findByDefiningObjectiveIdAndCycleId(@Param("doId") UUID doId, @Param("cycleId") UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.outcome.id = :outcomeId AND c.cycle.id = :cycleId")
    List<Commitment> findByOutcomeIdAndCycleId(@Param("outcomeId") UUID outcomeId, @Param("cycleId") UUID cycleId);

    long countByOrgIdAndCycleIdAndChessCategoryId(UUID orgId, UUID cycleId, UUID chessCategoryId);

    List<Commitment> findByAssignedByIdAndCycleId(UUID assignedById, UUID cycleId);

    long countByUserIdAndCycleId(UUID userId, UUID cycleId);

    List<Commitment> findByCarriedFromId(UUID carriedFromId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/TaskBulletRepository.java`**

```java
package com.st6.committracker.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TaskBulletRepository extends JpaRepository<TaskBullet, UUID> {
    List<TaskBullet> findByCommitmentIdOrderBySortOrderAsc(UUID commitmentId);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/ReconciliationRecordRepository.java`**

```java
package com.st6.committracker.domain.reconciliation;

import com.st6.committracker.domain.ReconciliationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReconciliationRecordRepository extends JpaRepository<ReconciliationRecord, UUID> {
    Optional<ReconciliationRecord> findByCommitmentIdAndCycleId(UUID commitmentId, UUID cycleId);
    List<ReconciliationRecord> findByOrgIdAndCycleId(UUID orgId, UUID cycleId);
    long countByOrgIdAndCycleIdAndStatus(UUID orgId, UUID cycleId, ReconciliationStatus status);
}
```

**File: `backend/src/main/java/com/st6/committracker/security/AnalystScopeRepository.java`**

```java
package com.st6.committracker.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AnalystScopeRepository extends JpaRepository<AnalystScope, UUID> {
    List<AnalystScope> findByAnalystId(UUID analystUserId);
}
```

---

### 2.16 Repository Tests (TDD — write test + entity in pairs)

All test classes extend `AbstractRepositoryTest`.

**Note on TDD ordering:** The original plan called for writing ALL 12 test files before implementing any entities. This is impractical — test files import entity classes that don't exist yet, so they won't compile (not just RED — broken). Instead, work in **test + entity pairs**: write `OrgRepositoryTest`, then implement `Org` entity + `OrgRepository` to make it GREEN, then move to the next pair. This still follows TDD (test-first per entity) without creating a pile of uncompilable files.

**File: `backend/src/test/java/com/st6/committracker/domain/OrgRepositoryTest.java`**

Test cases:
1. `shouldSaveAndFindOrgById` — persist Org, find by ID, assert all fields match
2. `shouldFindOrgBySlug` — persist Org with slug "meridian", find by slug, assert found
3. `shouldRejectDuplicateSlug` — persist two Orgs with same slug, assert `DataIntegrityViolationException`
4. `shouldUpdateOrgName` — persist, update name, flush, reload, assert new name
5. `shouldDefaultTimezone` — persist Org without setting timezone, assert timezone is "UTC"

**File: `backend/src/test/java/com/st6/committracker/domain/UserRepositoryTest.java`**

Test cases:
1. `shouldSaveAndFindUserById` — persist with all required fields
2. `shouldFindByOrgIdAndEmail` — persist user, query by org+email
3. `shouldEnforceUniqueOrgEmail` — two users same org+email throws `DataIntegrityViolationException`
4. `shouldAllowSameEmailDifferentOrgs` — two users same email, different orgs succeeds
5. `shouldFindActiveUsersByOrg` — persist 2 active + 1 inactive, assert only active returned
6. `shouldFindDirectReports` — persist manager + 2 reports, verify `findDirectReports` returns both
7. `shouldFindSubtreeUserIds` — persist 3-level hierarchy (exec -> manager -> 2 employees), verify subtree from exec includes all 3 below
8. `shouldAllowNullReportsTo` — persist user without reportsTo (top-level exec)
9. `shouldPersistAllUserRoles` — persist one user per `UserRole` enum value, verify all persist correctly
10. `shouldSelfReferenceReportsTo` — verify `reports_to` FK to same table works

**File: `backend/src/test/java/com/st6/committracker/domain/RallyCryRepositoryTest.java`**

Test cases:
1. `shouldSaveAndFindRallyCry` — basic CRUD
2. `shouldFindActiveByOrg` — persist 2 active + 1 archived, `findByOrgIdAndArchivedAtIsNull` returns only 2
3. `shouldOrderBySortOrder` — persist 3 with sort_order 2,0,1, assert returned in order 0,1,2
4. `shouldSoftDeleteBySettingArchivedAt` — set archivedAt, verify excluded from active query

**File: `backend/src/test/java/com/st6/committracker/domain/DefiningObjectiveRepositoryTest.java`**

Test cases:
1. `shouldSaveWithRallyCryReference` — persist DO linked to RC
2. `shouldFindByRallyCryIdActiveOnly` — persist 2 active + 1 archived under same RC, verify filter
3. `shouldFindByOwner` — persist 2 DOs with owner, 1 without, verify `findByOwnerIdAndArchivedAtIsNull`
4. `shouldCascadeOrgScoping` — DO.org must match its RallyCry.org (application-level check)

**File: `backend/src/test/java/com/st6/committracker/domain/OutcomeRepositoryTest.java`**

Test cases:
1. `shouldSaveWithDefiningObjectiveReference` — basic CRUD
2. `shouldFindByDefiningObjectiveIdActiveOnly` — filter archived
3. `shouldFindByOwner` — owner-based query

**File: `backend/src/test/java/com/st6/committracker/domain/ChessCategoryRepositoryTest.java`**

Test cases:
1. `shouldSaveAndFind` — basic CRUD
2. `shouldEnforceUniqueOrgAndName` — same org + name throws exception
3. `shouldAllowSameNameDifferentOrgs` — different orgs can have "Strategic"
4. `shouldFindActiveByOrg` — filter inactive categories
5. `shouldFindByOrgIdAndName` — lookup by natural key

**File: `backend/src/test/java/com/st6/committracker/domain/CycleRepositoryTest.java`**

Cycles are org-wide (no `user_id`). Test cases:
1. `shouldSaveAndFindCycle` — basic CRUD with state = DRAFT
2. `shouldFindActiveCycleByOrg` — persist 2 cycles for an org, 1 active, verify `findByOrgIdAndIsActiveTrue`
3. `shouldEnforceAtMostOneActiveCyclePerOrg` — persist 2 active cycles for same org, expect `DataIntegrityViolationException` (unique partial index)
4. `shouldAllowActiveForDifferentOrgs` — persist 1 active cycle per org (2 orgs), both succeed
5. `shouldEnforceDateOrderConstraint` — persist cycle with `endsAt <= startsAt`, expect DB constraint violation
6. `shouldEnforceUniqueOrgStartsAt` — two cycles same org + startsAt, expect constraint violation
7. `shouldListByOrgOrderedByStartsAtDesc` — persist 3 cycles for one org, verify ordering
8. `shouldDefaultStateToDraft` — persist cycle without explicit state, assert state is DRAFT
9. `shouldPersistAllCycleStates` — persist one cycle per `CycleState` value, verify all persist correctly

**File: `backend/src/test/java/com/st6/committracker/domain/CommitmentRepositoryTest.java`**

Test cases:
1. `shouldSaveMinimalCommitment` — title, user, cycle, org only (no RCDO, no chess category)
2. `shouldSaveFullyLinkedCommitment` — all RCDO fields + chess category + assignedBy
3. `shouldEnforceRcdoHierarchyConsistency_OutcomeWithoutDO` — set outcome without DO, expect constraint violation
4. `shouldEnforceRcdoHierarchyConsistency_DOWithoutRC` — set DO without RC, expect constraint violation
5. `shouldAllowPartialRcdoLink_RCOnly` — RC set, DO and outcome null — valid
6. `shouldAllowPartialRcdoLink_RCAndDO` — RC + DO set, outcome null — valid
7. `shouldAllowNullRcdo` — all three null — valid (unlinked/operational work)
8. `shouldFindByUserAndCycle` — persist 3 commitments for user+cycle, 1 for different user, verify filter
9. `shouldFindByOrgAndCycle` — persist commitments for 2 users in same org+cycle, verify all returned
10. `shouldOrderByPriorityRank` — persist 3 with ranks 2,0,1, verify order
11. `shouldTrackCarriedFrom` — persist original + carried commitment with `carried_from_id`, verify FK works
12. `shouldCountByChessCategory` — persist commitments with different categories, verify count
13. `shouldFindByAssignedBy` — persist 2 assigned by manager, 1 self-directed, verify filter
14. `shouldPersistAllCompletionHorizons` — persist one per `CompletionHorizon` value
15. `shouldCascadeDeleteTaskBullets` — persist commitment with 3 bullets, delete commitment, verify bullets gone (CASCADE)

**File: `backend/src/test/java/com/st6/committracker/domain/TaskBulletRepositoryTest.java`**

Test cases:
1. `shouldSaveAndFindByCommitment` — basic CRUD
2. `shouldOrderBySortOrder` — persist 3 bullets with sort_order 2,0,1, verify ordering
3. `shouldCascadeDeleteWithCommitment` — delete parent commitment, verify bullets removed
4. `shouldNotAllowNullBody` — persist bullet with null body, expect constraint violation

**File: `backend/src/test/java/com/st6/committracker/domain/ReconciliationRecordRepositoryTest.java`**

Test cases:
1. `shouldSaveReconciliationRecord` — basic persist with all fields
2. `shouldEnforceUniqueCommitmentAndCycle` — two records for same commitment+cycle, expect constraint violation
3. `shouldFindByCommitmentAndCycle` — lookup by composite key
4. `shouldFindByOrgAndCycle` — list all reconciliation records for org+cycle
5. `shouldCountByStatus` — persist records with different statuses, verify `countByOrgIdAndCycleIdAndStatus`
6. `shouldPersistAllReconciliationStatuses` — one per `ReconciliationStatus` value

**File: `backend/src/test/java/com/st6/committracker/domain/AnalystScopeRepositoryTest.java`**

Test cases:
1. `shouldSaveWithRallyCryScope` — rallyCry set, orgUnitRoot null
2. `shouldSaveWithOrgUnitScope` — orgUnitRoot set, rallyCry null
3. `shouldSaveWithBothScopes` — both set
4. `shouldRejectBothNull` — both null, expect constraint violation (`at_least_one_scope`)
5. `shouldFindByAnalyst` — persist 2 scopes for same analyst, verify both returned

---

### 2.17 Frontend Types (parallel work)

**File: `frontend/src/types/commitment.types.ts`**

```typescript
import type { CompletionHorizon, ReconciliationStatus } from './enums';

export interface TaskBullet {
  id: string;
  body: string;
  sortOrder: number;
  isCompleted: boolean;
}

export interface RcdoLink {
  rallyCryId: string | null;
  definingObjectiveId: string | null;
  outcomeId: string | null;
}

export type AssignmentAttribution =
  | { kind: 'SELF_DIRECTED' }
  | { kind: 'ASSIGNED_BY'; assignedById: string; assignedByName: string };

export interface Commitment {
  id: string;
  cycleId: string;
  userId: string;
  userDisplayName: string;
  title: string;
  description: string | null;
  rcdoLink: RcdoLink;
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

export interface CreateCommitmentRequest {
  title: string;
  description?: string;
  bullets: string[];
  completionHorizon: CompletionHorizon;
  chessCategoryId?: string;
  rallyCryId?: string;
  definingObjectiveId?: string;
  outcomeId?: string;
  assignedBy?: string;
}

export interface UpdateCommitmentRequest extends Partial<CreateCommitmentRequest> {
  id: string;
}

export interface ReorderCommitmentsRequest {
  commitmentIds: string[];
}
```

**File: `frontend/src/types/cycle.types.ts`**

```typescript
export type CycleState = 'DRAFT' | 'LOCKED' | 'RECONCILING' | 'RECONCILED';

export interface Cycle {
  id: string;
  orgId: string;
  label: string;
  state: CycleState;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  commitmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CycleTransitionRequest {
  targetState: CycleState;
  reason?: string;
}
```

**File: `frontend/src/types/rcdo.types.ts`**

```typescript
/**
 * These types match the backend RcdoTreeResponse node types.
 * The tree endpoint returns active (non-archived) items only,
 * so orgId and archivedAt are omitted from the response.
 */
export interface RallyCryNode {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  definingObjectives: DefiningObjectiveNode[];
}

export interface DefiningObjectiveNode {
  id: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  sortOrder: number;
  outcomes: OutcomeNode[];
}

export interface OutcomeNode {
  id: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  sortOrder: number;
}

export interface RcdoTree {
  rallyCries: RallyCryNode[];
}
```

**File: `frontend/src/types/reconciliation.types.ts`**

```typescript
import type { CompletionHorizon, ReconciliationStatus } from './enums';

export interface ReconciliationRecord {
  id: string;
  commitmentId: string;
  cycleId: string;
  status: ReconciliationStatus;
  notes: string | null;
  plannedHorizon: CompletionHorizon | null;
  reconciledAt: string;
  reconciledByUserId: string;
}

export interface ReconcileCommitmentRequest {
  status: ReconciliationStatus;
  completionNotes?: string;
  carryForward: boolean;
  bulletStatuses: BulletStatus[];
}

export interface BulletStatus {
  bulletId: string;
  done: boolean;
}

/** Mirrors backend ReconciliationViewResponse */
export interface ReconciliationViewResponse {
  cycle: import('./cycle.types').Cycle;
  commitments: CommitmentReconciliationDetail[];
  summary: ReconciliationSummary;
}

export interface CommitmentReconciliationDetail {
  commitment: import('./commitment.types').Commitment;
  reconciliation: ReconciliationRecord | null;
}

export interface ReconciliationSummary {
  totalCommitments: number;
  reconciledCount: number;
  completedCount: number;
  partiallyCompletedCount: number;
  notStartedCount: number;
  carriedForwardCount: number;
  completionRate: number;
  bulletCompletionRate: number;
}
```

**File: `frontend/src/types/user.types.ts`**

```typescript
import type { UserRole } from './enums';

export interface User {
  id: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  reportsToId: string | null;
  isActive: boolean;
}

export interface TeamMember extends User {
  commitmentCount: number;
  reconciledCount: number;
}
```

**File: `frontend/src/types/chess.types.ts`**

```typescript
export interface ChessCategory {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
}
```

**File: `frontend/src/types/enums.ts`**

```typescript
export type CompletionHorizon = 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'EOD' | 'EOW';
export type ReconciliationStatus = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'NOT_STARTED' | 'CARRIED_FORWARD';
export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'DIRECTOR' | 'VP' | 'EXECUTIVE' | 'ANALYST';
export type ChessCategoryType = 'STRATEGIC' | 'OPERATIONAL' | 'DEFENSIVE' | 'CAPABILITY_BUILDING';
```

**File: `frontend/src/types/dashboard.types.ts`**

```typescript
/**
 * All types mirror the backend DTOs in the dashboard package.
 * See: TeamRollupResponse, AlignmentSignalResponse,
 * AssignmentAttributionResponse, RcdoCoverageResponse, DashboardResponse.
 */

/** Mirrors backend DashboardResponse — composite response from GET /api/v1/dashboard */
export interface DashboardResponse {
  teamRollup: TeamRollupResponse;
  alignmentSignal: AlignmentSignalResponse;
  assignmentAttribution: AssignmentAttributionResponse;
  rcdoCoverage: RcdoCoverageResponse;
}

/** Mirrors backend TeamRollupResponse */
export interface TeamRollupResponse {
  members: TeamMemberSummary[];
}

export interface TeamMemberSummary {
  userId: string;
  displayName: string;
  role: string;
  totalCommitments: number;
  cycleState: import('./cycle.types').CycleState;
  reconciledCount: number;
  categoryBreakdown: Record<string, number>;
}

/** Mirrors backend AlignmentSignalResponse */
export interface AlignmentSignalResponse {
  teamSize: number;
  distribution: Record<string, CategoryDistribution>;
  unlinkedCount: number;
  byTeamMember: MemberAlignment[];
}

export interface CategoryDistribution {
  count: number;
  percentage: number;
}

export interface MemberAlignment {
  userId: string;
  displayName: string;
  distribution: Record<string, CategoryDistribution>;
  unlinkedCount: number;
}

/** Mirrors backend AssignmentAttributionResponse */
export interface AssignmentAttributionResponse {
  totalCommitments: number;
  selfDirectedCount: number;
  selfDirectedPercentage: number;
  managerAssignedCount: number;
  managerAssignedPercentage: number;
  concentrationRisks: AssignmentConcentration[];
}

export interface AssignmentConcentration {
  assignedToUserId: string;
  assignedToName: string;
  assignmentCount: number;
  percentageOfTotal: number;
}

/** Mirrors backend RcdoCoverageResponse */
export interface RcdoCoverageResponse {
  totalCommitments: number;
  linkedCount: number;
  unlinkedCount: number;
  linkedPercentage: number;
  byRallyCry: { rallyCryId: string; title: string; commitmentCount: number; percentage: number }[];
  uncoveredObjectives: { definingObjectiveId: string; title: string; rallyCryTitle: string }[];
}
```

**File: `frontend/src/types/api.types.ts`** — already defined in section 1.5. No duplication needed.

**File: `frontend/src/types/index.ts`** (barrel export)

```typescript
export * from './api.types';
export * from './commitment.types';
export * from './cycle.types';
export * from './rcdo.types';
export * from './reconciliation.types';
export * from './user.types';
export * from './chess.types';
export * from './enums';
export * from './dashboard.types';
```

---

### 2.18 Form Validation Schemas (Zod)

**File: `frontend/src/lib/validation.ts`**

Zod is used **only for form validation** (react-hook-form resolver), NOT for runtime API response parsing. TypeScript interfaces are the single source of truth for API shapes. Duplicating every interface as a Zod schema creates three sources of truth (Java DTOs, TS interfaces, Zod schemas) that must be kept in sync — a maintenance trap with no real benefit when you control both sides of the API.

```typescript
import { z } from 'zod';

// Enum schemas — shared by form validation
export const CompletionHorizonSchema = z.enum(['MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW']);
export const ReconciliationStatusSchema = z.enum(['COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_STARTED', 'CARRIED_FORWARD']);

// Form validation schemas (for react-hook-form)
export const CreateCommitmentFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(2000).optional(),
  bullets: z.array(z.string().min(1)).min(2, 'At least 2 bullets required').max(5, 'Maximum 5 bullets'),
  completionHorizon: CompletionHorizonSchema,
  chessCategoryId: z.string().uuid().optional(),
  rallyCryId: z.string().uuid().optional(),
  definingObjectiveId: z.string().uuid().optional(),
  outcomeId: z.string().uuid().optional(),
  assignedBy: z.string().uuid().optional(),
}).refine(
  (data) => !data.outcomeId || data.definingObjectiveId,
  { message: 'Defining Objective is required when Outcome is set', path: ['definingObjectiveId'] }
).refine(
  (data) => !data.definingObjectiveId || data.rallyCryId,
  { message: 'Rally Cry is required when Defining Objective is set', path: ['rallyCryId'] }
);

export const ReconcileCommitmentFormSchema = z.object({
  status: ReconciliationStatusSchema,
  completionNotes: z.string().max(2000).optional(),
  carryForward: z.boolean(),
  bulletStatuses: z.array(z.object({
    bulletId: z.string().uuid(),
    done: z.boolean(),
  })),
}).refine(
  (data) => data.status === 'COMPLETED' || (data.completionNotes && data.completionNotes.trim().length > 0),
  { message: 'Notes are required when status is not Completed', path: ['completionNotes'] }
);
```

---

### 2.19 Phase 2 Verification Checklist

```bash
# 1. Run all repository tests (TDD: they should all pass after entities are implemented)
cd backend && ./gradlew test
# Expect: All tests pass. Testcontainers spins up Postgres 16, Flyway runs migrations,
# each test class runs in a transaction that rolls back.

# 2. Verify Hibernate validates schema against Flyway-created tables
# (ddl-auto: validate in application.yml means Hibernate compares entities to DB schema)
./gradlew bootRun --args='--spring.profiles.active=local'
# Expect: No SchemaManagementException. All entities map correctly.

# 3. Frontend types compile
cd frontend && pnpm typecheck
# Expect: No TypeScript errors.

# 4. Frontend tests pass (placeholder)
pnpm test
# Expect: passWithNoTests or basic smoke tests pass.
```

---

### Implementation Sequencing Summary

**Phase 1 execution order:**
1. Backend Gradle project + `build.gradle.kts` + wrapper
2. All `application*.yml` + `logback-spring.xml`
3. `CommitTrackerApplication.java`
4. All config classes (`SecurityConfig`, `CorsConfig`, `JacksonConfig`, `AuditConfig`)
5. Shared classes (`ApiResponse`, `PagedResponse`, `GlobalExceptionHandler` with ProblemDetail)
6. `RequestLoggingFilter` (sets X-Request-Id header)
7. `HealthController`
8. All 13 Flyway migrations (V001-V013, including V011 audit_entries)
9. Infrastructure files (`Dockerfile` x2, `docker-compose*.yml`, `.env.example`, `nginx.conf`)
10. Frontend `package.json` + `pnpm install`
11. Frontend config files (`tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.cjs`)
12. Frontend entry points (`index.html`, `main.tsx`, `App.tsx`)
13. Frontend foundation components (`ErrorBoundary.tsx`, `Layout.tsx`)
14. Frontend API client (`client.ts`, `api.types.ts`)
15. `.gitignore` updates
16. Verification: all 4 checks pass

**Phase 2 execution order (TDD — SEQUENTIAL, not parallelizable due to FK dependencies):**

Each entity depends on entities above it (FK references). A subagent cannot start `CommitmentRepositoryTest` until `Org`, `AppUser`, `Cycle`, and all RCDO entities exist. Work through this list top to bottom.

1. `AbstractRepositoryTest` + `TestFixtures` + `PersistingTestData` (test infrastructure)
2. Java enum types (4 files)
3. Write `OrgRepositoryTest` -> implement `Org` entity + `OrgRepository` -> GREEN
4. Write `UserRepositoryTest` -> implement `AppUser` entity + `AppUserRepository` -> GREEN
5. Write RCDO tests -> implement `RallyCry`, `DefiningObjective`, `Outcome` entities + repos -> GREEN
6. Write `ChessCategoryRepositoryTest` -> implement entity + repo -> GREEN
7. Write `CycleRepositoryTest` -> implement entity + repo -> GREEN
8. Write `CommitmentRepositoryTest` -> implement entity + repo -> GREEN
9. Write `TaskBulletRepositoryTest` -> implement entity + repo -> GREEN
10. Write `ReconciliationRecordRepositoryTest` -> implement entity + repo -> GREEN
11. Write `AnalystScopeRepositoryTest` -> implement entity + repo -> GREEN
12. Frontend types (all `.types.ts` files) + form validation schemas — **can be done in parallel** with steps 3-11 (frontend has no compile-time dependency on Java entities)
13. Verification: `./gradlew test` all green, `pnpm typecheck` clean

---

### Potential Challenges

1. **Testcontainers on macOS**: Requires Docker Desktop running. The `@Container` annotation with `PostgreSQLContainer` needs the Docker socket accessible. If using Colima or OrbStack instead of Docker Desktop, ensure the `DOCKER_HOST` env var is set.

2. **`pnpm` lockfile**: First `pnpm install` will generate `pnpm-lock.yaml`. This must be committed for the `--frozen-lockfile` flag in the Docker build to work.

3. **Vite env vars**: Vite requires the `VITE_` prefix for client-exposed environment variables (not `REACT_APP_`). The `.env.example` and all code references use `import.meta.env.VITE_*` — not `process.env.REACT_APP_*`.

### Critical Files for Implementation

- `/Users/js/dev/st6/backend/build.gradle.kts` - Central dependency and build configuration; everything else depends on this being correct first
- `/Users/js/dev/st6/backend/src/main/java/com/st6/committracker/domain/commit/Commitment.java` - Most complex entity with 8 FK relationships, RCDO consistency constraint, enum mappings, and carry-forward self-reference
- `/Users/js/dev/st6/backend/src/test/java/com/st6/committracker/support/AbstractRepositoryTest.java` - Testcontainers base class that all 12 repository tests depend on; if this is wrong, no tests run
- `/Users/js/dev/st6/backend/src/main/resources/db/migration/V007__create_commitments.sql` - The commitments table migration with the RCDO hierarchy consistency CHECK constraint; must match entity mapping exactly
- `/Users/js/dev/st6/frontend/src/lib/validation.ts` - Zod form validation schemas for react-hook-form; must stay in sync with backend validation rules (bullet count 2-5, title required, RCDO hierarchy consistency)

---

## Prerequisites (assumed complete from Phases 1-2)

Before Phase 3 begins, the following must exist:

- **Project scaffold**: `backend/` directory with `build.gradle.kts`, `settings.gradle.kts`, Gradle wrapper, `CommitTrackerApplication.java`, `application.yml`, `application-test.yml`, `logback-spring.xml`
- **Flyway migrations**: All SQL (tables, VARCHAR CHECK constraints, indexes, triggers) in `src/main/resources/db/migration/` (V001-V013, no placeholder migrations)
- **JPA Entities**: `Org`, `AppUser`, `Cycle`, `Commitment`, `TaskBullet`, `RallyCry`, `DefiningObjective`, `Outcome`, `ChessCategory`, `ReconciliationRecord`, `AnalystScope` -- all with `@Enumerated(EnumType.STRING)` (standard, no NAMED_ENUM hacks). Note: `AuditEntry` is defined in Phase 3C.1 alongside `AuditService`, not in Phase 2.
- **Enums**: `CycleState` (DRAFT, LOCKED, RECONCILING, RECONCILED — stored on cycles only; commitments derive state from their cycle), `CompletionHorizon`, `ReconciliationStatus`, `UserRole` (EMPLOYEE, MANAGER, DIRECTOR, VP, EXECUTIVE, ANALYST)
- **Spring Data Repositories**: `OrgRepository`, `AppUserRepository`, `CycleRepository`, `CommitmentRepository`, `TaskBulletRepository`, `RallyCryRepository`, `DefiningObjectiveRepository`, `OutcomeRepository`, `ChessCategoryRepository`, `ReconciliationRecordRepository`, `AnalystScopeRepository`. Note: `AuditEntryRepository` is defined in Phase 3C.1.
- **Custom repository queries**: `findByOrgIdAndIsActiveTrue(UUID orgId)` on `CycleRepository`, `findByUserIdAndCycleIdOrderByPriorityRankAsc(UUID userId, UUID cycleId)` on `CommitmentRepository`, `findByReportsToId(UUID managerId)` on `AppUserRepository`, `findByCommitmentIdAndCycleId(UUID commitmentId, UUID cycleId)` on `ReconciliationRecordRepository`, etc.
- **Testcontainers base class**: `@DataJpaTest` slice tests passing against real Postgres 16
- **Shared types**: `ApiResponse<T>`, `PagedResponse<T>`, `ProblemDetail` error handling via Spring built-in

---

## PHASE 3: Core Business Logic (Service Layer)

### 3A: State Machine

**Build order**: This is the foundation. Every service depends on it. Pure Java, zero Spring dependencies.

#### File: `backend/src/main/java/com/st6/committracker/domain/cycle/CycleStateMachine.java`

No `@Component` annotation. This is a pure utility class instantiated directly.

```java
public class CycleStateMachine {

    public record TransitionResult(
        boolean allowed,
        String rejectionReason
    ) {
        public static TransitionResult allowed() { return new TransitionResult(true, null); }
        public static TransitionResult rejected(String reason) { return new TransitionResult(false, reason); }
    }

    public TransitionResult validate(Cycle cycle, CycleState targetState, AppUser actor, TransitionContext context);

    // Internal validation methods — package-private for testability
    TransitionResult validateLock(Cycle cycle, AppUser actor, TransitionContext context);
    TransitionResult validateStartReconciliation(Cycle cycle, AppUser actor, TransitionContext context);
    TransitionResult validateCompleteReconciliation(Cycle cycle, AppUser actor, TransitionContext context);
}
```

**`TransitionContext` record** (same file or adjacent):
```java
public record TransitionContext(
    int commitmentCount,
    int reconciledCommitmentCount,
    int totalCommitmentsInCycle,
    Instant now
) {}
```

**Transition rules — exhaustive specification:**

Since cycles are org-wide, transition permissions are role-based, not ownership-based.

1. **DRAFT to LOCKED** (`validateLock`):
   - `context.commitmentCount() >= 1` — at least one commitment exists. Rejection: "Cannot lock cycle with no commitments"
   - `cycle.getStartsAt()` must not be before the start of the current week — no backdating. Rejection: "Cannot lock a cycle for a past week"
   - Actor must be MANAGER, DIRECTOR, VP, or EXECUTIVE. Rejection: "Only managers and above can lock a cycle"

2. **LOCKED to RECONCILING** (`validateStartReconciliation`):
   - `context.now().isAfter(cycle.getEndsAt())` OR actor is DIRECTOR, VP, or EXECUTIVE. The "early reconciliation" override is **inferred server-side from actor role** — never sent from the client. Rejection: "Cannot begin reconciliation before the week ends (only Directors+ can override)"
   - Actor must be MANAGER+. Rejection: "Only managers and above can start reconciliation"

3. **RECONCILING to RECONCILED** (`validateCompleteReconciliation`):
   - `context.reconciledCommitmentCount() == context.totalCommitmentsInCycle()` — every commitment has a reconciliation record. Rejection: "Not all commitments have been reconciled (X of Y reconciled)"
   - Actor must be MANAGER+. Rejection: "Only managers and above can complete reconciliation"

4. **RECONCILED to anything**: Always rejected. "RECONCILED is a terminal state"

5. **Any skipped transition** (e.g., DRAFT to RECONCILING, DRAFT to RECONCILED, LOCKED to RECONCILED): Rejected. "Invalid state transition from X to Y"

**The `validate` method** dispatches based on `(cycle.getState(), targetState)` pair:
- `(DRAFT, LOCKED)` -> `validateLock`
- `(LOCKED, RECONCILING)` -> `validateStartReconciliation`
- `(RECONCILING, RECONCILED)` -> `validateCompleteReconciliation`
- All other combinations -> `TransitionResult.rejected("Invalid state transition from " + current + " to " + target)`

Add a `validTransitions()` helper to the `CycleState` enum (defined in Phase 2):

```java
public enum CycleState {
    DRAFT, LOCKED, RECONCILING, RECONCILED;

    public Set<CycleState> validTransitions() {
        return switch (this) {
            case DRAFT -> Set.of(LOCKED);
            case LOCKED -> Set.of(RECONCILING);
            case RECONCILING -> Set.of(RECONCILED);
            case RECONCILED -> Set.of();
        };
    }
}
```

**Note:** There is only ONE Java enum for lifecycle state: `CycleState`. It is stored on the `cycles` table only. Commitments derive their lifecycle state from their parent cycle — there is no `state` column on the `commitments` table. The frontend TypeScript `CycleState` type alias mirrors this enum.

#### Test File: `backend/src/test/java/com/st6/committracker/domain/cycle/CycleStateMachineTest.java`

**Write ALL tests FIRST.** No Spring context. Pure JUnit 5. Construct entities manually with test builders.

```java
@DisplayName("CycleStateMachine")
class CycleStateMachineTest {

    private CycleStateMachine stateMachine;
    // Test fixtures: owner, manager, otherUser, cycle, transitionContext builder

    @BeforeEach
    void setUp() {
        stateMachine = new CycleStateMachine();
        // Build test users and cycle using builder pattern
    }

    // === DRAFT -> LOCKED ===

    @Test
    @DisplayName("DRAFT→LOCKED succeeds with valid commitments and current week by MANAGER")
    void draftToLocked_succeeds_withValidCommitments()

    @Test
    @DisplayName("DRAFT→LOCKED fails with no commitments")
    void draftToLocked_fails_withNoCommitments()

    @Test
    @DisplayName("DRAFT→LOCKED fails with past week start (no backdating)")
    void draftToLocked_fails_withPastWeekStart()

    @Test
    @DisplayName("DRAFT→LOCKED fails when EMPLOYEE triggers it")
    void draftToLocked_fails_whenEmployeeTriggers()

    // === LOCKED -> RECONCILING ===

    @Test
    @DisplayName("LOCKED→RECONCILING succeeds after week end by MANAGER")
    void lockedToReconciling_succeeds_afterWeekEnd()

    @Test
    @DisplayName("LOCKED→RECONCILING fails before week end for MANAGER (no override)")
    void lockedToReconciling_fails_beforeWeekEnd_manager()

    @Test
    @DisplayName("LOCKED→RECONCILING succeeds before week end for DIRECTOR+ (inferred override)")
    void lockedToReconciling_succeeds_beforeWeekEnd_director()

    // === RECONCILING -> RECONCILED ===

    @Test
    @DisplayName("RECONCILING→RECONCILED fails with unreconciled commitments")
    void reconcilingToReconciled_fails_withUnreconciledCommitments()

    @Test
    @DisplayName("RECONCILING→RECONCILED succeeds when all commitments reconciled by MANAGER")
    void reconcilingToReconciled_succeeds_allReconciled()

    @Test
    @DisplayName("RECONCILING→RECONCILED fails when EMPLOYEE triggers it")
    void reconcilingToReconciled_fails_whenEmployeeTriggers()

    // === Invalid transitions ===

    @Test
    @DisplayName("DRAFT→RECONCILING rejected as invalid skip")
    void invalidTransition_draftToReconciling_rejected()

    @Test
    @DisplayName("DRAFT→RECONCILED rejected as invalid skip")
    void invalidTransition_draftToReconciled_rejected()

    @Test
    @DisplayName("LOCKED→RECONCILED rejected as invalid skip")
    void invalidTransition_lockedToReconciled_rejected()

    @Test
    @DisplayName("RECONCILED→DRAFT rejected (terminal state)")
    void invalidTransition_reconciledToAnything_rejected()

    @Test
    @DisplayName("RECONCILED→LOCKED rejected (terminal state)")
    void invalidTransition_reconciledToLocked_rejected()

    // === Edge cases ===

    @Test
    @DisplayName("Same-state transition rejected (DRAFT→DRAFT)")
    void sameStateTransition_rejected()

    @Test
    @DisplayName("Null target state throws IllegalArgumentException")
    void nullTargetState_throws()

    @Test
    @DisplayName("validTransitions() returns correct sets for each state")
    void validTransitions_correctForEachState()
}
```

Total: **19 test methods** for the state machine alone.

---

### 3B: Security and Visibility

#### Visibility — Strategy Pattern (split across focused classes)

Instead of one monolithic `VisibilityEnforcer`, visibility is split into a coordinator + per-role strategy classes. Each strategy is a single focused class that a subagent can implement and test independently.

**File: `backend/src/main/java/com/st6/committracker/security/VisibilityStrategy.java`**

```java
/**
 * Interface for role-specific visibility resolution.
 * Each implementation handles one UserRole (or group of related roles).
 */
public interface VisibilityStrategy {
    /** Which roles this strategy handles. */
    Set<UserRole> supportedRoles();

    /** Pre-compute the set of user IDs visible to this actor. Called once per request. */
    Set<UUID> computeVisibleUserIds(AppUser actor);
}
```

**File: `backend/src/main/java/com/st6/committracker/security/EmployeeVisibility.java`**
```java
@Component
public class EmployeeVisibility implements VisibilityStrategy {
    public Set<UserRole> supportedRoles() { return Set.of(UserRole.EMPLOYEE); }
    public Set<UUID> computeVisibleUserIds(AppUser actor) { return Set.of(actor.getId()); }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/ManagerVisibility.java`**
```java
@Component
public class ManagerVisibility implements VisibilityStrategy {
    private final AppUserRepository userRepository;
    // Constructor injection
    public Set<UserRole> supportedRoles() { return Set.of(UserRole.MANAGER); }
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        Set<UUID> ids = new HashSet<>();
        ids.add(actor.getId());
        userRepository.findByReportsToId(actor.getId()).forEach(u -> ids.add(u.getId()));
        return ids;
    }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/HierarchyVisibility.java`**
```java
@Component
public class HierarchyVisibility implements VisibilityStrategy {
    private final AppUserRepository userRepository;
    // Constructor injection
    public Set<UserRole> supportedRoles() { return Set.of(UserRole.DIRECTOR, UserRole.VP); }
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        Set<UUID> ids = new HashSet<>(userRepository.findSubtreeUserIds(actor.getId()));
        ids.add(actor.getId());
        return ids;
    }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/ExecutiveVisibility.java`**
```java
@Component
public class ExecutiveVisibility implements VisibilityStrategy {
    private final AppUserRepository userRepository;
    // Constructor injection
    public Set<UserRole> supportedRoles() { return Set.of(UserRole.EXECUTIVE); }
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        return userRepository.findByOrgIdAndIsActiveTrue(actor.getOrg().getId())
            .stream().map(AppUser::getId).collect(Collectors.toSet());
    }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/AnalystVisibility.java`**
```java
@Component
public class AnalystVisibility implements VisibilityStrategy {
    private final AnalystScopeRepository analystScopeRepository;
    private final AppUserRepository userRepository;
    // Constructor injection
    public Set<UserRole> supportedRoles() { return Set.of(UserRole.ANALYST); }
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        // Resolve analyst_scopes: rally_cry-scoped → all users with commitments linked to that RC
        // org_unit-scoped → subtree CTE from org_unit_root_user_id
        // Union results
    }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/VisibilityEnforcer.java`**

The coordinator. Thin — delegates to strategies.

```java
@Component
public class VisibilityEnforcer {

    private final Map<UserRole, VisibilityStrategy> strategies;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;

    public VisibilityEnforcer(List<VisibilityStrategy> strategyList,
            DefiningObjectiveRepository definingObjectiveRepository,
            OutcomeRepository outcomeRepository) {
        this.strategies = new EnumMap<>(UserRole.class);
        for (VisibilityStrategy s : strategyList) {
            for (UserRole role : s.supportedRoles()) {
                strategies.put(role, s);
            }
        }
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
    }

    /** Can actor view a specific commitment? */
    public boolean canViewCommitment(AppUser actor, Commitment commitment) {
        if (computeVisibleUserIds(actor).contains(commitment.getUser().getId())) return true;
        return isRcdoOwner(actor, commitment); // cross-cutting RCDO owner visibility
    }

    /** Batch filter: pre-compute visible user IDs once, then filter. */
    public List<Commitment> filterVisible(AppUser actor, List<Commitment> commitments) {
        Set<UUID> visibleUserIds = computeVisibleUserIds(actor);
        Set<UUID> ownedRcdoIds = computeOwnedRcdoIds(actor);
        return commitments.stream()
            .filter(c -> visibleUserIds.contains(c.getUser().getId())
                      || matchesOwnedRcdo(c, ownedRcdoIds))
            .toList();
    }

    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        VisibilityStrategy strategy = strategies.get(actor.getRole());
        if (strategy == null) return Set.of(actor.getId()); // fallback: self only
        return strategy.computeVisibleUserIds(actor);
    }

    private boolean isRcdoOwner(AppUser actor, Commitment commitment) { /* ... */ }
    private Set<UUID> computeOwnedRcdoIds(AppUser actor) { /* ... */ }
    private boolean matchesOwnedRcdo(Commitment c, Set<UUID> ownedRcdoIds) { /* ... */ }
}
```

#### Security Context — Use Spring Security's built-in `SecurityContextHolder`

**No custom ThreadLocal.** Instead, use Spring Security's `SecurityContextHolder` which handles thread propagation, async contexts, and lifecycle management correctly out of the box.

**File: `backend/src/main/java/com/st6/committracker/security/AppUserPrincipal.java`**

```java
/**
 * Wraps AppUser as a Spring Security principal.
 * Stored in SecurityContextHolder by JwtAuthenticationFilter.
 * Retrieved in services via SecurityContextHelper.getCurrentUser().
 */
public record AppUserPrincipal(AppUser user) implements Principal {
    @Override
    public String getName() { return user.getEmail(); }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/SecurityContextHelper.java`**

```java
/**
 * Static helper to extract the authenticated AppUser from Spring Security context.
 * Uses SecurityContextHolder — no custom ThreadLocal.
 */
public final class SecurityContextHelper {
    private SecurityContextHelper() {}

    public static AppUser getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal p)) {
            throw new AccessDeniedException("Not authenticated");
        }
        return p.user();
    }

    public static UUID getCurrentOrgId() { return getCurrentUser().getOrg().getId(); }

    public static Optional<AppUser> tryGetCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserPrincipal p) {
            return Optional.of(p.user());
        }
        return Optional.empty();
    }
}
```

#### File: `backend/src/main/java/com/st6/committracker/security/JwtAuthenticationFilter.java`

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final TokenValidator tokenValidator;
    private final AppUserRepository userRepository;

    // Constructor injection

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException;
    // Steps:
    // 1. Extract Bearer token from Authorization header
    // 2. Validate token via TokenValidator (interface — impl selected by profile)
    // 3. Extract userId, orgId from claims
    // 4. Load AppUser from repository
    // 5. Create AppUserPrincipal and set in Spring SecurityContextHolder:
    //    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
    //        new AppUserPrincipal(user), null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));
    //    SecurityContextHolder.getContext().setAuthentication(auth);
    // 6. Set MDC fields: userId, orgId, requestId
    // 7. filterChain.doFilter(request, response)
    // 8. In finally block: SecurityContextHolder.clearContext(), MDC.clear()

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request);
    // Skip: /actuator/health, /actuator/info, /api/health
}
```

#### Token Validation — Interface + Two Profile-Gated Implementations

Uses an **interface** with two profile-gated implementations to avoid `@Primary` / inheritance bean resolution confusion. Only one implementation is active at a time.

**File: `backend/src/main/java/com/st6/committracker/security/TokenValidator.java`**
```java
public interface TokenValidator {
    Optional<JwtClaims> validate(String token);

    record JwtClaims(UUID userId, UUID orgId, String email, String role) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/security/Rs256TokenValidator.java`**
```java
/**
 * Production token validator — active for all profiles EXCEPT "local" and "test".
 * Validates JWT signature using RS256 (asymmetric) with the configured public key.
 */
@Component
@Profile("!local & !test")
public class Rs256TokenValidator implements TokenValidator {

    @Value("${st6.jwt.public-key:}")
    private String jwtPublicKey;

    @Value("${st6.jwt.issuer:}")
    private String jwtIssuer;

    @Override
    public Optional<JwtClaims> validate(String token) {
        // Verify RS256 signature, check expiry, extract claims
    }
}
```

**File: `backend/src/main/java/com/st6/committracker/security/DevTokenValidator.java`**
```java
/**
 * Dev/test token validator — active when Spring profile is "local" OR "test".
 * Accepts unsigned tokens with required claims for local development and testing.
 * Cannot be accidentally enabled in production — gated by @Profile, not a boolean flag.
 *
 * SECURITY: Validates that the claimed user ID exists in the database
 * (done by JwtAuthenticationFilter after calling validate()).
 */
@Component
@Profile({"local", "test"})
public class DevTokenValidator implements TokenValidator {
    @Override
    public Optional<JwtClaims> validate(String token) {
        // Parse unsigned JWT, extract claims without signature verification
    }
}
```

#### File: `backend/src/main/java/com/st6/committracker/config/SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter);
    // Configure:
    // - CSRF disabled (API-only, JWT auth)
    // - CORS configured via CorsConfig
    // - Stateless session management
    // - Add JwtAuthenticationFilter before UsernamePasswordAuthenticationFilter
    // - Permit: /actuator/health, /actuator/info
    // - Authenticate: everything else under /api/**
}
```

#### Test File: `backend/src/test/java/com/st6/committracker/security/VisibilityEnforcerTest.java`

Uses Mockito to mock repositories. No Spring context needed.

```java
@ExtendWith(MockitoExtension.class)
@DisplayName("VisibilityEnforcer")
class VisibilityEnforcerTest {

    @Mock private AppUserRepository userRepository;
    @Mock private AnalystScopeRepository analystScopeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;

    @InjectMocks private VisibilityEnforcer enforcer;

    // Test fixtures built in @BeforeEach:
    // - org (UUID)
    // - executive (EXECUTIVE role, reports_to null)
    // - director (DIRECTOR role, reports_to executive)
    // - managerA (MANAGER, reports_to director)
    // - managerB (MANAGER, reports_to director)
    // - employeeA1 (EMPLOYEE, reports_to managerA)
    // - employeeA2 (EMPLOYEE, reports_to managerA)
    // - employeeB1 (EMPLOYEE, reports_to managerB)
    // - analyst (ANALYST, reports_to null)
    // - Commitments with various RCDO links
    // - DefiningObjective owned by managerA
    // - AnalystScope entries for analyst

    // === Self-visibility ===

    @Test
    @DisplayName("Employee can view own commitments")
    void employee_canViewOwnCommitments()

    // === Manager visibility ===

    @Test
    @DisplayName("Employee cannot view other employee's commitments")
    void employee_cannotViewOtherEmployeeCommitments()

    @Test
    @DisplayName("Manager can view direct report's commitments")
    void manager_canViewDirectReportCommitments()

    @Test
    @DisplayName("Manager cannot view non-report's commitments")
    void manager_cannotViewNonReportCommitments()

    // === Director and above ===

    @Test
    @DisplayName("Director can view full subtree (transitive reports)")
    void director_canViewFullSubtree()

    @Test
    @DisplayName("Executive can view entire org")
    void executive_canViewEntireOrg()

    // === Analyst scoping ===

    @Test
    @DisplayName("Analyst can view within scope - RCDO-based")
    void analyst_canViewWithinScope_rcdoBased()

    @Test
    @DisplayName("Analyst can view within scope - org unit based")
    void analyst_canViewWithinScope_orgUnitBased()

    @Test
    @DisplayName("Analyst cannot view outside scope")
    void analyst_cannotViewOutsideScope()

    // === RCDO owner cross-cutting ===

    @Test
    @DisplayName("RCDO owner can view linked commitments regardless of reporting line")
    void rcdoOwner_canViewLinkedCommitments()

    @Test
    @DisplayName("RCDO owner cannot view unlinked commitments of non-reports")
    void rcdoOwner_cannotViewUnlinkedCommitments()

    // === Batch filtering ===

    @Test
    @DisplayName("filterVisible returns only accessible commitments from a mixed list")
    void filterVisible_returnsOnlyAccessible()

    // === Edge cases ===

    @Test
    @DisplayName("Management chain check guards against cycles (max depth)")
    void managementChainCheck_guardsAgainstCycles()

    @Test
    @DisplayName("Inactive user is not visible")
    void inactiveUser_notVisible()
}
```

Total: **14 test methods** for visibility.

---

### 3C: Core Services

#### 3C.1: AuditService (simplest, no dependencies on other services)

**File: `backend/src/main/java/com/st6/committracker/audit/AuditEntry.java`**

JPA entity — defined here with its migration added in Phase 1 (`V011__create_audit_entries.sql`).

| Field | Type | Annotation |
|---|---|---|
| `id` | `UUID` | `@Id`, `@GeneratedValue(strategy = GenerationType.UUID)` |
| `org` | `Org` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "org_id")` |
| `entityType` | `String` | `@Column(name = "entity_type", nullable = false)` |
| `entityId` | `UUID` | `@Column(name = "entity_id", nullable = false)` |
| `action` | `String` | `@Column(nullable = false)` |
| `actor` | `AppUser` | `@ManyToOne(fetch = LAZY, optional = false)`, `@JoinColumn(name = "actor_id")` |
| `actorRole` | `String` | `@Column(name = "actor_role", nullable = false)` |
| `details` | `String` | `@Column(columnDefinition = "jsonb")` — nullable, stores arbitrary JSON context |
| `createdAt` | `Instant` | `@CreationTimestamp`, `@Column(name = "created_at", nullable = false, updatable = false)` |

Table: `@Table(name = "audit_entries")`

This is an append-only entity. No `updatedAt`, no updates, no deletes. `equals`/`hashCode` on `id` only.

**File: `backend/src/main/java/com/st6/committracker/audit/AuditEntryRepository.java`**

```java
package com.st6.committracker.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AuditEntryRepository extends JpaRepository<AuditEntry, UUID> {
    List<AuditEntry> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
    List<AuditEntry> findByEntityTypeAndEntityIdOrderByCreatedAtAsc(String entityType, UUID entityId);
    List<AuditEntry> findByActorIdOrderByCreatedAtDesc(UUID actorId);
}
```

**File: `backend/src/main/java/com/st6/committracker/audit/AuditService.java`**

```java
@Service
@Transactional
public class AuditService {

    private final AuditEntryRepository auditEntryRepository;
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    /**
     * Append-only write. Never updates or deletes.
     * Logs at INFO level with structured fields.
     */
    public AuditEntry log(AuditEntry entry);

    /**
     * Convenience builder method.
     */
    public AuditEntry log(UUID orgId, String entityType, UUID entityId,
                          String action, AppUser actor, Map<String, Object> details);
}
```

**Test File: `backend/src/test/java/com/st6/committracker/audit/AuditServiceTest.java`**

```java
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock private AuditEntryRepository repository;
    @InjectMocks private AuditService auditService;

    @Test void log_persistsEntry_withAllFields()
    @Test void log_setsTimestamp_ifNotProvided()
    @Test void log_convenienceMethod_buildsEntryCorrectly()
}
```

#### 3C.2: RcdoService

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/RcdoService.java`**

```java
@Service
@Transactional
public class RcdoService {

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final CommitmentRepository commitmentRepository;
    private final AuditService auditService;
    private static final Logger log = LoggerFactory.getLogger(RcdoService.class);

    // === Rally Cry CRUD ===

    /** Create rally cry. Validates: title not blank, org exists. Logs: RCDO_CREATED. */
    public RallyCry createRallyCry(UUID orgId, String title, String description, AppUser actor);

    /** Update rally cry. Validates: exists, not archived. Logs: RCDO_UPDATED. */
    public RallyCry updateRallyCry(UUID id, String title, String description, AppUser actor);

    /** Soft-delete (set archived_at). Warns if commitments reference it.
     *  Returns warning count. Logs: RCDO_ARCHIVED. */
    public int archiveRallyCry(UUID id, AppUser actor);

    // === Defining Objective CRUD ===

    public DefiningObjective createDefiningObjective(UUID orgId, UUID rallyCryId,
        String title, String description, UUID ownerUserId, AppUser actor);
    public DefiningObjective updateDefiningObjective(UUID id, String title,
        String description, UUID ownerUserId, AppUser actor);
    public int archiveDefiningObjective(UUID id, AppUser actor);

    // === Outcome CRUD ===

    public Outcome createOutcome(UUID orgId, UUID definingObjectiveId,
        String title, String description, UUID ownerUserId, AppUser actor);
    public Outcome updateOutcome(UUID id, String title, String description,
        UUID ownerUserId, AppUser actor);
    public int archiveOutcome(UUID id, AppUser actor);

    // === Tree query ===

    /**
     * Returns full RCDO hierarchy for an org, excluding archived.
     * Structure: List<RallyCry> each with nested List<DefiningObjective>
     * each with nested List<Outcome>.
     * Used by frontend dropdowns and import validation.
     */
    public RcdoTreeResponse getTree(UUID orgId);

    // === Internal helpers ===

    /** Count commitments referencing this RCDO entity. Used for archive warnings. */
    int countReferencingCommitments(String rcdoType, UUID rcdoId);
}
```

**Test File: `backend/src/test/java/com/st6/committracker/domain/rcdo/RcdoServiceTest.java`**

```java
@ExtendWith(MockitoExtension.class)
class RcdoServiceTest {

    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private AuditService auditService;
    @InjectMocks private RcdoService rcdoService;

    @Test void createRallyCry_persistsAndAudits()
    @Test void createRallyCry_blankTitle_throws()
    @Test void updateRallyCry_existingAndNotArchived_updates()
    @Test void updateRallyCry_archived_throwsIllegalState()
    @Test void archiveRallyCry_setsArchivedAt_andWarnsIfReferenced()
    @Test void archiveRallyCry_noReferences_returnsZeroWarnings()
    @Test void createDefiningObjective_validRallyCry_persists()
    @Test void createDefiningObjective_archivedRallyCry_throws()
    @Test void createOutcome_validDefiningObjective_persists()
    @Test void getTree_returnsNestedHierarchy_excludingArchived()
    @Test void getTree_emptyOrg_returnsEmptyList()
}
```

#### 3C.3: CycleService

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/CycleService.java`**

```java
@Service
@Transactional
public class CycleService {

    private final CycleRepository cycleRepository;
    private final CommitmentRepository commitmentRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final AuditService auditService;
    private final CycleStateMachine stateMachine; // Not injected — instantiated directly
    private static final Logger log = LoggerFactory.getLogger(CycleService.class);

    /**
     * Get the current active cycle for the actor's org.
     * Cycles are org-wide — all users share the same cycle.
     * If no active cycle exists for the current week, create one (DRAFT).
     * Cycle week boundaries: Monday 00:00 UTC to Sunday 23:59:59 UTC
     * (adjusted by org timezone from the Org entity).
     * Label format: "Week of Mar 10, 2026"
     */
    public Cycle getCurrentCycle(AppUser actor);

    /**
     * Get specific cycle by ID. Actor must be in the same org.
     * Throws AccessDeniedException if different org.
     */
    public Cycle getCycle(UUID cycleId, AppUser actor);

    /**
     * Execute a state transition on a user's cycle.
     * Steps:
     * 0. Verify actor is NOT ANALYST and NOT EMPLOYEE — throw 403 (only MANAGER+ can manage cycles)
     * 1. Load cycle, verify actor is in the same org
     * 2. Build TransitionContext (count commitments, count reconciled, current time)
     * 3. Call stateMachine.validate(cycle, targetState, actor, context)
     * 4. If rejected: throw ConflictException with rejection reason
     * 5. If allowed: update cycle.state to targetState
     * 6. Write audit entry via AuditService (entity_type=CYCLE, action=STATE_TRANSITION,
     *    details={from, to, reason})
     * 7. If transition is to RECONCILED: trigger completeCycle()
     * 8. Log at INFO: state transition details
     * Returns: updated Cycle
     */
    public Cycle transition(UUID cycleId, TransitionRequest request, AppUser actor);

    /**
     * Called after RECONCILED transition.
     * Orchestrates carry-forward for the org:
     * 1. Find all commitments in this cycle with reconciliation_status = CARRIED_FORWARD
     * 2. For each: clone into a new DRAFT cycle for next week (same org)
     * 3. Cloned commitment retains: title, user, bullets, RCDO link, chess category, assigned_by
     * 4. Cloned commitment sets: carried_from_id, resets priority_rank to 0, resets horizon to EOW
     * 5. Log each carry-forward at INFO level
     */
    void completeCycle(Cycle cycle, AppUser actor);

    /**
     * List cycle history for the org. Actor must be in the same org.
     * Filters: userId, dateRange, state.
     * Paginated. Sorted by starts_at descending.
     */
    public Page<Cycle> listCycles(CycleFilters filters, Pageable pageable);

    // === Internal helpers ===

    Cycle createDraftCycle(Org org, Instant weekStart, Instant weekEnd, String label);
    Instant computeWeekStart(Instant now, String timezone);
    Instant computeWeekEnd(Instant weekStart);
}
```

**Test File: `backend/src/test/java/com/st6/committracker/domain/cycle/CycleServiceTest.java`**

```java
@ExtendWith(MockitoExtension.class)
class CycleServiceTest {

    @Mock private CycleRepository cycleRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @Mock private AuditService auditService;
    @InjectMocks private CycleService cycleService;

    // getCurrentCycle (org-wide)
    @Test void getCurrentCycle_existingDraftForOrg_returnsCycle()
    @Test void getCurrentCycle_noDraftForOrg_createsNewDraftCycle()
    @Test void getCurrentCycle_computesCorrectWeekBoundaries()
    @Test void getCurrentCycle_respectsOrgTimezone()

    // getCycle
    @Test void getCycle_sameOrg_returnsCycle()
    @Test void getCycle_differentOrg_throwsAccessDenied()
    @Test void getCycle_notFound_throwsEntityNotFound()

    // role guard
    @Test void transition_asAnalyst_throwsForbidden()
    @Test void transition_asEmployee_throwsForbidden()

    // transition
    @Test void transition_validDraftToLocked_updatesStateAndAudits()
    @Test void transition_rejectedByStateMachine_throwsConflict()
    @Test void transition_writesAuditEntry()
    @Test void transition_toReconciled_triggersCarryForward()

    // completeCycle (carry-forward)
    @Test void completeCycle_clonesCarriedForwardCommitments()
    @Test void completeCycle_clonedRetainsTitleBulletsRcdoCategory()
    @Test void completeCycle_clonedSetsCarriedFromId()
    @Test void completeCycle_clonedResetsRankAndHorizon()
    @Test void completeCycle_noCarryForwardItems_createsNothingNew()
    @Test void completeCycle_createsNextWeekDraftCycleIfNeeded()

    // listCycles
    @Test void listCycles_returnsPagedResults()
}
```

#### 3C.4: CommitmentService

**File: `backend/src/main/java/com/st6/committracker/domain/commit/CommitmentService.java`**

```java
@Service
@Transactional
public class CommitmentService {

    private final CommitmentRepository commitmentRepository;
    private final TaskBulletRepository taskBulletRepository;
    private final CycleRepository cycleRepository;
    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final ChessCategoryRepository chessCategoryRepository;
    private final AppUserRepository userRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final AuditService auditService;
    private static final Logger log = LoggerFactory.getLogger(CommitmentService.class);

    /**
     * Create a new commitment.
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403 (analysts are read-only)
     * 1. Cycle must be in DRAFT state — throw 409 Conflict otherwise
     *    (unless isUnplanned=true AND cycle is in RECONCILING state — see createUnplanned)
     * 2. RCDO link consistency: if outcomeId set, definingObjectiveId required;
     *    if definingObjectiveId set, rallyCryId required
     * 3. All referenced RCDO entities must exist and not be archived
     * 4. Chess category must exist and be active
     * 5. assignedBy user (if set) must exist and be in same org
     * 6. Bullets: 2-5 items required (per requirements: "2-5 high-level bullets")
     * 7. Auto-set priority_rank to max(existing ranks in cycle for user) + 1
     * Actions:
     * - Save commitment
     * - Save task bullets
     * - Audit log: COMMITMENT_CREATED
     * - Log at INFO: commitmentId, userId, cycleId, rcdoLink, category
     */
    public Commitment create(CreateCommitmentRequest request, AppUser actor);

    /**
     * Create an unplanned work commitment during reconciliation.
     * Relaxes the DRAFT-only guard: allows creation when cycle is in RECONCILING state.
     * The commitment is tagged with isUnplanned=true and automatically gets a
     * reconciliation record created alongside it (status determined by the request).
     * Validations: same as create() except cycle state must be RECONCILING (not DRAFT).
     * All other validations (RCDO, category, bullets) still apply.
     */
    public Commitment createUnplanned(CreateUnplannedCommitmentRequest request, AppUser actor);

    /**
     * Update an existing commitment.
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403 (analysts are read-only)
     * 1. Commitment must exist — throw 404
     * 2. Actor must be the commitment owner — throw 403
     * 3. Cycle must be in DRAFT state — throw 409
     * 4. Same RCDO and chess category validations as create
     * Actions:
     * - Update fields
     * - Replace task bullets (delete old, insert new)
     * - Audit log: COMMITMENT_UPDATED with changed fields
     */
    public Commitment update(UUID commitmentId, UpdateCommitmentRequest request, AppUser actor);

    /**
     * Delete a commitment (hard delete, DRAFT only).
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403 (analysts are read-only)
     * 1. Commitment must exist — throw 404
     * 2. Actor must be the commitment owner — throw 403
     * 3. Cycle must be in DRAFT state — throw 409
     * Actions:
     * - Hard delete the commitment (DRAFT-state commitments have no reconciliation
     *   records yet, so hard delete is safe and there is no deleted_at column)
     * - Cascade deletes task bullets (ON DELETE CASCADE in DB)
     * - Audit log: COMMITMENT_DELETED
     */
    public void delete(UUID commitmentId, AppUser actor);

    /**
     * Reorder commitments within a cycle.
     * Input: ordered list of commitment UUIDs.
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403 (analysts are read-only)
     * 1. All IDs must belong to same cycle and same user
     * 2. Cycle must be in DRAFT state
     * 3. Actor must be the commitment owner
     * Actions:
     * - Set priority_rank = index position for each commitment
     * - Audit log: COMMITMENTS_REORDERED
     */
    public void reorder(UUID cycleId, List<UUID> orderedIds, AppUser actor);

    /**
     * Get commitments for a cycle with filters and pagination.
     * Visibility-scoped: filters through VisibilityEnforcer.
     * Filters: userId, rallyCryId, definingObjectiveId, outcomeId,
     *          chessCategoryId, assignedBy
     * Default sort: priority_rank ASC
     */
    public Page<Commitment> getForCycle(UUID cycleId, CommitmentFilters filters,
                                         Pageable pageable, AppUser actor);

    /**
     * Get single commitment by ID. Visibility-scoped.
     */
    public Commitment getById(UUID commitmentId, AppUser actor);

    /**
     * Internal method: clone a commitment for carry-forward.
     * Called by CycleService.completeCycle.
     * Not exposed via API.
     */
    Commitment cloneForCarryForward(Commitment source, Cycle targetCycle);
}
```

**Test File: `backend/src/test/java/com/st6/committracker/domain/commit/CommitmentServiceTest.java`**

```java
@ExtendWith(MockitoExtension.class)
class CommitmentServiceTest {

    @Mock private CommitmentRepository commitmentRepository;
    @Mock private TaskBulletRepository taskBulletRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @Mock private AuditService auditService;
    @InjectMocks private CommitmentService commitmentService;

    // role guard
    @Test void create_asAnalyst_throwsForbidden()
    @Test void update_asAnalyst_throwsForbidden()
    @Test void delete_asAnalyst_throwsForbidden()
    @Test void reorder_asAnalyst_throwsForbidden()

    // create
    @Test void create_inDraftCycle_persistsCommitmentAndBullets()
    @Test void create_inLockedCycle_throwsConflict()
    @Test void create_withInvalidRcdoHierarchy_throwsValidation()
    @Test void create_withArchivedRcdo_throwsValidation()
    @Test void create_withInvalidChessCategory_throwsValidation()
    @Test void create_setsAutoIncrementedRank()
    @Test void create_withAssignedBy_validatesUserExists()
    @Test void create_withFewerThan2Bullets_throwsValidation()
    @Test void create_withMoreThan5Bullets_throwsValidation()
    @Test void create_auditsCreation()

    // update
    @Test void update_inDraftCycle_updatesFieldsAndBullets()
    @Test void update_inLockedCycle_throwsConflict()
    @Test void update_byNonOwner_throwsForbidden()
    @Test void update_notFound_throwsNotFound()
    @Test void update_auditsWithChangedFields()

    // delete
    @Test void delete_inDraftCycle_removesCommitment()
    @Test void delete_inLockedCycle_throwsConflict()
    @Test void delete_byNonOwner_throwsForbidden()

    // reorder
    @Test void reorder_updatesRanksInOrder()
    @Test void reorder_wrongCycle_throwsValidation()
    @Test void reorder_inLockedCycle_throwsConflict()
    @Test void reorder_byNonOwner_throwsForbidden()

    // getForCycle
    @Test void getForCycle_filtersAndPaginates()
    @Test void getForCycle_appliesVisibilityFilter()

    // getById
    @Test void getById_visible_returnsCommitment()
    @Test void getById_notVisible_throwsForbidden()

    // cloneForCarryForward
    @Test void cloneForCarryForward_copiesFieldsCorrectly()
    @Test void cloneForCarryForward_setsCarriedFromId()
    @Test void cloneForCarryForward_resetsRankAndHorizon()
    @Test void cloneForCarryForward_clonesBullets()

    // createUnplanned
    @Test void createUnplanned_inReconcilingCycle_persistsWithIsUnplannedTrue()
    @Test void createUnplanned_inDraftCycle_throwsConflict()
    @Test void createUnplanned_inLockedCycle_throwsConflict()
    @Test void createUnplanned_createsReconciliationRecordAutomatically()
    @Test void createUnplanned_validatesRcdoAndCategory()
}
```

#### 3C.5: ReconciliationService

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/ReconciliationService.java`**

```java
@Service
@Transactional
public class ReconciliationService {

    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final CommitmentRepository commitmentRepository;
    private final TaskBulletRepository taskBulletRepository;
    private final CycleRepository cycleRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final AuditService auditService;
    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    /**
     * Record reconciliation for a single commitment.
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403 (analysts are read-only)
     * 1. Commitment must exist — 404
     * 2. Cycle must be in RECONCILING state — 409
     * 3. Actor must be the commitment owner — 403
     * 4. No existing reconciliation record for this commitment+cycle — 409 (idempotent: update if exists)
     * 5. If status != COMPLETED, completionNotes must be non-blank — 400 ("Notes required when status is not COMPLETED")
     * Actions:
     * - Create ReconciliationRecord with status, notes, planned_horizon
     * - Update task bullet completion statuses from bulletStatuses in request
     * - If carryForward == true: set reconciliation_status to CARRIED_FORWARD
     * - Audit log: COMMITMENT_RECONCILED
     * - Log at INFO: commitmentId, cycleId, status, carryForward, bulletProgress
     */
    public ReconciliationRecord reconcileCommitment(UUID commitmentId,
        ReconcileRequest request, AppUser actor);

    /**
     * Get the full reconciliation view for a cycle.
     * Returns: list of commitments with their reconciliation records,
     * bullet-level completion, and a summary.
     * Visibility-scoped: actor must be able to view the cycle.
     */
    public ReconciliationView getReconciliationView(UUID cycleId, AppUser actor);

    /**
     * Check if all commitments in a cycle have reconciliation records.
     * Used by CycleStateMachine via TransitionContext.
     */
    public boolean isFullyReconciled(UUID cycleId);

    /**
     * Compute reconciliation summary statistics for a cycle.
     * Returns: counts by status, overall completion rate, bullet completion rate.
     */
    public ReconciliationSummary computeSummary(UUID cycleId);

    // Internal DTO for the reconciliation view
    public record ReconciliationView(
        Cycle cycle,
        List<CommitmentReconciliationDetail> commitments,
        ReconciliationSummary summary
    ) {}

    public record CommitmentReconciliationDetail(
        Commitment commitment,
        List<TaskBullet> bullets,
        ReconciliationRecord reconciliationRecord // nullable if not yet reconciled
    ) {}
}
```

**Test File: `backend/src/test/java/com/st6/committracker/domain/reconciliation/ReconciliationServiceTest.java`**

```java
@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private TaskBulletRepository taskBulletRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @Mock private AuditService auditService;
    @InjectMocks private ReconciliationService reconciliationService;

    // role guard
    @Test void reconcile_asAnalyst_throwsForbidden()

    @Test void reconcile_inReconcilingCycle_createsRecord()
    @Test void reconcile_inDraftCycle_throwsConflict()
    @Test void reconcile_inLockedCycle_throwsConflict()
    @Test void reconcile_byNonOwner_throwsForbidden()
    @Test void reconcile_updatesBulletCompletionStatuses()
    @Test void reconcile_withCarryForward_setsCorrectStatus()
    @Test void reconcile_existingRecord_updatesInsteadOfDuplicate()
    @Test void reconcile_notCompleted_withoutNotes_throwsValidation()
    @Test void reconcile_completed_withoutNotes_succeeds()
    @Test void reconcile_auditsAction()

    @Test void getReconciliationView_returnsCommitmentsWithRecords()
    @Test void getReconciliationView_notVisible_throwsForbidden()
    @Test void getReconciliationView_mixedReconciled_showsPartialProgress()

    @Test void isFullyReconciled_allReconciled_returnsTrue()
    @Test void isFullyReconciled_someUnreconciled_returnsFalse()
    @Test void isFullyReconciled_emptyCommitments_returnsTrue()

    @Test void computeSummary_calculatesCorrectCounts()
    @Test void computeSummary_calculatesBulletCompletionRate()
}
```

#### 3C.6: DashboardService

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/DashboardService.java`**

```java
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final CommitmentRepository commitmentRepository;
    private final AppUserRepository userRepository;
    private final CycleRepository cycleRepository;
    private final ChessCategoryRepository chessCategoryRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    /**
     * Get team roll-up for a manager.
     * Validates: actor must be MANAGER, DIRECTOR, VP, or EXECUTIVE.
     * Returns: for each direct report, their commitment count, reconciliation status,
     * chess category breakdown, and current cycle state.
     * Filters: cycleWeekStart, teamMemberId
     * If actor is DIRECTOR+: includeSubtree flag returns transitive reports.
     */
    public TeamRollupResponse getTeamRollup(AppUser manager, DashboardFilters filters);

    /**
     * Get alignment gap signal.
     * Computes: percentage breakdown of commitments by chess category
     * across the manager's team.
     * Response: team aggregate bar + per-member breakdown.
     * The key differentiator visualization.
     */
    public AlignmentSignalResponse getAlignmentSignal(AppUser manager, DashboardFilters filters);

    /**
     * Get assignment attribution stats.
     * Computes:
     * - % of team work that is manager-assigned vs self-directed
     * - Distribution of assignments per team member (dependency risk signal)
     * - Per-manager assignment patterns
     */
    public AssignmentAttributionResponse getAssignmentAttribution(AppUser manager,
        DashboardFilters filters);

    /**
     * Get RCDO coverage analysis.
     * Computes:
     * - % of commitments linked to each Rally Cry
     * - % of commitments unlinked (operational/escape hatch)
     * - Which Defining Objectives have no commitments (coverage gaps)
     */
    public RcdoCoverageResponse getRcdoCoverage(AppUser actor, DashboardFilters filters);

    // === Internal helpers ===

    List<AppUser> getVisibleTeamMembers(AppUser manager, DashboardFilters filters);
    Map<UUID, List<Commitment>> groupCommitmentsByUser(List<UUID> userIds, UUID cycleId);
}
```

**Test File: `backend/src/test/java/com/st6/committracker/domain/dashboard/DashboardServiceTest.java`**

```java
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private CommitmentRepository commitmentRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @InjectMocks private DashboardService dashboardService;

    // Team rollup
    @Test void getTeamRollup_asManager_returnsDirectReportsSummary()
    @Test void getTeamRollup_asDirector_includesSubtreeWhenFlagged()
    @Test void getTeamRollup_asEmployee_throwsForbidden()
    @Test void getTeamRollup_filtersByCycle()

    // Alignment signal
    @Test void getAlignmentSignal_computesCorrectPercentages()
    @Test void getAlignmentSignal_noCommitments_returnsZeroes()
    @Test void getAlignmentSignal_includesPerMemberBreakdown()
    @Test void getAlignmentSignal_countsUnlinkedSeparately()

    // Assignment attribution
    @Test void getAssignmentAttribution_computesSelfVsAssigned()
    @Test void getAssignmentAttribution_identifiesDependencyRisk()
    @Test void getAssignmentAttribution_noAssignments_returnsAllSelfDirected()

    // RCDO coverage
    @Test void getRcdoCoverage_computesLinkagePercentages()
    @Test void getRcdoCoverage_identifiesUnlinkedCommitments()
    @Test void getRcdoCoverage_identifiesUncoveredDefiningObjectives()
}
```

#### 3C.7: CSV Import — Split Into 4 Focused Services

Each CSV format has its own service class with its own test file. This keeps each class small enough for a subagent to implement in one pass and allows parallel development.

**File: `backend/src/main/java/com/st6/committracker/domain/importexport/ImportResult.java`** (shared)
```java
public record ImportResult(
    int totalRows,
    int importedRows,
    int skippedRows,
    int errorRows,
    List<ImportError> errors
) {}
public record ImportError(int row, String field, String message) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/importexport/UserCsvImporter.java`**
```java
@Service
public class UserCsvImporter {
    private final AppUserRepository userRepository;
    private final OrgRepository orgRepository;
    private final AuditService auditService;
    // Constructor injection

    /**
     * Import users from CSV.
     * Format: email, display_name, role, reports_to_email, external_id
     * Two-pass: Pass 1 creates/updates users (upsert by org_id + email).
     * Pass 2 resolves reports_to references.
     * Idempotent. Validates: email format, valid role enum, reports_to email exists.
     * Validates: file size <= 5MB, row count <= 10,000.
     */
    @Transactional
    public ImportResult importUsers(MultipartFile file, UUID orgId, AppUser actor);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/importexport/RcdoCsvImporter.java`**
```java
@Service
public class RcdoCsvImporter {
    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final AppUserRepository userRepository;
    private final AuditService auditService;

    /**
     * Import RCDO hierarchy from CSV.
     * Format: rally_cry, defining_objective, outcome, owner_email
     * Deduplicates by title within each level. Idempotent.
     * Validates: file size <= 5MB, row count <= 10,000.
     */
    @Transactional
    public ImportResult importRcdo(MultipartFile file, UUID orgId, AppUser actor);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/importexport/ChessCategoryCsvImporter.java`**
```java
@Service
public class ChessCategoryCsvImporter {
    private final ChessCategoryRepository chessCategoryRepository;
    private final AuditService auditService;

    /**
     * Import chess categories from CSV.
     * Format: name, description, color_hex
     * Upserts by (org_id, name). Idempotent.
     * Validates: file size <= 1MB, row count <= 100.
     */
    @Transactional
    public ImportResult importChessCategories(MultipartFile file, UUID orgId, AppUser actor);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/importexport/CommitmentCsvImporter.java`**
```java
@Service
public class CommitmentCsvImporter {
    private final CommitmentRepository commitmentRepository;
    private final AppUserRepository userRepository;
    private final CycleRepository cycleRepository;
    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final ChessCategoryRepository chessCategoryRepository;
    private final AuditService auditService;

    /**
     * Import commitments from CSV. SYNCHRONOUS.
     * Format: user_email, title, bullets (pipe-separated), completion_horizon,
     *         chess_category, rally_cry, defining_objective, outcome, assigned_by_email
     * Validates: user exists, cycle exists, RCDO exists, category exists.
     * Validates: file size <= 10MB, row count <= 50,000.
     */
    @Transactional
    public ImportResult importCommitments(MultipartFile file, UUID orgId, AppUser actor);
}
```

**Test files — one per importer, each independently testable:**

**`UserCsvImporterTest.java`**
```java
@ExtendWith(MockitoExtension.class)
class UserCsvImporterTest {
    @Mock private AppUserRepository userRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private AuditService auditService;
    @InjectMocks private UserCsvImporter importer;

    @Test void importUsers_validCsv_createsUsersAndResolvesReportsTo()
    @Test void importUsers_duplicateEmail_updatesExisting()
    @Test void importUsers_invalidRole_reportsError()
    @Test void importUsers_missingReportsToEmail_reportsError()
    @Test void importUsers_emptyFile_returnsZeroResults()
}
```

**`RcdoCsvImporterTest.java`**
```java
@ExtendWith(MockitoExtension.class)
class RcdoCsvImporterTest {
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private AuditService auditService;
    @InjectMocks private RcdoCsvImporter importer;

    @Test void importRcdo_validCsv_buildsHierarchy()
    @Test void importRcdo_deduplicatesByTitle()
    @Test void importRcdo_resolvesOwnerEmail()
    @Test void importRcdo_invalidOwnerEmail_reportsError()
}
```

**`ChessCategoryCsvImporterTest.java`**
```java
@ExtendWith(MockitoExtension.class)
class ChessCategoryCsvImporterTest {
    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private AuditService auditService;
    @InjectMocks private ChessCategoryCsvImporter importer;

    @Test void importChessCategories_validCsv_createsCategories()
    @Test void importChessCategories_duplicateName_updatesExisting()
    @Test void importChessCategories_missingName_reportsError()
}
```

**`CommitmentCsvImporterTest.java`**
```java
@ExtendWith(MockitoExtension.class)
class CommitmentCsvImporterTest {
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private AppUserRepository userRepository;
    // ... other mocks
    @InjectMocks private CommitmentCsvImporter importer;

    @Test void importCommitments_validCsv_createsCommitmentsWithBullets()
    @Test void importCommitments_resolvesRcdoAndCategory()
    @Test void importCommitments_invalidUserEmail_reportsError()
    @Test void importCommitments_exceedsFileSizeLimit_throwsValidation()
}
```

---

### 3D: DTOs and Request/Response Objects

All DTOs go in the same package as their domain. Use Java records for immutability.

**File: `backend/src/main/java/com/st6/committracker/domain/commit/dto/CreateCommitmentRequest.java`**

```java
public record CreateCommitmentRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID assignedBy,
    @NotNull @Size(min = 2, max = 5) List<String> bullets
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/dto/CreateUnplannedCommitmentRequest.java`**

```java
public record CreateUnplannedCommitmentRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    @NotNull @Size(min = 2, max = 5) List<String> bullets,
    @NotNull ReconciliationStatus reconciliationStatus,
    String reconciliationNotes
) {}
```

This request extends the normal create flow but:
1. Is only accepted when the cycle is in RECONCILING state
2. Sets `is_unplanned = true` on the commitment
3. Automatically creates a `ReconciliationRecord` for the new commitment (since it's being added during reconciliation, it must immediately have one)
4. Does not accept `assignedBy` — unplanned work is always self-directed

**File: `backend/src/main/java/com/st6/committracker/domain/commit/dto/UpdateCommitmentRequest.java`**

```java
public record UpdateCommitmentRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID assignedBy,
    @NotNull @Size(min = 2, max = 5) List<String> bullets
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/dto/CommitmentResponse.java`**

```java
public record CommitmentResponse(
    UUID id,
    UUID cycleId,
    UUID userId,
    String userDisplayName,
    String title,
    String description,
    CompletionHorizon completionHorizon,
    int priorityRank,
    UUID chessCategoryId,
    String chessCategoryName,
    RcdoLinkResponse rcdoLink,
    AssignmentAttributionResponse attribution,
    List<TaskBulletResponse> bullets,
    UUID carriedFromCommitmentId,
    boolean isUnplanned,
    ReconciliationStatus reconciliationStatus,
    String reconciliationNote,
    Instant createdAt,
    Instant updatedAt
) {
    public record RcdoLinkResponse(UUID rallyCryId, String rallyCryTitle,
        UUID definingObjectiveId, String definingObjectiveTitle,
        UUID outcomeId, String outcomeTitle) {}
    public record TaskBulletResponse(UUID id, String body, int sortOrder, boolean completed) {}
    public record AssignmentAttributionResponse(String kind, UUID assignedById, String assignedByName) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/dto/ReorderRequest.java`**

```java
public record ReorderRequest(
    @NotNull @Size(min = 1) List<UUID> orderedIds
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/dto/TransitionRequest.java`**

```java
public record TransitionRequest(
    @NotNull CycleState targetState,
    String reason
) {}
// NOTE: No managerOverride field. Early reconciliation override is inferred
// server-side from the actor's role (DIRECTOR+ can override). Never trust
// the client to assert its own privilege level.
```

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/dto/CycleResponse.java`**

```java
public record CycleResponse(
    UUID id,
    UUID orgId,
    String label,
    CycleState state,
    Instant startsAt,
    Instant endsAt,
    boolean isActive,
    int commitmentCount,
    Instant createdAt,
    Instant updatedAt
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/dto/CycleFilters.java`**

```java
public record CycleFilters(
    CycleState state,
    Instant dateFrom,
    Instant dateTo
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/commit/dto/CommitmentFilters.java`**

```java
public record CommitmentFilters(
    UUID userId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID chessCategoryId,
    UUID assignedBy
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/dto/ReconcileRequest.java`**

```java
/**
 * Reconciliation request for a single commitment.
 * Bean Validation handles field-level constraints. The cross-field rule
 * (completionNotes required when status != COMPLETED) is enforced in
 * ReconciliationService.reconcileCommitment() — not via a custom validator —
 * because it's business logic, not a format constraint.
 */
public record ReconcileRequest(
    @NotNull ReconciliationStatus status,
    @Size(max = 2000) String completionNotes,
    boolean carryForward,
    List<BulletStatusUpdate> bulletStatuses
) {
    public record BulletStatusUpdate(UUID bulletId, boolean done) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/dto/ReconciliationResponse.java`**

```java
public record ReconciliationResponse(
    UUID id,
    UUID commitmentId,
    UUID cycleId,
    ReconciliationStatus status,
    String notes,
    CompletionHorizon plannedHorizon,
    Instant reconciledAt,
    UUID reconciledByUserId,
    List<CommitmentResponse.TaskBulletResponse> bulletStatuses
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/dto/ReconciliationSummary.java`**

```java
public record ReconciliationSummary(
    int totalCommitments,
    int reconciledCount,
    int completedCount,
    int partiallyCompletedCount,
    int notStartedCount,
    int carriedForwardCount,
    double completionRate,
    double bulletCompletionRate
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/dto/ReconciliationViewResponse.java`**

```java
public record ReconciliationViewResponse(
    CycleResponse cycle,
    List<CommitmentReconciliationDetail> commitments,
    ReconciliationSummary summary
) {
    public record CommitmentReconciliationDetail(
        CommitmentResponse commitment,
        ReconciliationResponse reconciliation // null if not yet reconciled
    ) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/dto/AlignmentSignalResponse.java`**

```java
public record AlignmentSignalResponse(
    int teamSize,
    Map<String, CategoryDistribution> distribution,
    int unlinkedCount,
    List<MemberAlignment> byTeamMember
) {
    public record CategoryDistribution(int count, double percentage) {}
    public record MemberAlignment(UUID userId, String displayName,
        Map<String, CategoryDistribution> distribution, int unlinkedCount) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/dto/TeamRollupResponse.java`**

```java
public record TeamRollupResponse(
    List<TeamMemberSummary> members
) {
    public record TeamMemberSummary(
        UUID userId,
        String displayName,
        String role,
        int totalCommitments,
        CycleState cycleState,
        int reconciledCount,
        Map<String, Integer> categoryBreakdown
    ) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/dto/AssignmentAttributionResponse.java`**

```java
public record AssignmentAttributionResponse(
    int totalCommitments,
    int selfDirectedCount,
    double selfDirectedPercentage,
    int managerAssignedCount,
    double managerAssignedPercentage,
    List<AssignmentConcentration> concentrationRisks
) {
    public record AssignmentConcentration(
        UUID assignedToUserId, String assignedToName,
        int assignmentCount, double percentageOfTotal
    ) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/dto/RcdoCoverageResponse.java`**

```java
public record RcdoCoverageResponse(
    int totalCommitments,
    int linkedCount,
    int unlinkedCount,
    double linkedPercentage,
    List<RallyCryCoverage> byRallyCry,
    List<UncoveredObjective> uncoveredObjectives
) {
    public record RallyCryCoverage(UUID rallyCryId, String title, int commitmentCount, double percentage) {}
    public record UncoveredObjective(UUID definingObjectiveId, String title, String rallyCryTitle) {}
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/dto/DashboardFilters.java`**

```java
public record DashboardFilters(
    Instant cycleWeekStart,
    UUID teamMemberId,
    UUID rcdoId,
    String rcdoType, // "RALLY_CRY", "DEFINING_OBJECTIVE", "OUTCOME"
    boolean includeSubtree
) {}
```

**File: `backend/src/main/java/com/st6/committracker/domain/rcdo/dto/RcdoTreeResponse.java`**

```java
public record RcdoTreeResponse(
    List<RallyCryNode> rallyCries
) {
    public record RallyCryNode(UUID id, String title, String description, int sortOrder,
        List<DefiningObjectiveNode> definingObjectives) {}
    public record DefiningObjectiveNode(UUID id, String title, String description,
        UUID ownerUserId, String ownerDisplayName, int sortOrder,
        List<OutcomeNode> outcomes) {}
    public record OutcomeNode(UUID id, String title, String description,
        UUID ownerUserId, String ownerDisplayName, int sortOrder) {}
}
```

Note: With synchronous imports, the `ImportResult` record from `CsvImportService` is returned directly as the API response. No separate `ImportStatusResponse` DTO is needed.

---

### 3E: Shared Exception Types

**File: `backend/src/main/java/com/st6/committracker/shared/GlobalExceptionHandler.java`**

Uses Spring's `ProblemDetail` (RFC 7807) for all error responses. No custom error envelope.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    ProblemDetail handleNotFound(EntityNotFoundException ex);
    // Returns 404

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail handleAccessDenied(AccessDeniedException ex);
    // Returns 403

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException ex);
    // Returns 409

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException ex);
    // Returns 400, adds field-level errors to ProblemDetail.properties

    @ExceptionHandler(Exception.class)
    ProblemDetail handleGeneral(Exception ex);
    // Returns 500, logs full stack trace
}
```

**File: `backend/src/main/java/com/st6/committracker/shared/ConflictException.java`**

```java
public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
```

**File: `backend/src/main/java/com/st6/committracker/shared/EntityNotFoundException.java`**

```java
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String entityType, UUID id) {
        super(entityType + " not found: " + id);
    }
}
```

---

## PHASE 4: REST API Controllers

### 4A: Test Infrastructure (build FIRST)

#### File: `backend/src/test/java/com/st6/committracker/integration/IntegrationTestBase.java`

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class IntegrationTestBase {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("st6_test")
        .withUsername("st6_test")
        .withPassword("st6_test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    protected MockMvc mockMvc; // Or TestRestTemplate

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected PersistingTestData testData; // Auto-persist mode via TestDataConfig

    /**
     * Generate an unsigned JWT for the given user.
     * DevTokenValidator is activated by @Profile({"local", "test"}), so
     * @ActiveProfiles("test") on this class ensures unsigned tokens are accepted.
     */
    protected String tokenFor(AppUser user);

    /**
     * Build an Authorization header value for the given user.
     */
    protected String bearerToken(AppUser user) {
        return "Bearer " + tokenFor(user);
    }

    @BeforeEach
    void cleanDatabase(@Autowired JdbcTemplate jdbc) {
        // Use TRUNCATE ... CASCADE — no need to maintain FK ordering manually.
        // This is safe because tests run against a disposable Testcontainers instance.
        jdbc.execute("TRUNCATE TABLE audit_entries, analyst_scopes, reconciliation_records, "
            + "task_bullets, commitments, cycles, outcomes, defining_objectives, "
            + "rally_cries, chess_categories, users, orgs CASCADE");
    }
}
```

Also add `@AutoConfigureMockMvc` to the class.

**Note:** The `PersistingTestData` from Phase 2 is reused here. Import `TestDataConfig` to register it.

```java
@Import(TestDataConfig.class) // Registers PersistingTestData with EntityManager injection
public abstract class IntegrationTestBase {
    @Autowired protected PersistingTestData testData;
    // ... rest of the class
}
```

---

### 4B: Controllers

#### File: `backend/src/main/java/com/st6/committracker/domain/commit/CommitmentController.java`

```java
@RestController
@RequestMapping("/api/v1/commitments")
public class CommitmentController {

    private final CommitmentService commitmentService;
    private final CommitmentMapper commitmentMapper; // Entity -> DTO mapper

    @PostMapping
    public ResponseEntity<ApiResponse<CommitmentResponse>> create(
        @Valid @RequestBody CreateCommitmentRequest request
    );
    // SecurityContext.getCurrentUser() as actor
    // Returns 201 Created with Location header

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommitmentResponse>> getById(
        @PathVariable UUID id
    );
    // Returns 200

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CommitmentResponse>> update(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateCommitmentRequest request
    );
    // Returns 200

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable UUID id
    );
    // Returns 204 No Content

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CommitmentResponse>>> list(
        @RequestParam(required = false) UUID cycleId,
        @RequestParam(required = false) UUID userId,
        @RequestParam(required = false) UUID rallyCryId,
        @RequestParam(required = false) UUID definingObjectiveId,
        @RequestParam(required = false) UUID outcomeId,
        @RequestParam(required = false) UUID chessCategoryId,
        @RequestParam(required = false) UUID assignedBy,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "priorityRank,asc") String sort
    );
    // Builds CommitmentFilters from params, passes to service
    // Returns 200

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorder(
        @RequestParam UUID cycleId,
        @Valid @RequestBody ReorderRequest request
    );
    // Returns 200

    @PostMapping("/unplanned")
    public ResponseEntity<ApiResponse<CommitmentResponse>> createUnplanned(
        @Valid @RequestBody CreateUnplannedCommitmentRequest request
    );
    // Creates unplanned work during RECONCILING state.
    // Returns 201. Throws 409 if cycle is not in RECONCILING state.
    // Automatically creates a reconciliation record for the new commitment.
}
```

#### File: `backend/src/main/java/com/st6/committracker/domain/cycle/CycleController.java`

```java
@RestController
@RequestMapping("/api/v1/cycles")
public class CycleController {

    private final CycleService cycleService;
    private final CycleMapper cycleMapper;

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<CycleResponse>> getCurrentCycle();
    // Get or create DRAFT cycle for current week for the actor's org. Returns 200.

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CycleResponse>> getCycle(
        @PathVariable UUID id
    );
    // Returns 200

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CycleResponse>>> listCycles(
        @RequestParam(required = false) CycleState state,
        @RequestParam(required = false) Instant dateFrom,
        @RequestParam(required = false) Instant dateTo,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    );
    // Returns 200

    @PostMapping("/{id}/transition")
    public ResponseEntity<ApiResponse<CycleResponse>> transition(
        @PathVariable UUID id,
        @Valid @RequestBody TransitionRequest request
    );
    // Returns 200 on success, 409 on conflict
}
```

#### File: `backend/src/main/java/com/st6/committracker/domain/reconciliation/ReconciliationController.java`

```java
@RestController
@RequestMapping("/api/v1/reconciliation")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;
    private final CycleService cycleService;

    @GetMapping("/cycles/{cycleId}")
    public ResponseEntity<ApiResponse<ReconciliationViewResponse>> getReconciliationView(
        @PathVariable UUID cycleId
    );
    // GET /api/v1/reconciliation/cycles/{cycleId}
    // Returns 200. ReconciliationViewResponse wraps the view DTO.

    @PutMapping("/commitments/{id}")
    public ResponseEntity<ApiResponse<ReconciliationResponse>> reconcileCommitment(
        @PathVariable UUID id,
        @Valid @RequestBody ReconcileRequest request
    );
    // PUT /api/v1/reconciliation/commitments/{id}
    // Returns 200

    @PostMapping("/cycles/{cycleId}/complete")
    public ResponseEntity<ApiResponse<CycleResponse>> completeReconciliation(
        @PathVariable UUID cycleId
    );
    // POST /api/v1/reconciliation/cycles/{cycleId}/complete
    // Triggers transition to RECONCILED. Returns 200 on success, 409 if not fully reconciled.
    // Internally calls cycleService.transition(cycleId, new TransitionRequest(RECONCILED, ...), actor)
}
```

#### File: `backend/src/main/java/com/st6/committracker/domain/dashboard/DashboardController.java`

**Single composite endpoint.** All four dashboard sections (team rollup, alignment signal, assignment attribution, RCDO coverage) query the same underlying data: commitments for visible users in a cycle. One endpoint avoids 4 redundant round-trips and 4 near-identical filter-parsing blocks.

```java
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
        @RequestParam(required = false) Instant cycleWeekStart,
        @RequestParam(required = false) UUID teamMemberId,
        @RequestParam(required = false) UUID rcdoId,
        @RequestParam(required = false) String rcdoType,
        @RequestParam(defaultValue = "false") boolean includeSubtree
    );
    // Returns 200. Actor must be MANAGER+, ANALYST. Returns 403 for EMPLOYEE.
    // Response includes all four sections computed from one data fetch.
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/dashboard/dto/DashboardResponse.java`**
```java
public record DashboardResponse(
    TeamRollupResponse teamRollup,
    AlignmentSignalResponse alignmentSignal,
    AssignmentAttributionResponse assignmentAttribution,
    RcdoCoverageResponse rcdoCoverage
) {}
```

#### File: `backend/src/main/java/com/st6/committracker/domain/rcdo/RcdoController.java`

```java
@RestController
@RequestMapping("/api/v1/rcdo")
public class RcdoController {

    private final RcdoService rcdoService;

    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<RcdoTreeResponse>> getTree();
    // Returns 200. Uses actor's orgId.

    @GetMapping("/rally-cries")
    public ResponseEntity<ApiResponse<List<RallyCryResponse>>> listRallyCries();

    @PostMapping("/rally-cries")
    public ResponseEntity<ApiResponse<RallyCryResponse>> createRallyCry(
        @Valid @RequestBody CreateRallyCryRequest request
    );
    // Requires DIRECTOR+ role. Returns 201.

    @PutMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<Object>> updateRcdo(
        @PathVariable String type, // "rally-cries", "defining-objectives", "outcomes"
        @PathVariable UUID id,
        @Valid @RequestBody UpdateRcdoRequest request
    );
    // Requires DIRECTOR+. Returns 200.

    @DeleteMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<ArchiveResponse>> archiveRcdo(
        @PathVariable String type,
        @PathVariable UUID id
    );
    // Soft delete. Requires DIRECTOR+. Returns 200 with warning count.

    public record ArchiveResponse(int referencingCommitmentCount, String message) {}
}
```

Additional RCDO DTOs needed:
- `CreateRallyCryRequest(String title, String description)`
- `UpdateRcdoRequest(String title, String description, UUID ownerUserId)`
- `RallyCryResponse(UUID id, String title, String description, int sortOrder, Instant createdAt)`

#### File: `backend/src/main/java/com/st6/committracker/domain/user/UserController.java`

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final AppUserRepository userRepository;
    private final VisibilityEnforcer visibilityEnforcer;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser();
    // Returns 200 with current user profile

    @GetMapping("/team")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getTeam();
    // Returns direct reports for current user. Empty list for non-managers.

    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getOrgTree();
    // Returns full subtree below current user. Requires DIRECTOR+.
    // Returns 403 for EMPLOYEE/MANAGER.

    public record UserResponse(
        UUID id, String email, String displayName, UserRole role,
        UUID reportsTo, String reportsToDisplayName, boolean isActive
    ) {}
}
```

#### File: `backend/src/main/java/com/st6/committracker/domain/importexport/CsvImportController.java`

```java
@RestController
@RequestMapping("/api/v1/import")
public class CsvImportController {

    private final UserCsvImporter userCsvImporter;
    private final RcdoCsvImporter rcdoCsvImporter;
    private final ChessCategoryCsvImporter chessCategoryCsvImporter;
    private final CommitmentCsvImporter commitmentCsvImporter;

    /**
     * SECURITY: Every endpoint validates content-type is text/csv or application/octet-stream
     * before passing to the importer. Rejects other MIME types with 415 Unsupported Media Type.
     * Spring's multipart.max-file-size (10MB) is configured in application.yml.
     */
    private void validateCsvContentType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null
            && !contentType.equals("text/csv")
            && !contentType.equals("application/octet-stream")
            && !contentType.equals("application/vnd.ms-excel")) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "File must be CSV (text/csv). Received: " + contentType);
        }
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<ImportResult>> importUsers(
        @RequestParam("file") MultipartFile file
    );
    // Validates CSV content-type. Requires DIRECTOR+. Returns 200 with import result.

    @PostMapping("/rcdo")
    public ResponseEntity<ApiResponse<ImportResult>> importRcdo(
        @RequestParam("file") MultipartFile file
    );
    // Validates CSV content-type. Requires DIRECTOR+. Returns 200.

    @PostMapping("/chess-categories")
    public ResponseEntity<ApiResponse<ImportResult>> importChessCategories(
        @RequestParam("file") MultipartFile file
    );
    // Validates CSV content-type. Requires DIRECTOR+. Returns 200.

    @PostMapping("/commitments")
    public ResponseEntity<ApiResponse<ImportResult>> importCommitments(
        @RequestParam("file") MultipartFile file
    );
    // Validates CSV content-type. Requires DIRECTOR+. Synchronous. Returns 200 with ImportResult.
}
```

---

### 4C: Integration Tests (write FIRST, before controller implementation)

#### File: `backend/src/test/java/com/st6/committracker/integration/CommitmentApiTest.java`

```java
class CommitmentApiTest extends IntegrationTestBase {

    // Setup: creates org, hierarchy, RCDO tree, chess categories, DRAFT cycle

    @Test
    @DisplayName("POST /api/v1/commitments in DRAFT cycle returns 201")
    void createCommitment_inDraftCycle_returns201() {
        // POST with valid body, Authorization header
        // Assert: 201, response body has id, title, bullets, RCDO link
    }

    @Test
    @DisplayName("POST /api/v1/commitments in LOCKED cycle returns 409")
    void createCommitment_inLockedCycle_returns409() {
        // Create locked cycle, attempt POST
        // Assert: 409, error message about cycle state
    }

    @Test
    @DisplayName("PUT /api/v1/commitments/{id} in DRAFT cycle returns 200")
    void updateCommitment_inDraftCycle_returns200() {
        // Create commitment, then PUT with updated fields
        // Assert: 200, updated title/bullets reflected
    }

    @Test
    @DisplayName("DELETE /api/v1/commitments/{id} in DRAFT cycle returns 204")
    void deleteCommitment_inDraftCycle_returns204() {
        // Create commitment, then DELETE
        // Assert: 204, subsequent GET returns 404
    }

    @Test
    @DisplayName("GET /api/v1/commitments?rallyCryId=X returns filtered results")
    void listCommitments_filteredByRcdo_returnsFiltered() {
        // Create commitments with different RCDO links
        // GET with rallyCryId filter
        // Assert: only matching commitments returned
    }

    @Test
    @DisplayName("PUT /api/v1/commitments/reorder updates priority ranks")
    void reorderCommitments_updatesRanks() {
        // Create 3 commitments, reorder [C, A, B]
        // Assert: GET returns them in new order
    }

    @Test
    @DisplayName("POST /api/v1/commitments with invalid RCDO returns 400")
    void createCommitment_withInvalidRcdo_returns400() {
        // POST with outcomeId but no definingObjectiveId
        // Assert: 400
    }

    @Test
    @DisplayName("POST /api/v1/commitments without auth returns 401")
    void createCommitment_unauthenticated_returns401() {
        // POST without Authorization header
        // Assert: 401
    }
}
```

#### File: `backend/src/test/java/com/st6/committracker/integration/CycleLifecycleApiTest.java`

```java
class CycleLifecycleApiTest extends IntegrationTestBase {

    @Test
    @DisplayName("GET /api/v1/cycles/current creates DRAFT if none exists")
    void getCurrentCycle_createsDraftIfNoneExists() {
        // GET current cycle for user with no existing cycle
        // Assert: 200, state is DRAFT, week boundaries are correct
    }

    @Test
    @DisplayName("POST /api/v1/cycles/{id}/transition to LOCKED succeeds with commitments")
    void transitionToLocked_succeeds() {
        // Create DRAFT cycle with commitments
        // POST transition to LOCKED
        // Assert: 200, state is LOCKED
    }

    @Test
    @DisplayName("POST /api/v1/cycles/{id}/transition to LOCKED with no commitments returns 409")
    void transitionToLocked_withNoCommitments_returns409() {
        // Create empty DRAFT cycle
        // POST transition to LOCKED
        // Assert: 409
    }

    @Test
    @DisplayName("Full lifecycle: DRAFT → LOCKED → RECONCILING → RECONCILED")
    void fullLifecycle_draftThroughReconciled() {
        // 1. GET current cycle (DRAFT created)
        // 2. POST commitment
        // 3. Transition to LOCKED
        // 4. Transition to RECONCILING (with manager override or past week end)
        // 5. PUT reconcile each commitment
        // 6. POST complete reconciliation
        // Assert: final state is RECONCILED
    }

    @Test
    @DisplayName("Carry-forward creates new commitments in next cycle")
    void carryForward_createsNewCommitmentsInNextCycle() {
        // Full lifecycle with one CARRIED_FORWARD commitment
        // After RECONCILED: GET next week's current cycle
        // Assert: carried-forward commitment exists with carriedFromId set
    }
}
```

#### File: `backend/src/test/java/com/st6/committracker/integration/ReconciliationApiTest.java`

```java
class ReconciliationApiTest extends IntegrationTestBase {

    @Test
    @DisplayName("PUT /api/v1/reconciliation/commitments/{id} in RECONCILING cycle returns 200")
    void reconcileCommitment_inReconcilingCycle_returns200() {
        // Create cycle in RECONCILING state with commitments
        // PUT reconcile with COMPLETED status
        // Assert: 200, reconciliation record created
    }

    @Test
    @DisplayName("PUT /api/v1/reconciliation/commitments/{id} in DRAFT cycle returns 409")
    void reconcileCommitment_inDraftCycle_returns409() {
        // Create DRAFT cycle with commitment
        // PUT reconcile
        // Assert: 409
    }

    @Test
    @DisplayName("POST /api/v1/reconciliation/cycles/{cycleId}/complete succeeds when all reconciled")
    void completeReconciliation_allReconciled_returns200() {
        // RECONCILING cycle, all commitments reconciled
        // POST complete
        // Assert: 200, cycle state is RECONCILED
    }

    @Test
    @DisplayName("POST /api/v1/reconciliation/cycles/{cycleId}/complete fails when not all reconciled")
    void completeReconciliation_notAllReconciled_returns409() {
        // RECONCILING cycle, some commitments not reconciled
        // POST complete
        // Assert: 409
    }
}
```

#### File: `backend/src/test/java/com/st6/committracker/integration/DashboardApiTest.java`

```java
class DashboardApiTest extends IntegrationTestBase {

    @Test
    @DisplayName("GET /api/v1/dashboard as manager returns composite dashboard")
    void dashboard_asManager_returnsCompositeDashboard() {
        // Create hierarchy, commitments for reports with known chess categories and assignedBy
        // GET /api/v1/dashboard as manager
        // Assert: 200, response has teamRollup.members, alignmentSignal percentages,
        //         assignmentAttribution self-vs-assigned, rcdoCoverage linked percentage
    }

    @Test
    @DisplayName("GET /api/v1/dashboard as employee returns 403")
    void dashboard_asEmployee_returns403() {
        // GET as employee
        // Assert: 403
    }
}
```

#### File: `backend/src/test/java/com/st6/committracker/integration/SecurityApiTest.java`

```java
class SecurityApiTest extends IntegrationTestBase {

    @Test
    @DisplayName("Employee cannot see other employee's commitments")
    void employee_cannotSeeOtherEmployeeCommitments() {
        // Create commitments for employeeA1
        // GET as employeeA2
        // Assert: 403 or empty results
    }

    @Test
    @DisplayName("Manager can see direct report's commitments")
    void manager_canSeeDirectReportCommitments() {
        // Create commitments for employeeA1
        // GET as managerA
        // Assert: 200, commitments visible
    }

    @Test
    @DisplayName("Manager cannot see non-report's commitments")
    void manager_cannotSeeNonReportCommitments() {
        // Create commitments for employeeB1
        // GET as managerA (not B1's manager)
        // Assert: 403 or empty results
    }

    @Test
    @DisplayName("Director sees full subtree")
    void director_seesFullSubtree() {
        // Create commitments across all employees
        // GET as director
        // Assert: all commitments from managerA and managerB teams visible
    }

    @Test
    @DisplayName("Analyst has read-only access within scope")
    void analyst_readOnlyAccess() {
        // Create analyst scope for a rally cry
        // GET commitments linked to that rally cry as analyst
        // Assert: 200, can view
        // POST commitment as analyst
        // Assert: 403
    }

    @Test
    @DisplayName("No token returns 401")
    void noToken_returns401() {
        // GET any endpoint without Authorization header
        // Assert: 401
    }
}
```

#### File: `backend/src/test/java/com/st6/committracker/integration/CsvImportApiTest.java`

```java
class CsvImportApiTest extends IntegrationTestBase {

    @Test
    @DisplayName("POST /api/v1/import/users with valid CSV returns 200")
    void importUsers_validCsv_returns200() {
        // Upload valid users.csv as multipart
        // Assert: 200, importedRows > 0, users exist in DB
    }

    @Test
    @DisplayName("POST /api/v1/import/rcdo with valid CSV builds hierarchy")
    void importRcdo_validCsv_buildsHierarchy() {
        // Upload valid rcdo_hierarchy.csv
        // Assert: 200, tree endpoint returns correct hierarchy
    }

    @Test
    @DisplayName("POST /api/v1/import/commitments creates commitments synchronously")
    void importCommitments_createsCommitments() {
        // Upload commitments CSV
        // Assert: 200, ImportResult has importedRows > 0
        // Verify commitments exist in DB
    }
}
```

---

### 4D: Entity-to-DTO Mappers

Each domain package needs a mapper class to convert between JPA entities and response DTOs.

**File: `backend/src/main/java/com/st6/committracker/domain/commit/CommitmentMapper.java`**

```java
@Component
public class CommitmentMapper {
    public CommitmentResponse toResponse(Commitment entity, List<TaskBullet> bullets);
    public List<CommitmentResponse> toResponseList(List<Commitment> entities);
}
```

**File: `backend/src/main/java/com/st6/committracker/domain/cycle/CycleMapper.java`**

```java
@Component
public class CycleMapper {
    public CycleResponse toResponse(Cycle entity, int commitmentCount);
}
```

Mappers for other domains follow the same pattern. Keep them simple -- no MapStruct, just manual mapping in Java records' constructor calls.

---

### 4E: Parallelization Opportunity

The following frontend work can proceed in parallel with Phase 4 controller implementation:

1. **API client layer** (`frontend/src/api/`): Once the API design (section 3.3 of architecture) is finalized, the frontend team can build typed API client functions using Axios. The endpoint paths, request shapes, and response shapes are fully defined in the DTOs above.

2. **Zod schemas** (`frontend/src/types/`): All response types can be defined as Zod schemas mirroring the Java records. These can be written and tested independently.

3. **TanStack Query hooks** (`frontend/src/hooks/`): Query key structures, stale times, and mutation functions can all be scaffolded with placeholder API calls that resolve against mock data.

4. **UI components**: All presentational components (forms, cards, tables, charts) can be built against mock data while the API layer is being finalized.

The integration point is the `frontend/src/api/*.ts` files -- once the backend returns real responses, swapping from mocked to real API calls is a one-line change per hook.

---

### Build Order Summary

**IMPORTANT: Phase 3C is a SEQUENTIAL chain.** Each service depends on the one above. Do not attempt to parallelize 3C.3-3C.7.

| Step | What | Depends On | Parallelizable? | Test Count |
|------|------|-----------|----------------|------------|
| 3A | CycleStateMachine + tests | Phase 2 entities | Yes (with 3B, 3D, 3E) | 19 tests |
| 3B | Visibility strategies + VisibilityEnforcer + JwtFilter + tests | Phase 2 repos | Yes (with 3A, 3D, 3E) | 14 tests |
| 3D | All DTOs | Nothing (pure records) | Yes (with 3A, 3B, 3E) | 0 (compile only) |
| 3E | Exception types + GlobalExceptionHandler (ProblemDetail) | Nothing | Yes (with 3A, 3B, 3D) | 0 |
| 3C.1 | AuditService + tests | Phase 2 AuditEntry | **After 3A/3B/3D/3E** | 3 tests |
| 3C.2 | RcdoService + tests | AuditService | **After 3C.1** | 11 tests |
| 3C.3 | CycleService + tests | StateMachine, VisibilityEnforcer, AuditService | **After 3C.1** | 18 tests |
| 3C.4 | CommitmentService + tests | CycleService, VisibilityEnforcer, AuditService | **After 3C.3** | 35 tests |
| 3C.5 | ReconciliationService + tests | CommitmentService, CycleService | **After 3C.4** | 18 tests |
| 3C.6 | DashboardService + tests | CommitmentService, VisibilityEnforcer | **After 3C.4** | 14 tests |
| 3C.7 | CSV Importers (4 classes) + tests | RcdoService, CommitmentService | **After 3C.4** (4 importers can be parallelized with each other) | 16 tests |
| 4A | IntegrationTestBase + PersistingTestData | All services | **After all 3C** | 0 (infrastructure) |
| 4B.1 | CycleController + CycleLifecycleApiTest | CycleService | After 4A | 4 integration tests |
| 4B.2 | CommitmentController + CommitmentApiTest | CommitmentService | After 4A | 8 integration tests |
| 4B.3 | ReconciliationController + ReconciliationApiTest | ReconciliationService | After 4A | 4 integration tests |
| 4B.4 | DashboardController + DashboardApiTest | DashboardService | After 4A | 2 integration tests |
| 4B.5 | SecurityApiTest | All controllers | After 4B.1-4B.4 | 6 integration tests |
| 4B.6 | RcdoController | RcdoService | After 4A | (covered by integration tests) |
| 4B.7 | UserController | AppUserRepository | After 4A | (simple) |
| 4B.8 | CsvImportController + CsvImportApiTest | CSV Importers | After 4A | 3 integration tests |
| 4B.9 | Mappers | All DTOs + entities | After 4A | 0 (tested via integration) |

**Total estimated test count: ~148 unit tests + ~27 integration tests = ~175 tests**

---

### Critical Files for Implementation

- `/Users/js/dev/st6/docs/architecture.md` - Authoritative source for all API endpoints, state machine rules, visibility rules, and data model. Every implementation decision traces back to this document.
- `/Users/js/dev/st6/docs/requirements.md` - Business context that informs validation rules (bullet count 2-5, chess categories, completion horizons, RCDO hierarchy consistency constraint) and differentiator features (alignment signal, assignment attribution).
- `backend/src/main/java/com/st6/committracker/domain/cycle/CycleStateMachine.java` (to be created) - Foundation dependency for all services. Pure Java, no Spring. Must be implemented and fully tested before any service can proceed.
- `backend/src/main/java/com/st6/committracker/security/VisibilityEnforcer.java` (to be created) - Coordinator that delegates to per-role `VisibilityStrategy` implementations. Called by every service method. The strategy implementations (`ManagerVisibility`, `HierarchyVisibility`, `AnalystVisibility`) are the most security-critical code.
- `backend/src/test/java/com/st6/committracker/support/TestFixtures.java` + `PersistingTestData.java` (from Phase 2) - Every test depends on these. `TestFixtures.createStandardHierarchy()` and `createStandardRcdoTree()` must produce a realistic org structure that exercises all visibility paths.
---

## PHASE 5: Frontend Implementation

After Phase 4, the entire backend API is functional and tested. Phase 5 builds the frontend against it.

### Prerequisites (from Phases 1-4)

- Backend API fully functional with all endpoints from architecture doc section 3.3
- Testcontainers integration tests passing
- Frontend scaffold from Phase 1: Vite, TypeScript strict, Tailwind, React 18
- Frontend types and Zod schemas from Phase 2

---

### 5A: API Client Layer & Hooks (build first — all components depend on these)

**Parallelization note:** 5A and 5B can be built in parallel. 5C-5G depend on both.

#### 5A.1: API Client (`src/api/client.ts`)

**Completely replace** the Phase 1 stub. The Phase 1 `client.ts` was a minimal placeholder to verify the build pipeline — discard it entirely and write the production version below:

```typescript
// src/api/client.ts
import axios from 'axios';
import type { ApiResponse } from '@/types/api.types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor — reads token from AuthContext ref
let getToken: (() => string | null) | null = null;

export function setTokenProvider(provider: () => string | null) {
  getToken = provider;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — error normalization
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('st6:auth:expired'));
    }
    return Promise.reject(error);
  }
);

// Typed fetch helper — no Zod parsing, just type assertion.
// The backend is ours and TypeScript interfaces are the contract.
export async function fetchData<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export default apiClient;
```

#### 5A.2: API Modules

Each module wraps endpoints with typed functions:

**`src/api/commitments.api.ts`**
```
createCommitment(req: CreateCommitmentRequest): Promise<Commitment>
updateCommitment(id: string, req: UpdateCommitmentRequest): Promise<Commitment>
deleteCommitment(id: string): Promise<void>
getCommitments(cycleId: string, filters?: CommitmentFilters): Promise<Commitment[]>
reorderCommitments(cycleId: string, orderedIds: string[]): Promise<void>
```

**`src/api/cycles.api.ts`**
```
getCurrentCycle(): Promise<Cycle>
getCycle(id: string): Promise<Cycle>
listCycles(filters?: CycleFilters): Promise<PaginatedResponse<Cycle>>
transitionCycle(id: string, req: TransitionRequest): Promise<Cycle>
```

**`src/api/reconciliation.api.ts`**
```
getReconciliationView(cycleId: string): Promise<ReconciliationViewResponse>
// GET /api/v1/reconciliation/cycles/{cycleId}
reconcileCommitment(id: string, req: ReconcileCommitmentRequest): Promise<ReconciliationRecord>
// PUT /api/v1/reconciliation/commitments/{id}
completeReconciliation(cycleId: string): Promise<Cycle>
// POST /api/v1/reconciliation/cycles/{cycleId}/complete
```

**`src/api/dashboard.api.ts`**
```
getDashboard(filters?: DashboardFilters): Promise<DashboardResponse>
// Single endpoint returns composite response with teamRollup, alignmentSignal,
// assignmentAttribution, and rcdoCoverage sections.
```

**`src/api/rcdo.api.ts`**
```
getRcdoTree(): Promise<RcdoTree>
searchRallyCries(query: string): Promise<RallyCryNode[]>
searchDefiningObjectives(rallyCryId: string, query?: string): Promise<DefiningObjectiveNode[]>
searchOutcomes(definingObjectiveId: string, query?: string): Promise<OutcomeNode[]>
```

**`src/api/users.api.ts`**
```
getMe(): Promise<User>
getTeam(): Promise<User[]>
getOrgTree(): Promise<User[]>
```

#### 5A.3: TanStack Query Hooks

**`src/hooks/useCommitments.ts`**
- `useCommitments(cycleId)` — query key: `['commitments', cycleId]`, staleTime: 30s
- `useCreateCommitment(cycleId)` — mutation, invalidates `['commitments', cycleId]`
- `useUpdateCommitment(cycleId)` — mutation, invalidates `['commitments', cycleId]`
- `useDeleteCommitment(cycleId)` — mutation, invalidates `['commitments', cycleId]`
- `useReorderCommitments()` — mutation with **optimistic update**: immediately reorder cache, rollback on error
- `useCreateUnplannedCommitment(cycleId)` — mutation, calls `POST /api/v1/commitments/unplanned`, invalidates `['commitments', cycleId]` and `['reconciliation', cycleId]`

**`src/hooks/useCycle.ts`**
- `useCurrentCycle()` — query key: `['cycle', 'current']`, staleTime: 30s, refetchOnWindowFocus: true
- `useCycle(id)` — query key: `['cycle', id]`
- `useTransitionCycle()` — mutation, invalidates `['cycle']` and `['commitments']`

**`src/hooks/useReconciliation.ts`**
- `useReconciliationView(cycleId)` — query key: `['reconciliation', cycleId]`, staleTime: 30s
- `useReconcileCommitment(cycleId)` — mutation, invalidates `['reconciliation', cycleId]`
- `useCompleteReconciliation(cycleId)` — mutation, invalidates `['reconciliation', cycleId]` and `['cycle', 'current']`

**`src/hooks/useTeamDashboard.ts`**
- `useDashboard(filters)` — query key: `['dashboard', filters]`, staleTime: 60s
  Returns composite `DashboardResponse` with `.teamRollup`, `.alignmentSignal`, `.assignmentAttribution`, `.rcdoCoverage`

**`src/hooks/useRcdo.ts`**
- `useRcdoTree()` — query key: `['rcdo', 'tree']`, staleTime: 5min
- `useRcdoSearch(level, parentId, query)` — query key: `['rcdo', 'search', level, parentId, query]`, staleTime: 60s, keepPreviousData: true, enabled: query.length >= 1

**`src/hooks/useAuth.ts`**
- `useAuth()` — consumes AuthContext from host app, returns user, token, role

**`src/hooks/useDragPriority.ts`**
- Encapsulates @dnd-kit sensor setup, drag start/end handlers
- On drag end: compute new order, call `useReorderCommitments` with optimistic update
- Returns: sensors, handleDragStart, handleDragEnd, activeId

#### 5A.4: Zustand Store

**`src/stores/ui.store.ts`**
```typescript
interface UIStore {
  commitmentFormOpen: boolean;
  editingCommitmentId: string | null;
  activeDragId: string | null;
  dragOverIndex: number | null;
  dashboardFilters: DashboardFilters;

  openCommitmentForm: (commitmentId?: string) => void;
  closeCommitmentForm: () => void;
  setActiveDrag: (id: string | null) => void;
  setDragOverIndex: (index: number | null) => void;
  setDashboardFilters: (filters: Partial<DashboardFilters>) => void;
  resetDashboardFilters: () => void;
}
```

---

### 5B: Shared Components (parallel with 5A)

Build these generic components first — every feature view uses them:

| Component | Props | Behavior |
|---|---|---|
| `Layout.tsx` | `children` | Wrapper with `max-width: 1200px`, centered, padding |
| `PageHeader.tsx` | `title, subtitle?, actions?: ReactNode` | Title bar with optional action buttons |
| `EmptyState.tsx` | `message, actionLabel?, onAction?` | Centered message with optional CTA button |
| `LoadingSpinner.tsx` | `size?: 'sm' \| 'md' \| 'lg'` | Tailwind spinner animation |
| `ErrorBoundary.tsx` | `children, fallback?` | React error boundary with retry button |
| `ConfirmDialog.tsx` | `open, title, message, onConfirm, onCancel, confirmLabel?` | Modal with confirm/cancel |
| `Badge.tsx` | `label, variant: 'strategic' \| 'operational' \| 'defensive' \| 'capability' \| 'draft' \| 'locked' \| 'reconciling' \| 'reconciled'` | Color-coded pill badge |

---

### 5C: Commit Entry View

**Route:** `/` (default landing)

**Build order within this feature:**
1. `CommitmentCard.tsx` — display-only first
2. `CommitmentList.tsx` — static list, then add drag-and-drop
3. `HorizonSelector.tsx` — simplest form field
4. `CategorySelector.tsx` — radio group
5. `AssignmentAttribution.tsx` — toggle + dropdown
6. `TaskBulletEditor.tsx` — dynamic list
7. `RcdoAutocomplete.tsx` — most complex form field (cascading typeahead)
8. `CommitmentForm.tsx` — assembles all form fields
9. `CommitEntryPage.tsx` — page orchestrator

**Component details:**

**`CommitmentCard.tsx`**
- Props: `commitment: Commitment, cycleState: CycleState, onEdit: (id: string) => void, onDelete: (id: string) => void`
- Displays: title, RCDO breadcrumb, category badge, horizon chip, assignment indicator, priority rank
- Expandable: click to show task bullets
- Edit/Delete actions only visible when `cycleState === 'DRAFT'`
- Wrapped in `useSortable()` from @dnd-kit for drag handle

**`CommitmentList.tsx`**
- Props: `commitments: Commitment[], cycleState: CycleState`
- Wraps children in `<DndContext>` + `<SortableContext>` with vertical list strategy
- Renders `CommitmentCard` for each commitment
- Drag disabled when `cycleState !== 'DRAFT'`
- On drag end: calls `useDragPriority().handleDragEnd`
- Keyboard accessible: Tab to focus, Space to pick up, arrows to move

**`HorizonSelector.tsx`**
- Props: `value: CompletionHorizon, onChange: (h: CompletionHorizon) => void, disabled?: boolean`
- Five segmented buttons: Morning | Midday | Afternoon | EOD | EOW
- Active button highlighted with Tailwind `bg-blue-600 text-white`

**`CategorySelector.tsx`**
- Props: `value: ChessCategory | null, onChange: (c: ChessCategory) => void, disabled?: boolean`
- Radio group: Strategic | Operational | Defensive | Capability Building
- Each option color-coded to match dashboard chart colors
- Auto-suggestion: when RCDO link is set externally, suggest Strategic; when unlinked, suggest Operational

**`AssignmentAttribution.tsx`**
- Props: `value: AssignmentAttribution, onChange: (a: AssignmentAttribution) => void, disabled?: boolean`
- Toggle: "Self-directed" (default) or "Assigned by..."
- When "Assigned by" selected: dropdown populated from `useAuth().user` reporting chain
- Uses `useTeam()` hook to fetch potential assigners (managers in the chain)

**`TaskBulletEditor.tsx`**
- Props: `bullets: string[], onChange: (bullets: string[]) => void, disabled?: boolean, min?: number, max?: number`
- Dynamic list of single-line text inputs
- Add button (disabled at max, default 5)
- Remove button per bullet (disabled at min, default 2)
- Drag-sortable within the bullet list (@dnd-kit nested)
- Each input: placeholder "What's involved?"

**`RcdoAutocomplete.tsx`**
- Props: `value: RcdoLink, onChange: (link: RcdoLink) => void, disabled?: boolean`
- Three cascading comboboxes: Rally Cry → Defining Objective → Outcome
- Each combobox: text input + dropdown list
- Typing triggers debounced search (300ms) via `useRcdoSearch`
- Selecting a Rally Cry filters DOs; selecting a DO filters Outcomes
- User can stop at any level (partial linking valid)
- Bottom option always visible: "No strategic link (operational/other)" → sets all to null
- Recent selections pinned at top (stored in localStorage, keyed by userId + orgId)

**`CommitmentForm.tsx`**
- Props: `commitmentId?: string` (edit mode if provided), `onClose: () => void`
- Uses React Hook Form with Zod resolver (`CommitmentFormSchema`)
- Fields: title (text), RcdoAutocomplete, CategorySelector, HorizonSelector, TaskBulletEditor, AssignmentAttribution, description (textarea, optional)
- Submit: calls `useCreateCommitment` or `useUpdateCommitment`
- Validation: title required, min 2 bullets, category required, horizon required
- Loading state: submit button shows spinner while mutation is pending
- Error state: field-level errors from Zod, toast for API errors

**`CommitEntryPage.tsx`**
- Uses `useCurrentCycle()` for cycle state and metadata
- Uses `useCommitments(cycleId)` for commitment list
- Renders: PageHeader (week label + cycle state badge), CommitmentList, floating "Add Commitment" button
- "Add Commitment" button opens CommitmentForm (modal or slide-over)
- Button disabled with tooltip when cycle state !== DRAFT
- Loading: full-page LoadingSpinner while cycle loads
- Empty: EmptyState "No commitments yet" with "Create your first commitment" CTA

---

### 5D: Weekly Lifecycle View

**Route:** `/cycle`

**`CycleStateIndicator.tsx`**
- Props: `currentState: CycleState, transitions: StateTransition[]`
- Visual state machine: 4 dots/nodes connected by lines (DRAFT → LOCKED → RECONCILING → RECONCILED)
- Current state: enlarged, colored, pulsing
- Past states: filled, muted
- Future states: hollow, gray
- Below each node: timestamp of transition (from `transitions` array)

**`TransitionActions.tsx`**
- Props: `cycle: Cycle, commitmentCount: number`
- Context-dependent button:
  - DRAFT → "Lock Commitments" (primary button)
  - LOCKED → "Begin Reconciliation" (primary button)
  - RECONCILING → "Submit Reconciliation" (shown in ReconciliationPage, not here)
  - RECONCILED → no button, show "Cycle complete" message
- Each button triggers `ConfirmDialog` before calling `useTransitionCycle()`
- Disabled with tooltip if preconditions not met:
  - Lock: disabled if `commitmentCount === 0` → "Add at least one commitment"
- Loading: button shows spinner during mutation

**`CarryForwardPanel.tsx`**
- Props: `carriedItems: Commitment[]`
- Shown only when current cycle has items with `carriedFromCommitmentId !== null`
- List of carried items with: title, RCDO breadcrumb, "carried X times" counter
- Per-item: "Accept" (keeps in current cycle) / "Decline" (removes with reason prompt)
- If no carried items: "No items carried forward from previous cycle"

**`WeeklyLifecyclePage.tsx`**
- Uses `useCurrentCycle()` and `useCommitments(cycleId)`
- Renders: PageHeader, CycleStateIndicator, TransitionActions, CarryForwardPanel (conditional)
- Also shows CycleHistory (collapsible) — last 4-6 cycles with state + commitment count

---

### 5E: Reconciliation View

**Route:** `/reconciliation`

**`CommitmentStatusMarker.tsx`**
- Props: `value: ReconciliationStatus | null, onChange: (s: ReconciliationStatus) => void, disabled?: boolean`
- Segmented control / radio: Completed | Partially Completed | Not Started | Carried Forward
- Color-coded: green, yellow, red, blue

**`ChangeReasonCapture.tsx`**
- Props: `value: string, onChange: (s: string) => void, required: boolean, disabled?: boolean`
- Textarea: "What changed and why?"
- Required when status !== COMPLETED (form-level validation)
- Max 500 characters with counter

**`UnplannedWorkEntry.tsx`**
- Props: `cycleId: string, onAdd: () => void`
- "Add unplanned work" button → opens simplified CommitmentForm
- Calls `POST /api/v1/commitments/unplanned` (via `useCreateUnplannedCommitment()` hook)
- The backend sets `isUnplanned: true` and auto-creates a reconciliation record
- Requires reconciliation status selection (Completed, Partially Completed, etc.) at creation time
- RCDO linking still required

**`PlannedVsActualTable.tsx`**
- Props: `commitments: CommitmentWithReconciliation[]`
- Two-column layout per commitment:
  - Left (planned): title, RCDO, bullets, horizon — read-only
  - Right (actual): CommitmentStatusMarker, bullet checkboxes, ChangeReasonCapture
- Responsive: stacks vertically (planned above, actual below) under 768px

**`ReconciliationPage.tsx`**
- Uses `useReconciliationView(cycleId)` and `useCurrentCycle()`
- Guards: redirects to `/` if cycle state is not RECONCILING
- Renders: PageHeader, PlannedVsActualTable, UnplannedWorkEntry
- Bottom: ReconciliationSummary (X completed, Y partial, Z not started, W carried)
- "Submit Reconciliation" button — calls `useCompleteReconciliation()`
- Disabled if not all commitments have been reconciled

---

### 5F: Manager Dashboard

**Route:** `/dashboard`

**`DashboardFilters.tsx`**
- Props: `filters: DashboardFilters, onChange: (f: Partial<DashboardFilters>) => void`
- Fields: team member multi-select, RCDO dropdown (cascading), week selector, status filter, category filter
- Synced to URL query params for shareability
- "Reset" button clears all filters

**`AlignmentGapChart.tsx`** — THE key differentiator
- Props: `aggregate: AlignmentBreakdown, members: TeamMemberSummary[]`
- Recharts `<BarChart layout="vertical">` with `<Bar stackId="alignment">`
- Four stacked segments per bar:
  - Strategic: `#2563EB` (blue)
  - Operational: `#6B7280` (gray)
  - Defensive: `#DC2626` (red/amber)
  - Capability Building: `#059669` (teal)
- Top bar: aggregate (larger, bolder, labeled "Team Total")
- Below: one bar per team member (labeled with name)
- Hover tooltip: "Alice — 60% Strategic (3 of 5 commitments)"
- Click segment: filters TeamRollupTable to that member + category
- Responsive: stacks vertically on narrow viewports

**`AssignmentSignals.tsx`**
- Props: `signals: AssignmentSignal`
- Three summary cards:
  - "X% of team work is manager-assigned"
  - "Top assignee: [name] receives Y% of assignments" (dependency risk)
  - "Z total assignments this week"
- Cards color-coded: neutral if healthy, amber if concentration > 60%

**`TeamRollupTable.tsx`**
- Props: `members: TeamMemberSummary[], onSelectMember: (id: string) => void`
- Columns: Name | Cycle State | # Commitments | Strategic % | Operational % | Completion Rate (prior week) | Top RCDO
- Sortable by any column (client-side sort)
- Click row → expands inline `MemberCommitmentDetail`
- Responsive: horizontal scroll with sticky first column on narrow viewports

**`MemberCommitmentDetail.tsx`**
- Props: `userId: string, cycleId: string`
- Uses `useCommitments(cycleId, { userId })` to fetch member's commitments
- Read-only commitment list with all metadata
- If reconciled: shows planned vs actual summary inline

**`ManagerDashboardPage.tsx`**
- Guards: only accessible to MANAGER, DIRECTOR, VP, EXECUTIVE, ANALYST roles
- Uses `useDashboard(filters)` — single query returns all sections
- Renders: DashboardFilters, AlignmentGapChart, AssignmentSignals, TeamRollupTable
- Single loading state for entire dashboard (one network request)

---

### 5G: Chessboard View

**Route:** `/chessboard`

**`ChessboardCommitmentChip.tsx`**
- Props: `commitment: Commitment`
- Compact pill: title (truncated to 30 chars), horizon indicator dot
- Hover: popover with full title, RCDO breadcrumb, bullets, horizon
- Color intensity indicates horizon (darker = longer task)

**`ChessboardCell.tsx`**
- Props: `commitments: Commitment[], category: ChessCategory, priorityTier: string`
- Container for chips, subtle border, category color as left accent
- Empty cell: dashed border placeholder

**`ChessboardGrid.tsx`**
- Props: `commitments: Commitment[], categories: ChessCategory[]`
- CSS Grid layout
- X-axis: chess categories (4 columns)
- Y-axis: priority tiers — High (rank 1-2), Medium (rank 3-4), Low (rank 5+)
- Places each commitment in the correct cell based on its category and rank
- Responsive: `auto-fill` columns collapse from 4 → 2 → 1

**`ChessboardPage.tsx`**
- Uses `useCurrentCycle()` and `useCommitments(cycleId)`
- For managers: toggle between own view and any direct report's (dropdown)
- Read-only — no editing from this view
- Loading/empty states

---

### 5H: Frontend Tests

#### 5H.1: Test Infrastructure

Test config lives in `vite.config.ts` under the `test` key (Vitest). No separate jest.config needed.

**`src/test/setup.ts`**
```typescript
import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**`src/test/mocks/server.ts`** — MSW setup with `setupServer()`

**`src/test/mocks/handlers.ts`** — Default handlers for all API endpoints:
- `GET /api/v1/cycles/current` → returns mock DRAFT cycle
- `GET /api/v1/commitments` → returns mock commitment list
- `POST /api/v1/commitments` → returns created commitment
- `GET /api/v1/rcdo/tree` → returns mock RCDO hierarchy
- `GET /api/v1/dashboard` → returns mock composite dashboard (teamRollup, alignmentSignal, assignmentAttribution, rcdoCoverage)
- `GET /api/v1/users/me` → returns mock user
- `GET /api/v1/users/team` → returns mock direct reports

**`src/test/factories/`** — Factory functions returning typed test data:
- `commitmentFactory(overrides?)` → `Commitment`
- `cycleFactory(overrides?)` → `Cycle`
- `rcdoTreeFactory()` → `RcdoTree`
- `teamMemberFactory(overrides?)` → `TeamMemberSummary`
- `alignmentFactory(overrides?)` → `AlignmentBreakdown`

#### 5H.2: Component Tests

| Test File | Key Test Cases |
|---|---|
| `CommitmentForm.test.tsx` | Renders all fields; submits with valid data; shows validation errors for empty title; enforces min 2 bullets; calls createMutation on submit |
| `CommitmentList.test.tsx` | Renders commitment cards; drag reorder calls reorderMutation; drag disabled when cycle not DRAFT |
| `RcdoAutocomplete.test.tsx` | Searches on type; cascades DO options when RC selected; "unlinked" option clears selection |
| `HorizonSelector.test.tsx` | Renders 5 options; highlights selected; calls onChange |
| `CategorySelector.test.tsx` | Renders 4 options; auto-suggests based on RCDO link |
| `TaskBulletEditor.test.tsx` | Adds bullets up to max; removes down to min; reorders |
| `CycleStateIndicator.test.tsx` | Highlights current state; shows timestamps |
| `TransitionActions.test.tsx` | Shows correct button per state; disabled when preconditions not met; shows confirm dialog |
| `ReconciliationPage.test.tsx` | Redirects if not RECONCILING; renders planned vs actual; submit disabled until all reconciled |
| `AlignmentGapChart.test.tsx` | Renders stacked bars; shows correct percentages; click segment fires filter callback |
| `TeamRollupTable.test.tsx` | Renders row per member; sorts by column; expands detail on click |
| `AssignmentSignals.test.tsx` | Shows correct percentages; amber highlight when concentration > 60% |
| `ChessboardGrid.test.tsx` | Places commitments in correct cells; handles empty cells |

#### 5H.3: Zod Form Schema Tests

**`src/lib/__tests__/validation.test.ts`**
- `CreateCommitmentFormSchema` accepts valid commitment
- `CreateCommitmentFormSchema` rejects empty title
- `CreateCommitmentFormSchema` rejects fewer than 2 bullets
- `CreateCommitmentFormSchema` rejects more than 5 bullets
- `CreateCommitmentFormSchema` rejects invalid horizon value
- RCDO consistency: rejects outcome without defining objective
- `ReconcileCommitmentFormSchema` accepts valid reconciliation
- `ReconcileCommitmentFormSchema` validates status enum values

---

### Phase 5 Parallelization Map

```
5A (API client + hooks) ───┐
                           ├──► GATE: 5A MUST be complete and frozen before any view work starts.
5B (Shared components) ────┤    All views share useCurrentCycle(), useCommitments(), useAuth()
                           │    hooks. If hook signatures or query key patterns change mid-flight,
                           │    parallel view work produces incompatible code.
                           │
                           ├──► 5C (Commit Entry)      ─┐
                           ├──► 5D (Weekly Lifecycle)    │ These 5 CAN parallelize,
                           ├──► 5E (Reconciliation)      │ but ONLY after 5A+5B are
                           ├──► 5F (Manager Dashboard)   │ code-complete and committed.
                           └──► 5G (Chessboard)         ─┘

5H (Test infra) ──► written alongside 5C-5G
```

- **5A** is the critical path. All hooks, query keys, mutation invalidation patterns, and AuthContext shape must be finalized here. Once committed, these interfaces are frozen for the duration of 5C-5G.
- **5B** (Shared components) can be built in parallel with 5A.
- **5C through 5G** can be parallelized once 5A+5B are **complete and committed** — not before.
- **5C** (Commit Entry) is the most complex, allocate most time.
- **5F** (Dashboard) is the most important differentiator, prioritize polish.
- **5G** (Chessboard) is lowest priority — build last if time is tight.

---

## PHASE 6: Integration, Polish & Demo

### 6A: CSV Seed Data (Meridian Manufacturing)

#### 6A.1: Seed CSV Files

**`backend/src/main/resources/seed/organizations.csv`**
```csv
id,name,slug
1,Meridian Manufacturing,meridian-mfg
```

**`backend/src/main/resources/seed/users.csv`**

Covers all 6 UserRole values: EXECUTIVE, VP, DIRECTOR, MANAGER, EMPLOYEE, ANALYST.
Two manager subtrees enable cross-manager comparison on the dashboard.

```csv
id,org_id,email,display_name,role,manager_id
1,1,sarah.chen@meridian.com,Sarah Chen,EXECUTIVE,
2,1,raj.patel@meridian.com,Raj Patel,VP,1
3,1,marcus.wright@meridian.com,Marcus Wright,DIRECTOR,2
4,1,elena.rodriguez@meridian.com,Elena Rodriguez,MANAGER,3
5,1,james.okafor@meridian.com,James Okafor,EMPLOYEE,4
6,1,priya.sharma@meridian.com,Priya Sharma,EMPLOYEE,4
7,1,david.kim@meridian.com,David Kim,MANAGER,3
8,1,anna.mueller@meridian.com,Anna Mueller,EMPLOYEE,7
9,1,tom.jackson@meridian.com,Tom Jackson,EMPLOYEE,7
10,1,lisa.park@meridian.com,Lisa Park,ANALYST,
```

**`backend/src/main/resources/seed/rcdo_hierarchy.csv`**
```csv
rally_cry,defining_objective,outcome,owner_email
Operational Excellence,,,sarah.chen@meridian.com
Operational Excellence,Reduce Scrap Rate,,elena.rodriguez@meridian.com
Operational Excellence,Reduce Scrap Rate,Line 3 scrap audit complete,
Operational Excellence,Reduce Scrap Rate,New material spec approved,
Operational Excellence,Streamline QA Process,,david.kim@meridian.com
Operational Excellence,Streamline QA Process,Automated test station live,
Digital Transformation,,,marcus.wright@meridian.com
Digital Transformation,ERP Migration,,marcus.wright@meridian.com
Digital Transformation,ERP Migration,Vendor shortlist finalized,
Digital Transformation,AI Quality Inspection,,david.kim@meridian.com
Digital Transformation,AI Quality Inspection,CV model trained on defect dataset,
```

**`backend/src/main/resources/seed/commitments.csv`**
3 weeks of data across different states:
- Week 1 (2 weeks ago): RECONCILED — mix of completed, partial, carried forward
- Week 2 (last week): LOCKED — mix of strategic and operational
- Week 3 (current): DRAFT — in progress

Include: mix of chess categories, completion horizons, some manager-assigned, some self-directed, carry-forward chains

#### 6A.2: DataInitializer

**`backend/src/main/java/com/st6/committracker/seed/DataInitializer.java`**
- `@Component`, `@ConditionalOnProperty(name = "st6.seed.enabled", havingValue = "true")`
- Implements `ApplicationRunner`
- Checks if orgs table is empty before inserting (idempotent)
- Load order: orgs → users (two-pass for reports_to) → RCDO hierarchy → chess categories → cycles → commitments → task bullets → reconciliation records → state transitions
- Transactional: entire seed in one transaction
- Logs: `seed_started`, per-table counts, `seed_complete`

---

### 6B: End-to-End Flow Verification

Walk through manually AND verify via integration tests:

1. System boots with seed data → verify health check and data loaded
2. Login as James Okafor (employee) → sees current cycle in DRAFT
3. Create 3 commitments with RCDO links, categories, horizons, 3 bullets each
4. Reorder via drag-and-drop → verify rank persistence
5. Lock the cycle → verify LOCKED state, edit buttons disabled
6. Trigger reconciliation → verify RECONCILING state
7. Reconcile each commitment (1 completed, 1 partial with carry-forward, 1 not started)
8. Complete reconciliation → verify RECONCILED, carried item in next cycle
9. Login as Elena Rodriguez (manager) → see dashboard with alignment gap chart
10. Verify alignment percentages match the commitment data
11. Verify assignment attribution shows correct signals
12. Login as Lisa Park (analyst) → verify scoped read-only access

**Integration test:** `FullLifecycleIntegrationTest.java` — automates steps 1-12 against Testcontainers

---

### 6C: Production Polish

#### 6C.1: Error Handling Audit
Walk through every controller method and every frontend mutation. Verify:
- Backend: `GlobalExceptionHandler` maps exceptions to correct HTTP status
- Frontend: mutation `onError` callbacks surface user-friendly messages
- Key error cases: 409 on locked cycle edit, 400 on invalid RCDO, 401 on expired JWT, 403 on unauthorized access

#### 6C.2: Loading States
Every view handles loading with appropriate indicator:
- Full-page: `LoadingSpinner` (cycle load, reconciliation load)
- Inline: button spinners (mutations), skeleton placeholders (dashboard sections)
- Dropdown: "Loading..." placeholder (RCDO search, filter options)

#### 6C.3: Empty States
Every list handles zero items with `EmptyState` component and appropriate CTA

#### 6C.4: Form Validation Parity
Client-side Zod schemas match server-side Bean Validation:
- title: min 1, max 500
- description: max 2000
- bullets: min 2, max 5
- RCDO hierarchy consistency
- reconciliation notes: max 2000, required when status !== COMPLETED

#### 6C.5: Performance Review
- Verify no N+1 queries (use `@EntityGraph` or `JOIN FETCH` for commitments + bullets)
- Dashboard aggregation via SQL `GROUP BY`, not Java-side looping
- Frontend bundle size check — code-split feature routes with `React.lazy`
- TanStack Query cache stale times prevent excessive refetching

---

### 6D: Railway Deployment

Step-by-step:

1. `railway login && railway init` — create project "st6-weekly-commit"
2. Add Postgres plugin via Railway dashboard
3. Add backend service — root: `/backend`, builder: Dockerfile
4. Add frontend service — root: `/frontend`, builder: Dockerfile
5. Set environment variables:
   - Backend: `SPRING_PROFILES_ACTIVE=railway`, `ST6_SEED_ENABLED=true`, `ST6_CORS_ALLOWED_ORIGINS=<frontend-url>`
   - Frontend: `VITE_API_BASE_URL=<backend-url>/api/v1`
6. Deploy: `railway up` or push to main
7. Verify seed data loaded (check logs for `seed_complete`)
8. Set `ST6_SEED_ENABLED=false` and redeploy
9. Verify: health check, frontend loads, full demo flow works

---

### 6E: Rollout Readiness

The requirements specify "pilot → phased launch → full rollout, per-team activation." The current build supports **org-level activation** via the `is_active` flag on the `orgs` table — each portfolio company can be enabled independently. **Per-team activation within an org** is not built; it would require a `team` entity or a feature flag on `users` to gate access by reporting subtree. This is a Phase 2 enhancement — the org-level toggle is sufficient for pilot and phased launch across portfolio companies.

---

### 6F: Documentation

- `README.md` — project overview, quick start (docker compose + dev mode), demo users table, architecture summary
- `docs/demo-script.md` — step-by-step walkthrough for presenting to ST6
- `docs/open-questions.md` — chess layer taxonomy, analyst scoping, cycle cadence, auth integration

---

### 6G: Final Verification Checklist

| Check | Command / Action |
|---|---|
| Backend tests pass | `cd backend && ./gradlew check` |
| Frontend tests pass | `cd frontend && pnpm test` (runs vitest) |
| TypeScript strict passes | `cd frontend && pnpm typecheck` |
| ESLint passes | `cd frontend && pnpm lint` |
| Docker compose works | `docker compose up --build` → frontend loads at :3000 |
| Railway deploys | `railway up` → both services healthy |
| Seed data loads | Health check + verify demo data in UI |
| Full lifecycle flow | Walk through demo script steps 1-12 |
| Logging comprehensive | Tail Railway logs during demo, verify all 8 event types appear |
| Every spec requirement covered | Cross-check against requirements.md |

---

## Overall Phase Dependencies & Parallelization

```
PHASE 1 (Foundation) ──────────────────────────────────────────────────►
  Backend scaffold ──┐
  Frontend scaffold ─┤──► can be parallelized
  Docker/infra ──────┘

PHASE 2 (Entities + Types) ────────────────────────────────────────────►
  JPA entities + repo tests ──► SEQUENTIAL (FK dependency chain)
  Frontend types + Zod ────────► can parallelize with backend entity work

PHASE 3 (Business Logic) ─────────────────────────────────────────────►
  3A: State machine ───┐
  3B: Visibility strats │──► can parallelize these 4
  3D: DTOs ────────────│
  3E: Exceptions ──────┘
         │
         ▼
  3C.1: AuditService ──► 3C.2: RcdoService ──┐
                         3C.3: CycleService ──┤──► SEQUENTIAL CHAIN
                              │               │
                              ▼               │
                         3C.4: CommitmentSvc ─┤
                              │               │
                              ▼               │
                         3C.5: ReconcileSvc ──┤
                         3C.6: DashboardSvc ──┤──► 3C.5/3C.6/3C.7 can parallelize
                         3C.7: CSV Importers ─┘    (all depend on 3C.4, not each other)

PHASE 4 (API Controllers) ────────────────────────────────────────────►
  Test infra first ──► Controllers + integration tests
  Frontend API client (parallel with controllers)

PHASE 5 (Frontend) ────────────────────────────────────────────────────►
  5A (hooks) + 5B (components) ──► GATE: 5A must be frozen
                                       │
                                       ▼
                                   5C/5D/5E/5F/5G (parallelizable)

PHASE 6 (Integration) ─────────────────────────────────────────────────►
  6A (seed data) ──► 6B (E2E) ──► 6C (polish) ──► 6G (checklist)
  6D (Railway) ──► can start once Docker works
  6E (rollout readiness) ──► document only, no implementation
  6F (docs) ──► anytime
```

**Critical path:** Phase 1 → Phase 2 (sequential entities) → Phase 3A/3B → Phase 3C.1 → 3C.3 → 3C.4 → Phase 4 → Phase 5A (freeze) → Phase 5C/5F → Phase 6B → Phase 6G
