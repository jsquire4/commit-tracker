# ST6 Execution Observatory — Implementation Plan

**STATUS: COMPLETED (2026-03-18)**

All 6 waves implemented, audited, and complexity-swept. 183 unit tests passing. Frontend and backend build clean. Final audit: zero issues.

## Overview

Transform ST6 from a weekly commitment tracker into a PE turnaround execution observatory. This plan is structured as sequential waves with parallelizable tasks within each wave. Every wave has explicit gates that must pass before the next wave begins.

**Timeline:** ~10 working days
**Executor:** Claude (Sonnet agents for implementation, Opus for orchestration and review)
**Safety net:** `st6-baseline` copy exists at `/Users/js/dev/st6-baseline`

---

## Wave 1 — Fix Existing Bugs + Schema Extensions (Sequential Foundation)

**Purpose:** Fix known bugs that will interfere with new development, and extend the database schema for the observatory features. Everything in Wave 2+ depends on this.

**This wave is SEQUENTIAL — each task depends on the previous.**

### Task 1.1: Fix Existing Bugs (3 bugs) — DONE

All 3 bugs have been fixed and committed (commit `3ecf97e`). Changes:
- **Bug 1:** `ManagerDashboardPage` now uses `useCurrentCycle()` hook instead of hardcoded empty string.
- **Bug 2:** `RcdoLink` type updated with `rallyCryTitle`, `definingObjectiveTitle`, `outcomeTitle` fields. `CommitmentCard` renders titles with UUID fallback. All `RcdoLink` construction sites updated (`CommitmentForm`, `RcdoAutocomplete`, test factories).
- **Bug 3:** `ReconciliationPage` only redirects on `DRAFT`. `LOCKED`/`RECONCILED` show read-only with banner, submit button and unplanned work entry hidden.

**Note for subsequent tasks:** The `RcdoLink` type in `commitment.types.ts` already has title fields. Do NOT re-add them in Task 3.1.

---

### Task 1.2: Database Schema Extensions (Flyway Migrations)

**Purpose:** Add the tables and columns needed for observatory features. These MUST be created before any backend service code references them.

**Files to create (all in `backend/src/main/resources/db/migration/`):**

**V015__add_cost_band_and_capacity.sql**
```sql
-- Cost bands for role-tier weighting and dollar-denominated cost calculations
CREATE TABLE cost_bands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    name            TEXT NOT NULL,                    -- e.g. "L1 - Entry", "L5 - Senior Director"
    tier            INTEGER NOT NULL,                 -- numeric tier for ordering/weighting (1=lowest, higher=more senior)
    annual_cost     DECIMAL(12,2),                    -- optional dollar-denominated annual cost
    hourly_rate     DECIMAL(8,2),                     -- optional hourly rate for cost calculations
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

-- Add cost_band reference and capacity fields to users
ALTER TABLE users ADD COLUMN cost_band_id UUID REFERENCES cost_bands(id);
ALTER TABLE users ADD COLUMN weekly_capacity_hours DECIMAL(5,2) DEFAULT 40.0;

CREATE INDEX idx_cost_bands_org ON cost_bands(org_id);
CREATE INDEX idx_users_cost_band ON users(cost_band_id) WHERE cost_band_id IS NOT NULL;

CREATE TRIGGER trg_cost_bands_updated_at BEFORE UPDATE ON cost_bands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**V016__add_displacement_tracking.sql**
```sql
-- Displacement categories for reconciliation
-- When a commitment is NOT_STARTED or CARRIED_FORWARD, the employee can specify what displaced it
CREATE TYPE displacement_category AS ENUM (
    'MANAGER_REASSIGNED',      -- Manager assigned different work
    'PRODUCTION_EMERGENCY',    -- Unplanned production issue
    'RESOURCE_BLOCKED',        -- Waiting on someone/something
    'SCOPE_CHANGE',           -- Scope grew beyond original plan
    'DEPRIORITIZED',          -- Consciously deprioritized
    'EXTERNAL_DEPENDENCY',    -- Waiting on vendor/customer/external
    'OTHER'                   -- Free text explanation
);

-- Add displacement fields to reconciliation_records
ALTER TABLE reconciliation_records ADD COLUMN displacement_category VARCHAR(30)
    CHECK (displacement_category IS NULL OR displacement_category IN (
        'MANAGER_REASSIGNED', 'PRODUCTION_EMERGENCY', 'RESOURCE_BLOCKED',
        'SCOPE_CHANGE', 'DEPRIORITIZED', 'EXTERNAL_DEPENDENCY', 'OTHER'
    ));
ALTER TABLE reconciliation_records ADD COLUMN displacement_detail TEXT;
ALTER TABLE reconciliation_records ADD COLUMN displacing_commitment_id UUID REFERENCES commitments(id);

-- Index for aggregating displacement patterns
CREATE INDEX idx_reconciliation_displacement ON reconciliation_records(org_id, displacement_category)
    WHERE displacement_category IS NOT NULL;

-- IMPORTANT: The CREATE TYPE above is intentionally dropped here. The enum type is created only
-- as documentation of valid values. The actual column uses VARCHAR + CHECK constraint, which is
-- the project convention (see V001). Do NOT remove the DROP — it prevents a dangling type.
DROP TYPE IF EXISTS displacement_category;
```

**V017__add_portfolio_hierarchy.sql**
```sql
-- Portfolio: a group of organizations (portcos) managed by a PE firm
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link orgs to portfolios
ALTER TABLE orgs ADD COLUMN portfolio_id UUID REFERENCES portfolios(id);
CREATE INDEX idx_orgs_portfolio ON orgs(portfolio_id) WHERE portfolio_id IS NOT NULL;

CREATE TRIGGER trg_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**V018__add_observatory_config.sql**
```sql
-- Per-org configuration for observatory thresholds
-- All thresholds are configurable by the executive — no hardcoded defaults in the code
CREATE TABLE observatory_config (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                      UUID NOT NULL REFERENCES orgs(id) UNIQUE,

    -- Drift detection thresholds (number of weeks before signal is surfaced)
    drift_emerging_weeks        INTEGER NOT NULL DEFAULT 3,   -- "emerging pattern" threshold
    drift_sustained_weeks       INTEGER NOT NULL DEFAULT 6,   -- "sustained trend" threshold
    drift_structural_weeks      INTEGER NOT NULL DEFAULT 12,  -- "structural issue" threshold

    -- Alignment thresholds
    strategic_alignment_target  DECIMAL(5,2) NOT NULL DEFAULT 60.0,  -- target % strategic
    misalignment_warning_pct    DECIMAL(5,2) NOT NULL DEFAULT 40.0,  -- warn if strategic falls below

    -- Assignment thresholds
    dark_work_warning_pct       DECIMAL(5,2) NOT NULL DEFAULT 60.0,  -- warn if manager-assigned exceeds
    concentration_risk_pct      DECIMAL(5,2) NOT NULL DEFAULT 50.0,  -- warn if one person holds >X% of assignments

    -- Signal integrity
    uniformity_threshold        DECIMAL(5,2) NOT NULL DEFAULT 90.0,  -- flag if >90% same category across team

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_observatory_config_updated_at BEFORE UPDATE ON observatory_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**V019__add_effort_estimation.sql**
```sql
-- Effort estimation on commitments for cost-weighted analysis
ALTER TABLE commitments ADD COLUMN estimated_hours DECIMAL(5,2);

-- Commitment-level effort lets us compute: cost of misaligned work = estimated_hours × hourly_rate × misalignment_factor
```

**Gate:** Backend compiles. `./gradlew compileJava` passes. Flyway migrations run cleanly against a fresh database (start Docker, run backend with `st6.seed.enabled=false`, verify no errors).

### Task 1.3: Backend Entities for New Tables

**Purpose:** Create JPA entities, repositories, and builders for the new tables. These must exist before any service code references them.

**Files to create:**

1. **`backend/src/main/java/com/st6/committracker/domain/observatory/CostBand.java`**
   - Entity mapping to `cost_bands` table
   - Fields: id, org (ManyToOne to Org), name, tier, annualCost (BigDecimal), hourlyRate (BigDecimal), createdAt, updatedAt
   - Include builder pattern (consistent with existing entities like Org.java, Commitment.java)
   - equals/hashCode on id only (consistent with all other entities)

2. **`backend/src/main/java/com/st6/committracker/domain/observatory/CostBandRepository.java`**
   - `findByOrgIdOrderByTierAsc(UUID orgId)` — for listing bands in order
   - `findByOrgIdAndName(UUID orgId, String name)` — for CSV import deduplication

3. **`backend/src/main/java/com/st6/committracker/domain/observatory/ObservatoryConfig.java`**
   - Entity mapping to `observatory_config` table
   - All threshold fields as their appropriate Java types (int for weeks, BigDecimal for percentages)
   - Include builder with all defaults matching the migration defaults

4. **`backend/src/main/java/com/st6/committracker/domain/observatory/ObservatoryConfigRepository.java`**
   - `findByOrgId(UUID orgId)` — returns Optional, one config per org

5. **`backend/src/main/java/com/st6/committracker/domain/observatory/Portfolio.java`**
   - Entity mapping to `portfolios` table
   - Fields: id, name, slug, description, createdAt, updatedAt
   - Include builder

6. **`backend/src/main/java/com/st6/committracker/domain/observatory/PortfolioRepository.java`**
   - `findBySlug(String slug)`
   - `findAll()` — portfolio list for PE view

7. **Update `AppUser.java`** — add fields:
   ```java
   @ManyToOne(fetch = FetchType.LAZY)
   @JoinColumn(name = "cost_band_id")
   private CostBand costBand;                              // nullable

   @Column(name = "weekly_capacity_hours")
   private BigDecimal weeklyCapacityHours = new BigDecimal("40.0");
   ```
   Add getters/setters. No builder changes needed (AppUser doesn't use the builder pattern).

8. **Update `Org.java`** — add field:
   ```java
   @ManyToOne(fetch = FetchType.LAZY)
   @JoinColumn(name = "portfolio_id")
   private Portfolio portfolio;                             // nullable
   ```
   Add getter/setter. Update Org.Builder to include `portfolio`.

9. **Update `ReconciliationRecord.java`** — add fields:
   ```java
   @Enumerated(EnumType.STRING)
   @Column(name = "displacement_category")
   private DisplacementCategory displacementCategory;      // nullable

   @Column(name = "displacement_detail")
   private String displacementDetail;                      // nullable

   @ManyToOne(fetch = FetchType.LAZY)
   @JoinColumn(name = "displacing_commitment_id")
   private Commitment displacingCommitment;                // nullable
   ```
   Add getters/setters. Update Builder to include all 3 fields.

10. **Update `Commitment.java`** — add field:
    ```java
    @Column(name = "estimated_hours")
    private BigDecimal estimatedHours;                     // nullable
    ```
    Add getter/setter. Update Builder to include `estimatedHours`.

11. **Create `DisplacementCategory.java`** in `com.st6.committracker.domain` (same package as `CycleState`, `ReconciliationStatus`, `CompletionHorizon`, `UserRole` — all top-level domain enums live here):
    ```java
    package com.st6.committracker.domain;

    public enum DisplacementCategory {
        MANAGER_REASSIGNED, PRODUCTION_EMERGENCY, RESOURCE_BLOCKED,
        SCOPE_CHANGE, DEPRIORITIZED, EXTERNAL_DEPENDENCY, OTHER
    }
    ```

**Important:** The `ReconciliationRecord` entity currently uses `@Enumerated(EnumType.STRING)` for `status`. The new `displacementCategory` follows the same pattern — `@Enumerated(EnumType.STRING)` with the `DisplacementCategory` enum. Hibernate will store it as the VARCHAR string value, which the CHECK constraint in V016 validates.

**Existing test updates required:** The following existing tests construct `ReconciliationRecord` or `Commitment` entities and may need updated builders/constructors to compile after adding new fields:
- `ReconciliationServiceTest.java`
- `CommitmentServiceTest.java`
- `DashboardServiceTest.java`
- `CycleServiceTest.java`
- Test factory files in `frontend/src/test/factories/index.ts` (already updated for RcdoLink titles — add `estimatedHours: null` to the commitment factory)

**Gate:** `./gradlew compileJava` passes. All entities are wired correctly. No Hibernate mapping errors on startup.

### Wave 1 Audit Loop

Run `/audit` on all files created or modified in Wave 1. This includes:
- All 5 migration SQL files (V015–V019)
- All new entity files (CostBand, ObservatoryConfig, Portfolio, DisplacementCategory)
- All modified entity files (AppUser, Org, ReconciliationRecord, Commitment)
- All repository files (CostBandRepository, ObservatoryConfigRepository, PortfolioRepository)
- Bug fix files from Task 1.1 (already committed but verify no regressions)

**Audit scope:** Types, compilation, Hibernate mapping correctness, builder consistency, migration SQL syntax.

**Remediation:** Fix every issue from critical to low. Re-run audit until clean. Do NOT proceed to Wave 2 until the audit returns zero issues.

---

## Wave 2 — Observatory Backend Services (Parallelizable)

**Purpose:** Build the analytics and signal computation services. These are independent of each other and can be built in parallel.

**Prerequisite:** Wave 1 complete (schema, entities, bug fixes all done).

### Task 2.1: Cross-Cycle Analytics Service (PARALLEL)

**Files:**
- `backend/src/main/java/com/st6/committracker/domain/observatory/AnalyticsService.java` — main service
- `backend/src/main/java/com/st6/committracker/domain/observatory/CategoryUtils.java` — shared static helpers (category normalization, effort resolution)

**Purpose:** Compute metrics across multiple cycles for drift detection, trend analysis, and historical comparisons. This is the analytical engine that powers the executive view.

**Decomposition:** Extract `normalizeCategoryName()` and `resolveEffortHours()` into a separate `CategoryUtils` utility class. These are used by both AnalyticsService and DriftDetectionService — putting them in the service creates a coupling where DriftDetectionService needs to import AnalyticsService just for a static helper.

**Chess category name mapping — CRITICAL for all analytics:**

The `chess_categories` table stores category names as title-case strings: `"Strategic"`, `"Operational"`, `"Defensive"`, `"Capability Building"`. The frontend uses screaming-case enum keys: `STRATEGIC`, `OPERATIONAL`, etc. All analytics services must normalize category names to a canonical key for aggregation.

Create these as static methods in `CategoryUtils.java`:
```java
/** Normalize a chess category name to a canonical key for analytics aggregation.
 *  "Strategic" → "Strategic", "STRATEGIC" → "Strategic", null → "Uncategorized".
 *  The canonical form is title-case (matching the DB seed data convention).
 *  Frontend charts key on these exact strings — do not change the casing. */
static String normalizeCategoryName(String name) {
    if (name == null) return "Uncategorized";
    return switch (name.toUpperCase().replace(" ", "_")) {
        case "STRATEGIC" -> "Strategic";
        case "OPERATIONAL" -> "Operational";
        case "DEFENSIVE" -> "Defensive";
        case "CAPABILITY_BUILDING" -> "Capability Building";
        default -> name; // pass through custom categories as-is
    };
}
```

**Frontend must also use these canonical keys.** The existing `AlignmentGapChart.tsx` currently uses `STRATEGIC`, `OPERATIONAL`, etc. as distribution keys. When this service returns data, the keys will be `"Strategic"`, `"Operational"`, etc. (title-case). Task 4.2 and 5.1 must use these keys, NOT the screaming-case `ChessCategoryType` enum. Alternatively, the backend can return screaming-case keys — pick one and be consistent. **Decision: backend returns title-case (matching DB), frontend adapts.**

**This service must:**

1. **`computeAlignmentTrend(UUID orgId, int weekCount)`** — For the last N cycles, compute the strategic alignment percentage (strategic commitments / total commitments) per cycle. Return a list of `AlignmentDataPoint`.

   Implementation notes:
   - Get cycles via `cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)`, limit to weekCount
   - For each cycle, query `commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId)` and compute category distribution using `normalizeCategoryName(c.getChessCategory().getName())`
   - Return results ordered by startsAt ascending (chronological)

2. **`computeCompletionTrend(UUID orgId, int weekCount)`** — For each cycle, compute completion rate (completed reconciliation records / total commitments) and carry-forward rate. Return `CompletionDataPoint`.

   Implementation notes:
   - Requires joining reconciliation_records grouped by status per cycle
   - Use existing `ReconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus()`
   - Also compute total commitments per cycle for the denominator

3. **`computeTeamAlignmentTrend(UUID orgId, UUID managerId, int weekCount)`** — Same as alignment trend but scoped to a specific manager's team (direct reports or subtree). Uses `AppUserRepository.findSubtreeUserIds()` to get the team, then uses existing `commitmentRepository.findByUserIdInAndCycleId(userIds, cycleId)` to fetch commitments for the team in each cycle.

4. **`computeTeamCompletionTrend(UUID orgId, UUID managerId, int weekCount)`** — Per-manager completion trend. For the last N cycles, compute completion rate and carry-forward rate scoped to the manager's team. Returns `List<CompletionDataPoint>`.

   Implementation notes:
   - Get team user IDs via `AppUserRepository.findSubtreeUserIds(managerId)` (same as team alignment trend)
   - For each cycle, fetch commitments for the team via `commitmentRepository.findByUserIdInAndCycleId(userIds, cycleId)`
   - Fetch reconciliation records for those commitments — use `reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId)` and filter in-memory to team commitment IDs (or add a new repo method if performance warrants)
   - Compute: completionRate = COMPLETED count / total, carryForwardRate = CARRIED_FORWARD count / total
   - This method is called by `DriftDetectionService` for VELOCITY drift detection per manager

5. **`computeCarryForwardChains(UUID orgId, UUID cycleId)`** — For commitments in the given cycle, trace carry-forward chains backward using `Commitment.carriedFrom`. Return `CarryForwardChain`. A chain length of 4 means the item has been carried forward 4 times.

   Implementation notes:
   - Start from commitments in the target cycle where `carriedFrom != null`
   - Walk backward via `carriedFrom` until null (the original)
   - Count steps = chain length
   - This is an in-memory recursive walk, not a SQL CTE (the chain is typically short, 2-10 links)

5. **`computeCostWeightedMisalignment(UUID orgId, UUID cycleId)`** — For each user in the org, compute: (hours spent on non-strategic work) × (user's cost band tier or hourly rate). Return `CostWeightedSignal`.

   Implementation notes:
   - Join commitments with users, cost_bands
   - **Effort estimation fallback** — use `CategoryUtils.resolveEffortHours()` (shared utility, also used by seed generator):
     ```java
     /** Returns estimated hours for a commitment. Uses explicit value if set,
      *  otherwise falls back to horizon-based defaults. */
     public static BigDecimal resolveEffortHours(Commitment c) {
         if (c.getEstimatedHours() != null) return c.getEstimatedHours();
         return switch (c.getCompletionHorizon()) {
             case EOW -> new BigDecimal("8");
             case EOD -> new BigDecimal("4");
             case AFTERNOON -> new BigDecimal("2");
             case MIDDAY, MORNING -> new BigDecimal("1");
         };
     }
     ```
   - "Strategic" category → strategic hours; everything else → non-strategic hours (use `normalizeCategoryName`)
   - Multiply non-strategic hours by hourly_rate (or tier as a multiplier if no dollar rate)
   - Sort by misalignmentCost descending (worst offenders first)

**DTOs to create (all in `domain/observatory/dto/`):**

```java
public record AlignmentDataPoint(
    UUID cycleId, String cycleLabel, Instant startsAt,
    double strategicPct, double operationalPct,
    double defensivePct, double capabilityBuildingPct,
    int totalCommitments
) {}

public record CompletionDataPoint(
    UUID cycleId, String cycleLabel, Instant startsAt,
    double completionRate, double carryForwardRate, double notStartedRate,
    int totalCommitments, int reconciledCount
) {}

public record CarryForwardChain(
    UUID commitmentId, String title,
    UUID userId, String userDisplayName,
    int chainLength, String originCycleLabel
) {}

public record CostWeightedSignal(
    UUID userId, String displayName, String role,
    String costBandName, int costBandTier,
    BigDecimal totalHours, BigDecimal strategicHours, BigDecimal nonStrategicHours,
    BigDecimal misalignmentCost
) {}

public record TeamAlignmentTrend(
    UUID managerId, String managerName, String role,
    int teamSize, List<AlignmentDataPoint> dataPoints
) {}
```

**Test file:** `backend/src/test/java/com/st6/committracker/domain/observatory/AnalyticsServiceTest.java`
- Test `computeAlignmentTrend` with 3 cycles of seed data — verify correct percentages
- Test `computeCarryForwardChains` — create a 3-link chain, verify chainLength=3
- Test `computeCostWeightedMisalignment` — create 2 users with different cost bands, verify the higher-cost user's misalignment weighs more
- Use Mockito for repository mocking (consistent with existing tests like `DashboardServiceTest.java`)

---

### Task 2.2: Drift Detection Service (PARALLEL)

**Files:**
- `backend/src/main/java/com/st6/committracker/domain/observatory/DriftDetectionService.java` — main service
- `backend/src/main/java/com/st6/committracker/domain/observatory/TrendAnalyzer.java` — pure-function utility for the consecutive-decline algorithm

**Purpose:** Detect when organizational units are drifting away from strategic alignment over time. Uses the configurable thresholds from `ObservatoryConfig`.

**Decomposition:** The consecutive-decline algorithm is used for ALIGNMENT drift, VELOCITY drift, and potentially future metric types. Extract it into `TrendAnalyzer` as a pure static method that takes a `List<Double>` (metric values, chronological) and returns a `TrendResult(int consecutiveDeclineWeeks, double baselineValue, double currentValue, TrendDirection direction)`. This keeps `DriftDetectionService.detectDrift()` focused on orchestration (load config, iterate managers, classify severity) rather than containing the math inline.

```java
/** Pure analysis utility — no Spring dependencies, no repository access. Easily testable. */
public class TrendAnalyzer {

    public record TrendResult(int declineWeeks, double baselineValue,
                               double currentValue, TrendDirection direction) {}

    /** Count consecutive declining weeks from the most recent data point backward.
     *  tolerance = minimum absolute change to count as a decline (e.g., 2.0 for ±2%). */
    public static TrendResult analyzeDecline(List<Double> values, double tolerance) { ... }
}
```

Test `TrendAnalyzer` independently with unit tests — it's a pure function.

**This service must:**

1. **`detectDrift(UUID orgId)`** — Main entry point. Returns `DriftReport` containing a list of `DriftSignal` objects.

   A `DriftSignal` represents one detected drift pattern:
   - `unitType` (TEAM, MANAGER, ORG_UNIT) — what organizational unit is drifting
   - `unitId` (UUID) — the user ID of the manager/director whose unit is drifting
   - `unitName` (String) — display name
   - `metric` (ALIGNMENT, VELOCITY, COVERAGE) — what's drifting
   - `severity` (EMERGING, SUSTAINED, STRUCTURAL) — based on how many weeks the pattern has persisted
   - `currentValue` (double) — current metric value
   - `baselineValue` (double) — what it was at the start of the drift window
   - `weekCount` (int) — how many consecutive weeks the trend has been negative
   - `trendDirection` (DECLINING, FLAT, IMPROVING)
   - `dataPoints` — list of per-week values for sparkline rendering

   Implementation:
   - Load `ObservatoryConfig` for the org. If none exists, create one with all defaults from the migration (V018) and persist it.
   - Get all managers/directors in the org via `userRepository.findByOrgIdAndIsActiveTrue()`, filter to roles MANAGER, DIRECTOR, VP only (not EMPLOYEE, ANALYST, EXECUTIVE).
   - For each manager, call `AnalyticsService.computeTeamAlignmentTrend()` with `config.driftStructuralWeeks` as the weekCount (ensures enough data for the most severe classification).
   - **Drift detection:** For each manager, extract `strategicPct` values from the `AlignmentDataPoint` list, then call `TrendAnalyzer.analyzeDecline(values, 2.0)`. The returned `TrendResult` gives `declineWeeks`, `baselineValue`, `currentValue`, and `direction`.
   - Classify severity based on config thresholds:
     - `weekCount >= config.driftStructuralWeeks` → STRUCTURAL
     - `weekCount >= config.driftSustainedWeeks` → SUSTAINED
     - `weekCount >= config.driftEmergingWeeks` → EMERGING
     - `weekCount < config.driftEmergingWeeks` → don't surface (no signal emitted)
   - **VELOCITY drift:** Detect per-manager completion rate decline (not just org-level). For each manager in the same iteration loop, call `AnalyticsService.computeTeamCompletionTrend(orgId, managerId, weekCount)`. Extract `completionRate` values from the returned `CompletionDataPoint` list, call `TrendAnalyzer.analyzeDecline(values, 2.0)`. Same severity thresholds. This catches a team whose velocity is tanking even when the org average looks healthy.
   - **COVERAGE drift:** For each Rally Cry in the org, count how many consecutive recent cycles have zero commitments linked to it. If that count >= `config.driftEmergingWeeks`, emit a COVERAGE signal. Use `commitmentRepository.findByRallyCryIdAndCycleId()` for each cycle.

2. **`detectSignalIntegrity(UUID orgId, UUID cycleId)`** — Detect when data looks gamed.

   Returns `IntegrityReport` with list of `IntegrityFlag`:
   - `UNIFORM_CATEGORIZATION` — a team where >`config.uniformityThreshold`% of commitments have the same chess category. Flag includes: managerId, managerName, dominantCategory, percentage. Implementation: for each manager, get team commitments via `commitmentRepository.findByUserIdInAndCycleId()`, group by category, check if any single category exceeds the threshold.
   - `COMPLETION_MISMATCH` — a manager whose own commitments' strategic % diverges from their team's strategic % by **more than 20 percentage points**. E.g., manager is 90% Strategic but team is 60% Operational → divergence is 30pp → flag. Implementation: compute strategic % for manager's own commitments, compute strategic % for their direct reports' commitments, compare.
   - `DUPLICATE_NOTES` — reconciliation notes that are copy-pasted across multiple commitments by the same user. **Algorithm: exact string match after lowercasing and trimming whitespace.** Do NOT attempt fuzzy similarity — it's complex and exact duplicates are the strongest gaming signal anyway. Group all notes by userId, find any notes that appear 2+ times for the same user in the same cycle.

**DTOs:**
- `DriftReport.java` (record — list of DriftSignal, generatedAt timestamp)
- `DriftSignal.java` (record — all fields described above)
- `IntegrityReport.java` (record — list of IntegrityFlag)
- `IntegrityFlag.java` (record — type enum, userId, details map)

**Test file:** `backend/src/test/java/com/st6/committracker/domain/observatory/DriftDetectionServiceTest.java`
- Test with a team that has 5 weeks of declining strategic alignment — verify EMERGING signal at week 3
- Test with a team where 95% of commitments are Strategic — verify UNIFORM_CATEGORIZATION flag
- Test the threshold configurability — change config to 2-week emerging, verify signal appears earlier

---

### Task 2.3: Displacement Aggregation Service (PARALLEL)

**File:** `backend/src/main/java/com/st6/committracker/domain/observatory/DisplacementService.java`

**Purpose:** Aggregate displacement reasons across the organization. Surface recurring themes, not individual excuses.

**This service must:**

1. **`aggregateDisplacements(UUID orgId, int weekCount)`** — Query all reconciliation records with displacement data across the last N cycles. Group by `displacementCategory`, count occurrences, compute percentage of total displacements.

   Return `DisplacementSummary`:
   - `totalDisplacements` (int)
   - `byCategory` — list of `CategoryCount(category, count, percentage, topTeams)`
   - `topTeams` — for each category, which teams are most affected
   - `trend` — is displacement increasing or decreasing week over week?

2. **`getDisplacementsByManager(UUID orgId, UUID managerId, int weekCount)`** — Same aggregation but scoped to a specific manager's team. Shows what's displacing strategic work for their reports.

3. **`clusterDisplacementNotes(UUID orgId, int weekCount)`** — Group free-text displacement details by recurring phrases.

   **Use the simple approach — no NLP library, no TF-IDF, no fuzzy matching:**

   ```
   Algorithm:
   1. Load all ReconciliationRecords with non-null displacementDetail from the time window
   2. Group by displacementCategory first (this is the primary grouping)
   3. Within each category, extract 2-gram and 3-gram phrases:
      a. Lowercase the detail text
      b. Strip punctuation (replace non-alphanumeric with space, collapse multiple spaces)
      c. Remove these stop words: "the", "a", "an", "and", "or", "but", "in", "on",
         "at", "to", "for", "of", "with", "by", "from", "is", "was", "were", "been",
         "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
         "should", "may", "might", "shall", "can", "i", "we", "my", "our", "this", "that"
      d. Split into words, generate all 2-word and 3-word consecutive sequences
      e. Count frequency of each n-gram across all notes in this category
      f. Keep n-grams that appear 2+ times
   4. Each frequent n-gram becomes a NoteCluster:
      - theme = the n-gram text (e.g. "production line", "vendor delay")
      - representativeNotes = up to 3 original detail texts containing this n-gram
      - count = number of notes containing this n-gram
      - affectedTeams = distinct manager names of the users who wrote those notes
      - affectedUsers = distinct user display names
   ```

   Return `NoteCluster(theme, representativeNotes, count, affectedTeams, affectedUsers)`.

   This is intentionally simple. Even basic phrase extraction ("production line", "vendor delay", "scope change") is valuable at the executive level. Sophistication can be added later.

**DTOs:**
- `DisplacementSummary.java` (record)
- `CategoryCount.java` (record)
- `NoteCluster.java` (record)
- `ManagerDisplacementReport.java` (record)

**Test file:** `backend/src/test/java/com/st6/committracker/domain/observatory/DisplacementServiceTest.java`
- Test aggregation with 10 displacement records across 3 categories — verify correct counts/percentages
- Test note clustering with 5 notes containing "production line" and 3 containing "vendor delay" — verify 2 clusters

---

### Task 2.4: Update Reconciliation Service for Displacement (PARALLEL)

**Purpose:** Extend the existing reconciliation flow to accept displacement data.

**Files to modify:**
- `backend/src/main/java/com/st6/committracker/domain/reconciliation/dto/ReconcileRequest.java`
- `backend/src/main/java/com/st6/committracker/domain/reconciliation/ReconciliationService.java`
- `backend/src/main/java/com/st6/committracker/domain/reconciliation/dto/ReconciliationResponse.java`

**Changes:**
1. **ReconcileRequest** — add fields:
   - `displacementCategory` (String, nullable) — one of the DisplacementCategory enum values
   - `displacementDetail` (String, nullable, max 500 chars)
   - `displacingCommitmentId` (UUID, nullable) — reference to the commitment that took this one's place

2. **ReconciliationService.reconcileCommitment()** — when status is NOT_STARTED, PARTIALLY_COMPLETED, or CARRIED_FORWARD:
   - Save the displacement fields to the ReconciliationRecord
   - If `displacingCommitmentId` is provided, validate it exists and belongs to the same user/cycle
   - Log displacement in audit trail

3. **ReconciliationResponse** — add displacement fields:
   ```java
   // Add these fields to the existing ReconciliationResponse record:
   String displacementCategory,          // nullable — enum name as string
   String displacementDetail,            // nullable
   UUID displacingCommitmentId,          // nullable
   String displacingCommitmentTitle      // nullable — resolved title for display
   ```
   Update `ReconciliationController` where it constructs `ReconciliationResponse` to populate these from the `ReconciliationRecord` entity.

4. **ReconciliationViewResponse** — no structural change needed. It wraps `ReconciliationResponse` via `CommitmentReconciliationDetail`, so the displacement fields flow through automatically once `ReconciliationResponse` is updated.

**Test:** Update `ReconciliationServiceTest.java` — add test case that reconciles a commitment as CARRIED_FORWARD with displacement_category=MANAGER_REASSIGNED and verifies the fields are persisted.

---

### Task 2.5: Observatory REST Controller + Health Composer (PARALLEL)

**Files:**
- `backend/src/main/java/com/st6/committracker/domain/observatory/ObservatoryController.java` — thin REST controller, delegates to services
- `backend/src/main/java/com/st6/committracker/domain/observatory/ExecutiveHealthComposer.java` — composes the `/health` response from multiple services

**Purpose:** Expose observatory endpoints. The controller is thin — each endpoint is a 1-3 line method that calls a service and wraps in `ApiResponse`. The `/health` endpoint is the exception: it composes data from AnalyticsService + DriftDetectionService + integrity analysis into a single `ExecutiveHealthResponse`. That composition logic goes in `ExecutiveHealthComposer`, NOT in the controller method.

**`ExecutiveHealthComposer`** is a `@Service` with one public method:
```java
public ExecutiveHealthResponse computeHealth(UUID orgId, int weekCount) {
    // 1. Load config (or create default)
    // 2. Get alignment trend from AnalyticsService → extract most recent strategicPct
    // 3. Get completion trend → extract most recent completionRate, carryForwardRate
    // 4. Get drift report from DriftDetectionService → count signals
    // 5. Get integrity report → count flags
    // 6. For each VP/Director, build OrgUnitHealth using per-team alignment data
    // 7. Compute overall HealthGrade via computeGrade()
    // 8. Assemble and return ExecutiveHealthResponse
}
```
This keeps the controller method to: `return ApiResponse.of(healthComposer.computeHealth(orgId, weekCount));`

**Endpoints:**

```
GET  /api/v1/observatory/health          — Org-level execution health summary
GET  /api/v1/observatory/drift           — Drift report for the org
GET  /api/v1/observatory/alignment-trend  — Alignment trend data for sparklines
GET  /api/v1/observatory/completion-trend — Completion rate trend data
GET  /api/v1/observatory/cost-impact      — Cost-weighted misalignment report
GET  /api/v1/observatory/displacement     — Displacement aggregation report
GET  /api/v1/observatory/carry-chains     — Carry-forward chain analysis
GET  /api/v1/observatory/integrity        — Signal integrity flags
GET  /api/v1/observatory/config           — Get observatory config
PUT  /api/v1/observatory/config           — Update observatory config (EXECUTIVE only)

Portfolio endpoints (for multi-org):
GET  /api/v1/observatory/portfolio        — Portfolio-level health across all orgs
GET  /api/v1/observatory/portfolio/{orgId} — Drill into specific portco
```

**All endpoints:**
- Require DIRECTOR, VP, or EXECUTIVE role. Use the same pattern as all other controllers: `AppUser actor = SecurityContextHelper.getCurrentUser()` followed by a manual role check. Add a private `assertObservatoryAccess(AppUser actor)` method that throws `AccessDeniedException` if role is EMPLOYEE, MANAGER, or ANALYST.
- Accept `weekCount` query parameter with `@RequestParam(defaultValue = "12") int weekCount`. The default is always 12 — not from config. Config thresholds control drift sensitivity, not query scope.
- Accept `managerId` query parameter for team-scoped views
- Return data wrapped in `ApiResponse<T>` (consistent with all other controllers)
- Add `@Transactional(readOnly = true)` at class level (consistent with DashboardController)

**HealthGrade computation logic — used by both the `/health` endpoint and `OrgUnitHealth`:**

```java
/** Compute health grade from strategic alignment % using observatory config thresholds. */
static HealthGrade computeGrade(double strategicAlignmentPct, ObservatoryConfig config) {
    if (strategicAlignmentPct >= config.getStrategicAlignmentTarget().doubleValue()) {
        return HealthGrade.GREEN;
    } else if (strategicAlignmentPct >= config.getMisalignmentWarningPct().doubleValue()) {
        return HealthGrade.YELLOW;
    } else {
        return HealthGrade.RED;
    }
}
```

The overall org grade is computed from the org-wide alignment trend (most recent cycle's strategic %). Per-unit grades use each manager's team alignment.

**Composite health endpoint (`/health`)** returns:
```java
record ExecutiveHealthResponse(
    UUID orgId,
    String orgName,
    HealthGrade overallGrade,         // GREEN, YELLOW, RED
    double strategicAlignmentPct,
    double completionRate,
    double carryForwardRate,
    int activeDriftSignals,           // count of EMERGING+ drift signals
    int integrityFlags,               // count of integrity issues
    List<OrgUnitHealth> units,        // per director/VP breakdown
    Instant computedAt
) {}

record OrgUnitHealth(
    UUID managerId,
    String managerName,
    String role,
    int headcount,
    int costBandWeightedHeadcount,    // headcount weighted by cost band tier
    HealthGrade grade,
    double strategicAlignmentPct,
    double completionRate,
    String trendDirection,            // "improving", "stable", "declining"
    int weeksTrending                 // how many weeks in current direction
) {}

enum HealthGrade { GREEN, YELLOW, RED }
```

**Test file:** `backend/src/test/java/com/st6/committracker/domain/observatory/ObservatoryControllerTest.java`
- Integration test: call `/api/v1/observatory/health` as EXECUTIVE, verify response structure
- Test role guard: call as EMPLOYEE, verify 403

---

### Task 2.6: Portfolio Service (PARALLEL)

**File:** `backend/src/main/java/com/st6/committracker/domain/observatory/PortfolioService.java`

**Purpose:** Compute portfolio-level health across multiple organizations. This is the Superorg view.

**This service must:**

1. **`getPortfolioHealth(UUID portfolioId)`** — For each org in the portfolio, compute the executive health summary (reuse AnalyticsService). Return `PortfolioHealthResponse` with a list of `PortcoSummary(orgId, orgName, overallGrade, strategicAlignmentPct, completionRate, activeDriftSignals, headcount)`.

2. **`getPortfolioComparison(UUID portfolioId, int weekCount)`** — Compare alignment trends across portcos. Return sparkline data for each org so the PE MD can see which portcos are improving vs. declining.

**DTOs:**
- `PortfolioHealthResponse.java` (record)
- `PortcoSummary.java` (record)
- `PortfolioComparisonResponse.java` (record)

**Implementation note:** This service calls AnalyticsService for each org in the portfolio. If performance is a concern with many portcos, consider caching or materialized views later — but for the demo with 2-3 orgs, direct computation is fine.

**Gate for Wave 2:** `./gradlew test` — all existing tests still pass, all new tests pass. `./gradlew compileJava` clean. Manual review of service logic by Opus.

### Wave 2 Audit Loop

Run `/audit` on all files created or modified in Wave 2. This includes:
- All observatory service files (AnalyticsService, DriftDetectionService, DisplacementService, PortfolioService, ExecutiveHealthComposer, ObservatoryController)
- All utility files (CategoryUtils, TrendAnalyzer)
- All DTO record files in `domain/observatory/dto/`
- Modified reconciliation files (ReconcileRequest, ReconciliationService, ReconciliationResponse)
- All new test files
- All new repository methods added during Wave 2

**Audit scope:** Logic correctness, null safety, N+1 query patterns, test coverage, error handling, security (role guards on controller).

**Remediation:** Fix every issue from critical to low. Re-run audit until clean.

### >>> COMPLEXITY SWEEP #1 — After Wave 2 <<<

All backend logic now exists. The API surface is defined but not yet consumed by the frontend. This is the optimal time to catch:
- **Over-engineered abstractions** — services that are doing too much, unnecessary indirection layers
- **Brittle coupling** — services that depend on each other's internal implementation details
- **Redundant computation** — the same data being queried multiple times across services (AnalyticsService, DriftDetectionService, ExecutiveHealthComposer all touch alignment data)
- **Overly complex DTOs** — records with too many fields that could be split or simplified
- **TrendAnalyzer complexity** — is the consecutive-decline algorithm more complex than it needs to be?
- **CategoryUtils** — is the normalization logic correct and complete? Edge cases?
- **Note clustering algorithm** — is the n-gram approach in DisplacementService unnecessarily complex for the demo? Could a simpler group-by-category-only approach suffice?

Run `/complexity-sweep` targeting:
- `backend/src/main/java/com/st6/committracker/domain/observatory/`
- `backend/src/main/java/com/st6/committracker/domain/reconciliation/`

If the sweep identifies issues, fix them before proceeding to Wave 3. The frontend will cement whatever API shape exists at that point — cleaning up the backend after the frontend is built means changing both layers.

---

## Wave 3 — Frontend Types, API, and Hooks (Sequential, Fast)

**Purpose:** Create the TypeScript types, API modules, and React Query hooks that the UI will consume. This is a thin layer — fast to build, but must be correct because every component depends on it.

**This wave is SEQUENTIAL within itself. It CANNOT start until all Wave 2 DTOs are finalized** (Tasks 2.1-2.6 must have their record definitions committed). The service implementation can still be in progress, but the DTO shapes must be locked. If a Wave 2 agent changes a DTO after Wave 3 types are written, the types will be wrong.

### Task 3.1: Frontend Types for Observatory

**File:** `frontend/src/types/observatory.types.ts`

Mirror all the DTOs from Wave 2 as TypeScript interfaces. The backend record definitions in Task 2.1/2.2/2.3/2.5 are the source of truth for field names and types. Include:
- `ExecutiveHealthResponse`, `OrgUnitHealth`, `HealthGrade` (type union: `'GREEN' | 'YELLOW' | 'RED'`)
- `DriftReport`, `DriftSignal`, `DriftSeverity` (`'EMERGING' | 'SUSTAINED' | 'STRUCTURAL'`), `DriftMetric` (`'ALIGNMENT' | 'VELOCITY' | 'COVERAGE'`), `TrendDirection` (`'DECLINING' | 'FLAT' | 'IMPROVING'`)
- `AlignmentDataPoint`, `CompletionDataPoint`
- `CarryForwardChain`
- `CostWeightedSignal`
- `DisplacementSummary`, `CategoryCount`, `NoteCluster`
- `IntegrityReport`, `IntegrityFlag`
- `ObservatoryConfig` (for the settings form)
- `PortfolioHealthResponse`, `PortcoSummary`
- `DisplacementCategory` type union: `'MANAGER_REASSIGNED' | 'PRODUCTION_EMERGENCY' | 'RESOURCE_BLOCKED' | 'SCOPE_CHANGE' | 'DEPRIORITIZED' | 'EXTERNAL_DEPENDENCY' | 'OTHER'`

Also update `frontend/src/types/index.ts` to add `export * from './observatory.types';`

**Chess category key convention:** The backend analytics services return category names in title-case (`"Strategic"`, `"Operational"`, etc.) to match the DB. The `AlignmentDataPoint` type has fields `strategicPct`, `operationalPct`, etc. — these are numeric fields, not keyed by category name. The existing frontend `AlignmentGapChart.tsx` uses `STRATEGIC` (screaming-case) as keys in its distribution map. When building new observatory charts that consume `AlignmentDataPoint`, use the numeric percentage fields directly — no key mapping needed.

Update existing types:
- `reconciliation.types.ts` — add displacement fields to `ReconcileCommitmentRequest`: `displacementCategory?: DisplacementCategory`, `displacementDetail?: string`, `displacingCommitmentId?: string`. Also add fields to `ReconciliationRecord`: `displacementCategory`, `displacementDetail`, `displacingCommitmentId`, `displacingCommitmentTitle`.
- `commitment.types.ts` — add `estimatedHours: number | null` to `Commitment`. **DO NOT re-add title fields to `RcdoLink` — already done in Bug 2 fix.**
- `user.types.ts` — add `costBandId: string | null`, `costBandName: string | null`, `costBandTier: number | null`, `weeklyCapacityHours: number | null` to `User`

### Task 3.2: Observatory API Module

**File:** `frontend/src/api/observatory.api.ts`

```typescript
const BASE = '/api/v1/observatory';

export async function getExecutiveHealth(weekCount?: number): Promise<ExecutiveHealthResponse>
export async function getDriftReport(weekCount?: number): Promise<DriftReport>
export async function getAlignmentTrend(weekCount?: number, managerId?: string): Promise<AlignmentDataPoint[]>
export async function getCompletionTrend(weekCount?: number): Promise<CompletionDataPoint[]>
export async function getCostImpact(cycleId?: string): Promise<CostWeightedSignal[]>
export async function getDisplacementReport(weekCount?: number): Promise<DisplacementSummary>
export async function getCarryChains(cycleId: string): Promise<CarryForwardChain[]>
export async function getIntegrityReport(cycleId?: string): Promise<IntegrityReport>
export async function getObservatoryConfig(): Promise<ObservatoryConfig>
export async function updateObservatoryConfig(config: Partial<ObservatoryConfig>): Promise<ObservatoryConfig>
export async function getPortfolioHealth(): Promise<PortfolioHealthResponse>
```

### Task 3.3: Observatory Hooks

**File:** `frontend/src/hooks/useObservatory.ts`

Create React Query hooks wrapping each API call:
- `useExecutiveHealth(weekCount?)` — staleTime: 60s
- `useDriftReport(weekCount?)` — staleTime: 60s
- `useAlignmentTrend(weekCount?, managerId?)` — staleTime: 60s
- `useCompletionTrend(weekCount?)` — staleTime: 60s
- `useCostImpact(cycleId?)` — staleTime: 60s
- `useDisplacementReport(weekCount?)` — staleTime: 60s
- `useCarryChains(cycleId)` — staleTime: 30s
- `useIntegrityReport(cycleId?)` — staleTime: 60s
- `useObservatoryConfig()` — staleTime: 5min
- `useUpdateObservatoryConfig()` — mutation, invalidates config query
- `usePortfolioHealth()` — staleTime: 60s

**Gate:** `pnpm typecheck` passes. `pnpm build` passes.

### Wave 3 Audit Loop

Run `/audit` on all files created or modified in Wave 3. This includes:
- `frontend/src/types/observatory.types.ts`
- `frontend/src/api/observatory.api.ts`
- `frontend/src/hooks/useObservatory.ts`
- Modified type files (reconciliation.types.ts, commitment.types.ts, user.types.ts)
- Updated `frontend/src/types/index.ts`

**Audit scope:** Type correctness (do TS interfaces match backend DTOs exactly?), API function signatures, hook query key uniqueness, staleTime consistency, missing error handling.

**Remediation:** Fix every issue from critical to low. Re-run audit until clean. Do NOT proceed to Wave 4 until clean — every frontend component depends on these types being correct.

---

## Wave 4 — Frontend Views (Parallelizable)

**Purpose:** Build the executive observatory UI. These are independent pages/components that can be built in parallel.

**Prerequisite:** Waves 1-3 complete.

### Task 4.1: Executive Health Dashboard (PARALLEL)

**File:** `frontend/src/features/observatory/ExecutiveHealthPage.tsx`

**This is the main executive view — the cockpit.**

**Layout:**
- Top bar: Org name, current cycle label, last computed timestamp
- Health grade display: Large GREEN/YELLOW/RED indicator with the overall strategic alignment %
- Org unit cards: Grid of cards, one per VP/Director unit. Each card shows:
  - Manager name and role
  - Headcount (weighted by cost band tier)
  - Health grade (color-coded)
  - Strategic alignment % with a mini sparkline (last 6-12 weeks)
  - Trend direction arrow (improving/stable/declining)
  - Click to drill down

- Active drift signals section: Only shown when signals exist. List of DriftSignal items, sorted by severity (STRUCTURAL first). Each shows: unit name, metric, severity badge, current vs. baseline values, week count.

- Integrity flags section: Only shown when flags exist. Subtle but visible — shows data quality concerns.

**User flow:**
1. EXECUTIVE or VP logs in → navigates to Observatory (new nav item)
2. Sees org health at a glance — immediately knows if intervention is needed
3. Clicks on a unit card → drills into team-level detail (Task 4.3)
4. Sees drift signals → understands what's trending wrong and for how long
5. Sees integrity flags → knows where data might be unreliable

**Components to create:**
- `ExecutiveHealthPage.tsx` — main page
- `HealthGradeIndicator.tsx` — large GREEN/YELLOW/RED badge with percentage
- `OrgUnitCard.tsx` — individual unit health card with sparkline
- `DriftSignalList.tsx` — list of active drift signals
- `IntegrityFlagList.tsx` — list of integrity concerns

**Styling:** Dark mode (already configured). Use existing Tailwind patterns from the codebase. Cards should have subtle borders, the health grade should be prominent.

**HealthGradeIndicator component:**
- Render as a large (w-20 h-20) rounded-full div with background color: GREEN → `bg-green-500`, YELLOW → `bg-amber-500`, RED → `bg-red-500`
- Center the strategic alignment percentage inside in white bold text (text-2xl)
- Below the circle, show the grade label text in the corresponding color

**Sparkline pattern** (Recharts — used inside OrgUnitCard, ~80px wide × 32px tall):
```tsx
<ResponsiveContainer width={80} height={32}>
  <LineChart data={dataPoints}>
    <Line type="monotone" dataKey="strategicPct" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
  </LineChart>
</ResponsiveContainer>
```
No axes, no tooltip, no grid — just the line. This is a visual indicator, not an interactive chart.

**Org unit cards layout:** Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Each card is a clickable div that navigates to `/observatory/team/:managerId`.

**Test:** `frontend/src/features/observatory/__tests__/ExecutiveHealthPage.test.tsx` — render with mock data, verify all sections appear, verify drill-down navigation.

---

### Task 4.2: Alignment Trend View (PARALLEL)

**File:** `frontend/src/features/observatory/AlignmentTrendChart.tsx`

**Purpose:** Show the week-over-week strategic alignment trend as a full chart with sparklines.

**This component:**
- Renders a Recharts AreaChart showing alignment % by category over time
- X-axis: week labels (chronological)
- Y-axis: percentage (0-100%)
- Stacked areas for Strategic, Operational, Defensive, Capability Building
- Overlay line showing the strategic alignment target (from config)
- Tooltip showing exact values for each week
- Can be scoped to: whole org, specific manager's team, individual user
- Supports configurable week count (dropdown: 4, 8, 12, 26, 52 weeks)

**Props:** `managerId?: string`, `weekCount?: number`, `showTarget?: boolean`

**Recharts usage pattern (from existing AlignmentGapChart.tsx):**
```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
```

---

### Task 4.3: Team Drill-Down View (PARALLEL)

**Purpose:** When the executive clicks an org unit card, show detailed team-level analytics.

**Decomposition — this is a complex page. Do NOT build as a single file.** Split into a page shell + 5 section components:

**Files to create:**
- `frontend/src/features/observatory/TeamDrillDown.tsx` — page shell (data fetching, layout, navigation)
- `frontend/src/features/observatory/CompletionTrendChart.tsx` — completion rate area chart
- `frontend/src/features/observatory/CostImpactTable.tsx` — sortable cost impact table
- `frontend/src/features/observatory/DisplacementReport.tsx` — category bar chart + note clusters
- `frontend/src/features/observatory/CarryForwardChainList.tsx` — carry chain list
- `frontend/src/features/observatory/DarkWorkAttribution.tsx` — manager-assigned vs self-directed chart

**`TeamDrillDown.tsx` (page shell, ~80 lines):**
- Use `useParams()` to get `managerId` from the route
- Fetch all data: `useAlignmentTrend(12, managerId)`, `useCompletionTrend(12)`, `useCostImpact(cycleId)`, `useDisplacementReport(12)`, `useCarryChains(cycleId)`
- Handle loading (single `<LoadingSpinner>`) and error states
- Render navigation: back button (← Observatory) and breadcrumb (Observatory > [Manager Name])
- Layout: single-column `<div className="flex flex-col gap-6">`, each section as a self-contained component:
  ```tsx
  <PageHeader title={managerName} badge={<Badge>{role}</Badge>} />
  <AlignmentTrendChart managerId={managerId} weekCount={12} showTarget />
  <CompletionTrendChart data={completionData} />
  <CostImpactTable signals={costSignals} />
  <DisplacementReport summary={displacementData} />
  <CarryForwardChainList chains={carryChains} />
  <DarkWorkAttribution commitments={commitments} />
  ```

**`CompletionTrendChart.tsx` (~60 lines):**
- Recharts `<AreaChart>` with same dimensions/styling as AlignmentTrendChart
- Two stacked areas: completion rate (green) and carry-forward rate (amber)
- X-axis: week labels, Y-axis: 0-100%
- Props: `data: CompletionDataPoint[]`

**`CostImpactTable.tsx` (~120 lines):**
- HTML `<table>` (same pattern as `TeamRollupTable`)
- Columns: Name, Role, Cost Band, Total Hours, Strategic Hours, Non-Strategic Hours, Misalignment Cost ($)
- Sortable by any column — **extract `SortableHeader` from `TeamRollupTable.tsx` into `frontend/src/components/SortableHeader.tsx`** so both tables can reuse it. Currently it's defined inline inside TeamRollupTable.
- Default sort: misalignment cost descending
- Props: `signals: CostWeightedSignal[]`

**`DisplacementReport.tsx` (~100 lines):**
- Two sub-sections side-by-side on desktop (`grid grid-cols-1 lg:grid-cols-2`)
- Left: Recharts horizontal `<BarChart>` showing displacement count by category
- Right: Note clusters as a simple list. Each cluster: theme phrase bold, count, up to 3 representative notes indented italic
- Props: `summary: DisplacementSummary`

**`CarryForwardChainList.tsx` (~50 lines):**
- List of items carried >2 times
- Each item: commitment title, chain length badge (e.g., "Carried 4 weeks"), origin cycle label, user name
- Sorted by chain length descending
- Props: `chains: CarryForwardChain[]`

**`DarkWorkAttribution.tsx` (~80 lines):**
- Recharts stacked `<BarChart layout="vertical">`
- Two bars per team member: "Manager-Assigned" and "Self-Directed", each subdivided by chess category color
- Color scheme: Strategic=#2563EB, Operational=#6B7280, Defensive=#DC2626, Capability=#059669
- Props: `commitments: Commitment[]` — computes attribution breakdown internally

---

### Task 4.4: Displacement Tracking UI (PARALLEL)

**Purpose:** Update the reconciliation flow to capture displacement data.

**Decomposition:** `PlannedVsActualTable.tsx` is already 275 lines. Do NOT add displacement UI inline — create a new component.

**Files to create:**
- `frontend/src/features/reconciliation/DisplacementCapture.tsx` — self-contained displacement capture section

**Files to modify:**
- `frontend/src/features/reconciliation/PlannedVsActualTable.tsx` — import and render `<DisplacementCapture>` below the notes field when status warrants it

**`DisplacementCapture.tsx` (~80 lines):**
Props: `value: { category: DisplacementCategory | null, detail: string, displacingCommitmentId: string | null }`, `onChange: (v) => void`, `cycleCommitments: Commitment[]` (for the "which commitment" dropdown), `currentCommitmentCreatedAt: string` (for filtering candidates), `disabled: boolean`.

When status is NOT_STARTED, PARTIALLY_COMPLETED, or CARRIED_FORWARD, `PlannedVsActualTable`'s `CommitmentRow` renders:
```tsx
{isReasonRequired && (
  <DisplacementCapture value={...} onChange={...} cycleCommitments={...} disabled={row.saving} />
)}
```

**`DisplacementCapture` renders:**

1. **"What displaced this?"** — dropdown with DisplacementCategory options:
   - Manager reassigned me to other work
   - Production emergency
   - Blocked on resources
   - Scope changed
   - Deprioritized
   - External dependency
   - Other

2. **"Which commitment took its place?"** (optional) — `<select>` dropdown populated from the same cycle's commitments (already available in the reconciliation view data — `commitments` array from `ReconciliationViewResponse`). Filter to show only commitments that were created after the current commitment (`createdAt` comparison) OR that are marked as unplanned (`isUnplanned === true`). Sort by creation date descending (newest first). Display format: commitment title (truncated to 60 chars). No priority ordering by assignment type — keep it simple.

3. **"Details"** (optional free text) — 500 char limit, same pattern as ChangeReasonCapture.

**The data flows through** the existing reconcile API with the new displacement fields.

**UX principle:** This should feel like a natural extension of the reconciliation flow, not a separate step. The displacement section only appears when the status warrants it.

---

### Task 4.5: Observatory Config Page (PARALLEL)

**File:** `frontend/src/features/observatory/ObservatoryConfigPage.tsx`

**Purpose:** Allow EXECUTIVE users to configure drift thresholds.

**Form fields (all numeric inputs with descriptions):**
- Drift emerging threshold (weeks) — "How many weeks of declining alignment before flagging as an emerging pattern?"
- Drift sustained threshold (weeks) — "How many weeks before escalating to sustained trend?"
- Drift structural threshold (weeks) — "How many weeks before marking as structural issue?"
- Strategic alignment target (%) — "Target percentage of work that should be strategic"
- Misalignment warning threshold (%) — "Warn when strategic work falls below this percentage"
- Dark work warning threshold (%) — "Warn when manager-assigned work exceeds this percentage"
- Concentration risk threshold (%) — "Warn when one person holds more than this percentage of assignments"
- Uniformity threshold (%) — "Flag teams where categorization is more uniform than this percentage"

**Save button** calls `updateObservatoryConfig()`. Success toast. Auto-refreshes drift report.

**Access:** EXECUTIVE role only. Other roles see a "contact your administrator" message.

---

### Task 4.6: Portfolio View (PARALLEL)

**File:** `frontend/src/features/observatory/PortfolioPage.tsx`

**Purpose:** PE managing director view across all portfolio companies.

**Layout:**
- Portfolio name at top
- Grid of portco cards, each showing:
  - Org name
  - Health grade (large, color-coded)
  - Strategic alignment % with sparkline
  - Headcount
  - Active drift signals count
  - Click to navigate to that org's executive health view

- Comparison chart: Overlay alignment trends for all portcos on one chart (different colored lines). This immediately shows which portcos are improving and which are declining.

**Navigation:** This is the top-level view for PE users. Links to individual org observatory pages.

---

### Task 4.7: Navigation and Routing Updates (PARALLEL)

**Files to modify:**
- `frontend/src/App.tsx` — add routes for new pages
- `frontend/src/components/Layout.tsx` — add Observatory nav item (role-gated)

**New routes:**
```tsx
<Route path="/observatory" element={<ExecutiveHealthPage />} />
<Route path="/observatory/team/:managerId" element={<TeamDrillDown />} />
<Route path="/observatory/config" element={<ObservatoryConfigPage />} />
<Route path="/observatory/portfolio" element={<PortfolioPage />} />
<Route path="/reconciliation/:cycleId" element={<ReconciliationPage />} />
```

**ReconciliationPage update for cycle-specific routing:** The existing `ReconciliationPage` always uses `useCurrentCycle()`. Add support for an optional `:cycleId` route param. When present, fetch that specific cycle via `useCycle(cycleId)` instead of `useCurrentCycle()`. This enables linking to historical reconciliation data from the observatory drill-down views.

```tsx
const { cycleId: routeCycleId } = useParams();
const currentCycleQuery = useCurrentCycle();
const specificCycleQuery = useCycle(routeCycleId ?? '');
const cycle = routeCycleId ? specificCycleQuery.data : currentCycleQuery.data;
```

**Nav item:** "Observatory" — only visible to DIRECTOR, VP, EXECUTIVE roles. Use `useAuth()` hook to check role. Position it as the first nav item for those roles (most important view). In `Layout.tsx`, conditionally render the nav item:
```tsx
const { role } = useAuth();
const showObservatory = role && ['DIRECTOR', 'VP', 'EXECUTIVE'].includes(role);
```

**Shared component extraction (do during Wave 4, before Task 4.3):**
- Extract `SortableHeader` from `frontend/src/features/manager-dashboard/TeamRollupTable.tsx` into `frontend/src/components/SortableHeader.tsx`. Update `TeamRollupTable` to import from the shared location. `CostImpactTable` (Task 4.3) will also import it.

**Gate for Wave 4:** `pnpm typecheck && pnpm build` passes. All pages render without errors. Manual click-through of the full user flow: Executive Health → Org Unit Drill-Down → back. Reconciliation flow with displacement tracking.

### Wave 4 Audit Loop

Run `/audit` on all files created in Wave 4. This includes:
- All observatory page and component files (~15 files in `features/observatory/`)
- `DisplacementCapture.tsx` in `features/reconciliation/`
- Modified files: `PlannedVsActualTable.tsx`, `App.tsx`, `Layout.tsx`
- Extracted `SortableHeader.tsx` in `components/`
- Modified `TeamRollupTable.tsx` (SortableHeader extraction)

**Audit scope:** Component correctness, dark mode styling consistency, accessibility (aria labels, role attributes), loading/error/empty states for every component, Recharts rendering in dark mode, responsive layout, navigation correctness (links, back buttons, breadcrumbs).

**Remediation:** Fix every issue from critical to low. Re-run audit until clean.

---

## Wave 5 — Update Existing Views + Org Chart (Parallelizable)

**Purpose:** Enhance existing views with observatory data and add the org chart visualization.

### Task 5.1: Enhanced Manager Dashboard (PARALLEL)

**Decomposition:** `ManagerDashboardPage.tsx` is already 130 lines with 4 sections. Adding 3 more sections inline would push it to 250+ lines and make it a God page. Extract the new additions as components.

**Files to create:**
- `frontend/src/features/manager-dashboard/CarryForwardVelocity.tsx` — stat card
- `frontend/src/features/manager-dashboard/RcdoCoverageGaps.tsx` — coverage gap list

**Files to modify:**
- `frontend/src/features/manager-dashboard/ManagerDashboardPage.tsx` — add imports and render the 3 new sections

**`ManagerDashboardPage.tsx` changes (~15 lines of additions):**
Add below `AssignmentSignals`, above `TeamRollupTable`:
```tsx
<AlignmentTrendChart managerId={userId} weekCount={8} showTarget />
<CarryForwardVelocity cycleId={activeCycleId} />
<RcdoCoverageGaps coverage={data.rcdoCoverage} />
```
The trend chart is reused from Task 4.2 (no new file needed). The other two are small, focused components.

**`CarryForwardVelocity.tsx` (~40 lines):**
- Uses `useCommitments(cycleId)` to fetch current cycle commitments
- Counts items where `carriedFromCommitmentId !== null`
- Renders a single stat card (same pattern as `SignalCard` in `AssignmentSignals.tsx`)
- Props: `cycleId: string`
- Label: "Active Carry Chains", amber variant if count > 3

**`RcdoCoverageGaps.tsx` (~50 lines):**
- Renders `uncoveredObjectives` array as a list of amber cards
- Each item: defining objective title, parent rally cry title, warning icon
- If empty, shows a green "All objectives covered" message
- Props: `coverage: RcdoCoverageResponse`

### Task 5.2: Org Chart Visualization (PARALLEL)

**File:** `frontend/src/features/observatory/OrgChartView.tsx`

**Purpose:** Visual org chart that shows the reporting hierarchy with health indicators.

**Scope decision: build a simple vertical list tree, NOT a graphical tree with SVG connecting lines.** A full graphical org chart with CSS-drawn connectors is a multi-hundred-line component that is disproportionately complex for its value. Instead:

**Implementation — indented list tree (like a file browser):**
- Fetch org tree via `getOrgTree()` API (existing endpoint, returns flat list of users with `reportsTo`)
- Build tree structure in memory: group users by `reportsTo`, root nodes have `reportsTo === null`
- Render recursively with indentation: each level adds `pl-6` (24px indent)
- Each node is a flex row showing:
  - Expand/collapse chevron (if has children)
  - Name (font-medium)
  - Role badge (reuse `Badge` component)
  - Health grade dot (small colored circle: green/yellow/red/gray) — only for MANAGER+ roles. Gray if no health data available.
- Clicking a MANAGER+ node navigates to `/observatory/team/:userId`
- Default: collapsed to 2 levels deep. Click to expand/collapse subtrees.
- Manage expanded state with `useState<Set<string>>` tracking expanded node IDs.

**Data:** The health grade per manager comes from `useExecutiveHealth()` — match `OrgUnitHealth.managerId` to the tree node's user ID. If no match (e.g., EMPLOYEE), show no health indicator.

This is ~150 lines of code, not 400+. The indented list pattern is proven and fast to build.

### Task 5.3: Chessboard Enhancement (PARALLEL)

**Purpose:** Make the chessboard show week-over-week changes.

**Files to modify:**
- `frontend/src/features/chessboard/ChessboardPage.tsx`
- `frontend/src/features/chessboard/ChessboardCell.tsx`

**Changes:**

1. **Cycle selector** — Add a `<select>` dropdown next to the existing user selector. Populate with cycles from `useQuery({ queryKey: ['cycles'], queryFn: () => listCycles() })` (use existing `listCycles` API). Default to the current cycle.

2. **Previous cycle data** — When a cycle is selected, also fetch commitments from the previous cycle (the cycle with the next-earliest `startsAt`). Use a second `useCommitments()` call:
   ```tsx
   const prevCycleId = cycles?.find(c =>
     new Date(c.startsAt) < new Date(selectedCycle.startsAt)
   )?.id;
   const prevCommitmentsQuery = useCommitments(prevCycleId ?? '', { userId: selectedUserId });
   ```

3. **Delta indicators in ChessboardCell** — Pass `previousCommitments` as a prop. Compute delta = current cell count - previous cell count (same category × same priority tier). If delta > 0, show `<span className="text-green-600 text-xs font-bold">↑{delta}</span>`. If delta < 0, show `<span className="text-red-600 text-xs font-bold">↓{Math.abs(delta)}</span>`. If delta === 0 or no previous data, show nothing.

**Gate for Wave 5:** `pnpm build` passes. All pages render correctly.

### Wave 5 Audit Loop

Run `/audit` on all files created or modified in Wave 5. This includes:
- `CarryForwardVelocity.tsx`, `RcdoCoverageGaps.tsx` (new components)
- Modified `ManagerDashboardPage.tsx`
- `OrgChartView.tsx` (new component)
- Modified `ChessboardPage.tsx`, `ChessboardCell.tsx`

**Audit scope:** Component correctness, dark mode styling, data flow (do the new components receive correct props?), org chart tree-building logic, chessboard delta calculation correctness, integration with observatory hooks.

**Remediation:** Fix every issue from critical to low. Re-run audit until clean.

---

## Wave 6 — Seed Data + Polish (Sequential)

**Purpose:** Create rich seed data that tells a compelling narrative, then polish the entire platform.

### Task 6.1: Extended Seed Data

**Decomposition:** A single 500+ line seed generator is unmaintainable and hard for a sub-agent to produce correctly in one pass. Split into 4 files:

**Files to create:**
- `backend/src/main/java/com/st6/committracker/seed/ObservatorySeedGenerator.java` — orchestrator (ApplicationRunner), delegates to phase classes
- `backend/src/main/java/com/st6/committracker/seed/SeedOrgBuilder.java` — creates orgs, portfolios, users, hierarchy, cost bands, RCDO, chess categories, observatory config
- `backend/src/main/java/com/st6/committracker/seed/SeedCycleBuilder.java` — creates cycles, commitments, reconciliation records, carry-forward chains
- `backend/src/main/java/com/st6/committracker/seed/SeedTemplates.java` — static constants only: name arrays, displacement templates, commitment title templates, reconciliation note templates

**`ObservatorySeedGenerator.java` (~50 lines):**
```java
@Component
@ConditionalOnProperty(name = "st6.seed.observatory", havingValue = "true")
public class ObservatorySeedGenerator implements ApplicationRunner {
    @PersistenceContext private EntityManager em;

    @Override @Transactional
    public void run(ApplicationArguments args) {
        if (orgCount() > 0) return; // already seeded
        SeedOrgBuilder orgBuilder = new SeedOrgBuilder(em);
        List<SeedOrgBuilder.OrgContext> orgs = orgBuilder.buildAll();
        SeedCycleBuilder cycleBuilder = new SeedCycleBuilder(em);
        for (var org : orgs) cycleBuilder.buildCycles(org);
    }
}
```

**`SeedOrgBuilder.java` (~150 lines):**
Returns an `OrgContext` record containing all the entities needed by `SeedCycleBuilder`: org, users (by role), RCDO tree, chess categories, cost bands. This class handles only structure — no cycles, no commitments.

**`SeedCycleBuilder.java` (~200 lines):**
Takes an `OrgContext`, creates 12 cycles, generates commitments per week using the narrative arc, generates reconciliation records, handles carry-forward chain generation. This is the most complex phase but it's isolated from org structure creation.

**`SeedTemplates.java` (~100 lines):**
Pure static data. No logic. Contains:
- `FIRST_NAMES`, `LAST_NAMES` arrays
- `DISPLACEMENT_TEMPLATES` map
- `COMMITMENT_TITLE_TEMPLATES` per category
- `RECONCILIATION_NOTE_TEMPLATES`
- `ORG_NARRATIVES` — the strategic % arc arrays

This separation means a sub-agent can implement each file independently and they compose cleanly.

Activated via a new property `st6.seed.observatory=true` (separate from the existing `st6.seed.enabled` which seeds the small 10-user dataset).

**Requirements:**
- 3 organizations in 1 portfolio
- ~50 users per org (150 total — NOT 200-500, which would be slow to seed and overkill for a demo)
- 12 weeks of cycles per org (NOT 52 — 12 weeks is enough to show drift patterns without making seed time prohibitive)
- Realistic drift narrative across the 3 orgs
- Carry-forward chains, displacement data, cost bands, observatory config

**Org structure generation algorithm:**

For each of the 3 orgs, generate a hierarchy:
```
1 EXECUTIVE
├── 2 VPs (each with ~20 reports total)
│   ├── 2-3 DIRECTORs each
│   │   ├── 2-3 MANAGERs each
│   │   │   └── 3-5 EMPLOYEEs each
│   │   └── 1 ANALYST (scoped to that director's subtree)
```

**Name generation:** Use hardcoded arrays of ~100 first names and ~100 last names. Generate emails as `firstname.lastname@{orgslug}.com`. If collision, append a digit.

```java
private static final String[] FIRST_NAMES = {
    "James", "Maria", "David", "Sarah", "Michael", "Jennifer", "Robert", "Lisa",
    "William", "Patricia", "Richard", "Linda", "Joseph", "Barbara", "Thomas", "Susan",
    "Charles", "Jessica", "Christopher", "Karen", "Daniel", "Nancy", "Matthew", "Betty",
    "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Dorothy",
    "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna", "Kenneth", "Michelle",
    "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah",
    // ... add 50 more
};
// Similar for LAST_NAMES
```

**3 org narratives — each tells a different story:**

| Org | Name | Slug | Narrative | Strategic % arc (12 weeks) |
|-----|------|------|-----------|---------------------------|
| 1 | Meridian Manufacturing | meridian-mfg | Drifting portco — starts well, loses focus | 78, 75, 72, 68, 62, 55, 50, 48, 45, 47, 52, 58 |
| 2 | Pinnacle Logistics | pinnacle-log | Steady performer | 68, 70, 67, 72, 69, 71, 68, 70, 73, 71, 69, 72 |
| 3 | Atlas Industrial | atlas-ind | Struggling — high dark work, high carry-forward | 42, 40, 38, 35, 38, 36, 40, 42, 39, 37, 41, 43 |

**Per-week commitment generation algorithm:**

For each org, for each of the 12 weeks:
1. Create a Cycle (weeks 1-11 are RECONCILED, week 12 is the active DRAFT)
2. For each EMPLOYEE and MANAGER in the org, create 3-5 commitments
3. Distribute chess categories to match the target strategic % for that week:
   ```java
   // For each user's commitments this week:
   double targetStrategicPct = ORG_NARRATIVE[orgIndex][weekIndex] / 100.0;
   for (Commitment c : userCommitments) {
       double roll = random.nextDouble();
       if (roll < targetStrategicPct) {
           c.setChessCategory(strategicCategory);
       } else if (roll < targetStrategicPct + 0.25) {
           c.setChessCategory(operationalCategory);
       } else if (roll < targetStrategicPct + 0.40) {
           c.setChessCategory(defensiveCategory);
       } else {
           c.setChessCategory(capabilityBuildingCategory);
       }
   }
   ```
4. Assign RCDO links: randomly pick from the org's Rally Cries / DOs / Outcomes (already seeded). ~20% of commitments have no RCDO link.
5. Assignment attribution: For Org 3 (struggling), 60%+ of commitments are `assignedBy` the manager. For Org 2, ~20%. For Org 1, starts at ~25%, drifts to ~50%.

**Reconciliation generation (for weeks 1-11, which are RECONCILED):**

For each commitment in a reconciled cycle:
1. Roll a completion status based on the org narrative:
   - Org 1: 70% COMPLETED, 15% PARTIALLY_COMPLETED, 5% NOT_STARTED, 10% CARRIED_FORWARD (early weeks). By week 8-10: 50% COMPLETED, 20% PARTIALLY, 10% NOT_STARTED, 20% CARRIED_FORWARD.
   - Org 2: 80% COMPLETED, 10% PARTIAL, 5% NOT_STARTED, 5% CARRIED_FORWARD (consistent)
   - Org 3: 45% COMPLETED, 20% PARTIAL, 15% NOT_STARTED, 20% CARRIED_FORWARD
2. For non-COMPLETED statuses, add displacement data:
   - Pick a `DisplacementCategory` weighted by org: Org 3 heavily weighted toward MANAGER_REASSIGNED and PRODUCTION_EMERGENCY
   - Generate `displacementDetail` from a bank of ~30 template strings per category:
     ```java
     private static final Map<DisplacementCategory, String[]> DISPLACEMENT_TEMPLATES = Map.of(
         DisplacementCategory.MANAGER_REASSIGNED, new String[]{
             "Reassigned to urgent customer escalation",
             "Manager redirected to production line audit",
             "Pulled onto compliance review preparation",
             // ... 7 more
         },
         DisplacementCategory.PRODUCTION_EMERGENCY, new String[]{
             "Line 3 shutdown due to equipment failure",
             "Quality hold on incoming raw materials",
             "Safety incident investigation required full shift",
             // ... 7 more
         },
         // ... other categories
     );
     ```
3. Add reconciliation notes from a similar template bank

**Carry-forward chain generation:**

After generating reconciliation records, for each CARRIED_FORWARD commitment:
1. Clone it to the next cycle using `Commitment.builder().carriedFrom(original)...`
2. With 30% probability, carry it forward again to the cycle after that (creating chains)
3. Max chain length: 8 (stop carrying after 8 consecutive weeks)
4. Each clone gets its own reconciliation record in its target cycle

**Cost bands (per org):**
```java
List.of(
    new CostBand(org, "L1 - Entry",          1, null, new BigDecimal("35.00")),
    new CostBand(org, "L2 - Intermediate",   2, null, new BigDecimal("55.00")),
    new CostBand(org, "L3 - Senior",         3, null, new BigDecimal("80.00")),
    new CostBand(org, "L4 - Lead",           4, null, new BigDecimal("110.00")),
    new CostBand(org, "L5 - Director+",      5, null, new BigDecimal("160.00"))
);
```
Assign cost bands by role: EMPLOYEE → L1-L2, MANAGER → L3, DIRECTOR → L4, VP/EXECUTIVE → L5.

**Observatory config (per org):** Use defaults from V018 migration. No customization needed — the defaults are reasonable.

**Portfolio:** Create one portfolio ("Apex Capital Partners") linking all 3 orgs.

**Estimated seed time:** ~30 seconds for 150 users × 12 weeks × ~4 commitments each ≈ 7,200 commitments + reconciliation records. Acceptable for a dev environment.

### Task 6.2: Polish Pass

- Verify all dark mode styling is consistent across new components
- Fix any N+1 query issues found during testing with large data
- Add loading skeletons to observatory pages
- Ensure all Recharts components render properly in dark mode
- Add empty states for all new components
- Verify responsive design on smaller screens

### Wave 6 Audit Loop

Run `/audit` on all seed data files and any polish changes:
- All 4 seed generator files (ObservatorySeedGenerator, SeedOrgBuilder, SeedCycleBuilder, SeedTemplates)
- Any files modified during the polish pass (dark mode fixes, empty states, loading skeletons)

**Audit scope:** Seed data correctness (do the narratives produce the intended strategic % arcs?), entity relationship integrity (carry-forward chains, RCDO links), performance (seed time, N+1 queries), any regressions introduced during polish.

**Remediation:** Fix every issue from critical to low. Re-run audit until clean.

### >>> COMPLEXITY SWEEP #2 — Final Full-Codebase Sweep <<<

The entire platform is now built. Run `/complexity-sweep` on the full codebase (backend + frontend):

**Backend targets:**
- `backend/src/main/java/com/st6/committracker/domain/observatory/` — all new services
- `backend/src/main/java/com/st6/committracker/domain/reconciliation/` — modified reconciliation flow
- `backend/src/main/java/com/st6/committracker/domain/dashboard/` — existing dashboard (verify no degradation)
- `backend/src/main/java/com/st6/committracker/seed/` — seed generators

**Frontend targets:**
- `frontend/src/features/observatory/` — all new observatory components
- `frontend/src/features/reconciliation/` — displacement capture additions
- `frontend/src/features/manager-dashboard/` — enhanced dashboard
- `frontend/src/features/chessboard/` — chessboard enhancements
- `frontend/src/hooks/` — all hooks (original + new)

**What to look for:**
- Components or services that grew beyond 200 lines — candidates for extraction
- Duplicate logic across observatory components (chart configurations, color mappings, grade computations)
- Backend services with methods that do too many things (should a method be split?)
- Frontend components that fetch data they don't use, or fetch the same data multiple times
- Over-abstraction — helper functions or utilities that are only called once
- Dead code from refactoring during earlier waves

Fix any issues found. Re-run the sweep to confirm clean.

### Final Audit Loop

Run `/audit` one final time across the **entire codebase** — not just Wave 6 changes, but everything. This catches cross-wave issues that per-wave audits might miss:
- Backend: `./gradlew test` must pass with zero failures
- Frontend: `pnpm typecheck && pnpm build` must pass clean
- Full integration: every API endpoint exercised, every page rendered, every user flow tested

**Audit scope:** Everything — types, tests, build, security (role guards on all observatory endpoints), data integrity (seed data FK relationships), performance (response times with 150-user seed data), accessibility, dark mode consistency.

**Remediation:** Fix every issue from critical to low. Re-run audit until it returns zero issues across all categories.

### Final Verification Walk-Through

Only after the final audit is clean, manually verify the complete demo flow:
1. Login as PE MD → Portfolio view → see 3 portcos with different health grades
2. Click into struggling portco → Executive Health view → see drift signals and red units
3. Drill into a red unit → Team detail → see cost impact, displacement patterns, carry-forward chains
4. Login as employee → create commitments → reconcile with displacement data
5. Login as manager → see enhanced dashboard with trends
6. Verify all data is traceable: click any signal → see the underlying data points

---

## Critical Path

```
Wave 1 (Sequential: bugs → migrations → entities)
    ↓ audit loop until clean
Wave 2 (Parallel: 6 backend services)
    ↓ audit loop until clean
    ↓ >>> COMPLEXITY SWEEP #1 <<<
Wave 3 (Sequential: types → API → hooks)
    ↓ audit loop until clean
Wave 4 (Parallel: 7 frontend tasks)
    ↓ audit loop until clean
Wave 5 (Parallel: 3 enhancement tasks)
    ↓ audit loop until clean
Wave 6 (Sequential: seed data → polish)
    ↓ audit loop until clean
    ↓ >>> COMPLEXITY SWEEP #2 (full codebase) <<<
    ↓ FINAL audit loop until clean
    ↓ verification walk-through
```

**Estimated agent dispatches:** ~25-30 Sonnet agents across all waves
**Estimated total implementation time:** 8-10 working days with focused execution

---

## Cross-Cutting Concerns

### Existing repository methods available for reuse

Sub-agents implementing Wave 2 services should use these existing repository methods rather than creating new ones:

| Method | Repository | Used by |
|--------|-----------|---------|
| `findByOrgIdOrderByStartsAtDesc(orgId)` | CycleRepository | AnalyticsService — get cycle history |
| `findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId)` | CommitmentRepository | AnalyticsService — all org commitments per cycle |
| `findByUserIdInAndCycleId(userIds, cycleId)` | CommitmentRepository | AnalyticsService — team commitments per cycle |
| `findByRallyCryIdAndCycleId(rallyCryId, cycleId)` | CommitmentRepository | DriftDetectionService — COVERAGE drift |
| `countByOrgIdAndCycleIdGroupByStatus(orgId, cycleId)` | ReconciliationRecordRepository | AnalyticsService — completion stats |
| `findByOrgIdAndCycleId(orgId, cycleId)` | ReconciliationRecordRepository | DisplacementService — displacement records |
| `findSubtreeUserIds(rootUserId)` | AppUserRepository | AnalyticsService — team scoping |
| `findByOrgIdAndIsActiveTrue(orgId)` | AppUserRepository | DriftDetectionService — all org users |
| `findDirectReports(orgId, managerId)` | AppUserRepository | DriftDetectionService — direct reports |

**New repository methods needed (add during Wave 2 implementation):**
- `ReconciliationRecordRepository.findByOrgIdAndCycleIdIn(UUID orgId, Collection<UUID> cycleIds)` — batch fetch reconciliation records across multiple cycles (avoids N+1 in analytics)
- `CycleRepository.findByOrgIdAndStateOrderByStartsAtDesc(UUID orgId, CycleState state)` — filter cycles by state (for fetching only RECONCILED cycles in analytics)

### Existing test updates required across waves

When entity fields change in Wave 1 Task 1.3, these existing test files may fail to compile. The implementing agent must check and fix them:

- **Backend tests using Commitment.builder():** `CommitmentServiceTest`, `DashboardServiceTest`, `CommitmentCsvImporterTest` — add `.estimatedHours(null)` if the builder requires it (it won't if the field has a default, but verify).
- **Backend tests using ReconciliationRecord.builder():** `ReconciliationServiceTest`, `CycleServiceTest` — builder now has displacement fields, but they're nullable so existing calls should still compile. Verify.
- **Frontend test factories:** `frontend/src/test/factories/index.ts` — already updated for `RcdoLink` titles. Still needs `estimatedHours: null` added to the commitment factory when Task 3.1 adds the field to the `Commitment` type.

### Frontend category key convention

The existing `AlignmentGapChart.tsx` and `TeamRollupTable.tsx` use chess category names from the `Commitment.chessCategoryName` field, which comes from the DB as title-case strings: `"Strategic"`, `"Operational"`, `"Defensive"`, `"Capability Building"`.

The `CategorySelector.tsx` and `CommitmentCard.tsx` use screaming-case `ChessCategoryType` enum values (`STRATEGIC`, `OPERATIONAL`, etc.) — but these are used for UI rendering only (mapping to variant classes), not as API keys.

**Convention going forward:** Backend analytics services return category names in title-case (matching DB). Frontend observatory components that consume analytics data should use title-case keys. The existing dashboard components that use screaming-case keys are internal to those components and don't need to change.

---

## Risks and Mitigations

1. **Performance with large seed data** — Mitigation: Watch for N+1 queries in analytics services. Use batch queries (the new `findByOrgIdAndCycleIdIn` method). Consider `@QueryHints(value = @QueryHint(name = HINT_FETCH_SIZE, value = "100"))` on large result sets.
2. **Scope creep in observatory features** — Mitigation: Build the executive health view first. Everything else enhances it. If time runs short, the health view + drift signals alone are a compelling demo.
3. **Test data quality** — Mitigation: Generate seed data programmatically with intentional patterns. Verify the narrative manually before demo. The 12-week × 150-user dataset is small enough to inspect manually.
4. **Frontend complexity** — Mitigation: Reuse existing component patterns. Recharts is already integrated. Dark mode is already configured.
5. **Chess category key mismatch** — Mitigated by the convention documented above. Backend always returns title-case. Frontend observatory components use title-case. Existing components keep their screaming-case internal mapping.
