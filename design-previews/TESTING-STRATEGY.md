# Compass Redesign: Testing Strategy

Generated: 2026-03-20

---

## Current Test Inventory

### Backend (34 test files, ~150+ test methods)

**Integration tests** (Testcontainers + PostgreSQL 16, MockMvc, SpringBootTest):
- `IntegrationTestBase` — shared setup with reusable DB, token generation, TRUNCATE cleanup
- `CommitmentApiTest` — CRUD lifecycle, filtering, auth (6 tests)
- `CycleLifecycleApiTest` — state transitions via HTTP
- `SecurityApiTest` — auth enforcement across endpoints

**Unit tests** (Mockito, JUnit 5):
- `CommitmentServiceTest` — 30+ tests covering create/update/delete/reorder, role guards, validation, audit, carry-forward cloning
- `CycleServiceTest` — 18+ tests covering getCurrentCycle, transitions, state machine, carry-forward, week boundary computation
- `ReconciliationServiceTest` — 18+ tests covering reconcile flow, bullet status, carry-forward, displacement, idempotent updates, summary computation
- `RcdoServiceTest` — 12+ tests covering CRUD for RallyCry/DO/Outcome, archive, tree query
- `CycleStateMachineTest` — state transition validity rules
- `DashboardServiceTest` — team rollup, alignment signals, RCDO coverage, assignment attribution
- `AnalyticsServiceTest` — completion rates, alignment data, carry-forward chains, cost-weighted signals
- Observatory tests: `DriftDetectionServiceTest`, `DisplacementServiceTest`, `TrendAnalyzerTest`, `ObservatoryControllerTest`
- `VisibilityEnforcerTest` — row-level security logic
- `AuditServiceTest` — audit log persistence
- `TeamActivationServiceTest` — user activation flow
- Repository tests (7 files) — JPA query methods
- CSV importer tests (4 files) — import parsing and validation

**Framework**: JUnit 5 + Mockito + AssertJ + Testcontainers + spring-boot-starter-test + spring-security-test

### Frontend (8 test files, ~40 test methods)

- `validation.test.ts` — Zod schema tests for CreateCommitment and ReconcileCommitment (14 tests)
- `CommitmentForm.test.tsx` — render tests, validation display, bullet enforcement (6 tests)
- `CommitmentList.test.tsx`, `TaskBulletEditor.test.tsx`, `HorizonSelector.test.tsx`
- `TeamRollupTable.test.tsx`
- `TransitionActions.test.tsx`, `CycleStateIndicator.test.tsx`

**Framework**: Vitest + @testing-library/react + @testing-library/user-event

---

## Testing Strategy by Work Area

### 1. Design System Migration (62 files restyled)

**Existing tests that must keep passing:**
All 8 frontend test files. Restyling should not break behavior.

**New tests needed:**
- None for unit/integration. Visual changes are not worth unit testing.
- If Chromatic or a visual regression tool were available, snapshot tests would be ideal here. Without one, rely on manual review.

**Acceptance criteria:**
- All existing frontend tests pass without modification (except updating test selectors if accessible names change)
- Manual spot-check of every page against the mockup HTML files

**Risk note:** If accessible names or ARIA roles change during restyle, existing tests will break. Fix selectors, don't skip tests.

---

### 2. Backend: Horizon Refactor (new DB columns, dual-write)

**What changes:** `CompletionHorizon` enum splits from a single value (EOW, EOD, MORNING, AFTERNOON, MIDDAY) into two dimensions: `targetDay` (MONDAY-FRIDAY) + `targetTimeBlock` (MORNING, MIDDAY, AFTERNOON, EOD, EOW). Existing column stays for backward compatibility with a dual-write migration.

**Existing tests that must keep passing:**
- `CommitmentServiceTest` — every create/update test uses `CompletionHorizon` (10+ tests)
- `CommitmentApiTest` — HTTP create/update (6 tests)
- `ReconciliationServiceTest` — reconcile flow uses `CompletionHorizon` on commitments
- `CycleServiceTest` — carry-forward clones commitments with horizons

**New tests needed:**

| Test | Category | Priority |
|------|----------|----------|
| `CommitmentServiceTest`: create with new targetDay + targetTimeBlock fields persists both | Unit | HIGH |
| `CommitmentServiceTest`: create with legacy CompletionHorizon still works (backward compat) | Unit | HIGH |
| `CommitmentServiceTest`: dual-write populates both old and new columns on save | Unit | HIGH |
| `CommitmentServiceTest`: read path returns both old enum and new fields | Unit | MEDIUM |
| Flyway migration test: migration runs cleanly on existing data | Integration | HIGH |
| `CommitmentApiTest`: POST with new fields returns correct response shape | Integration | HIGH |
| `CommitmentApiTest`: POST with old-style horizon still accepted | Integration | MEDIUM |

**Edge cases:**
- Existing commitments with only the old enum column — what do targetDay/targetTimeBlock default to?
- EOW horizon has no specific day — how does it map to the new two-field model?
- Carry-forward clone must copy both old and new fields

**Acceptance criteria:**
- Zero test failures in existing CommitmentServiceTest and CommitmentApiTest
- New fields round-trip through create -> read -> update -> read
- Flyway migration is idempotent (re-runnable)

---

### 3. Backend: RCDO Search Endpoints (new)

**What changes:** New search/filter endpoints on the RCDO tree, likely on `RcdoController`.

**Existing tests that must keep passing:**
- `RcdoServiceTest` — all 12 tests for CRUD + tree query
- `CommitmentApiTest` — filter by rallyCryId test

**New tests needed:**

| Test | Category | Priority |
|------|----------|----------|
| `RcdoServiceTest`: search by title substring returns matching rally cries | Unit | HIGH |
| `RcdoServiceTest`: search excludes archived items by default | Unit | HIGH |
| `RcdoServiceTest`: search returns empty list for no matches | Unit | MEDIUM |
| `RcdoServiceTest`: search is case-insensitive | Unit | MEDIUM |
| `RcdoServiceTest`: search with includeArchived flag returns archived items | Unit | LOW |
| Integration: GET /api/v1/rcdo/search?q=... returns filtered tree | Integration | HIGH |
| Integration: search respects org isolation (user in org A cannot see org B results) | Integration | HIGH |

**Edge cases:**
- Empty search string — return all or reject?
- Special characters in search (%, _, SQL injection via JPA)
- Very long search strings

**Acceptance criteria:**
- Search returns correct results in <100ms for typical data sizes
- Org isolation enforced (integration test proves cross-org leak impossible)

---

### 4. Backend: Briefing Service Stub (new, returns mock data)

**What changes:** New service that generates briefing narrative (initially mock/stub data). Likely a new `BriefingService` + `BriefingController`.

**Existing tests that must keep passing:**
- `DashboardServiceTest` — briefing may aggregate dashboard data

**New tests needed:**

| Test | Category | Priority |
|------|----------|----------|
| `BriefingServiceTest`: returns a well-formed BriefingResponse with all fields populated | Unit | HIGH |
| `BriefingServiceTest`: response includes metrics (alignment %, coverage %, etc.) | Unit | HIGH |
| `BriefingServiceTest`: response includes suggested focus areas (non-empty list) | Unit | MEDIUM |
| `BriefingServiceTest`: handles org with no cycles gracefully | Unit | MEDIUM |
| `BriefingServiceTest`: handles org with no commitments gracefully | Unit | MEDIUM |
| Integration: GET /api/v1/briefing returns 200 with correct JSON shape | Integration | HIGH |
| Integration: briefing endpoint requires authentication | Integration | HIGH |
| Integration: briefing scoped to requesting user's org | Integration | MEDIUM |

**Edge cases:**
- New org with zero data — must not NPE, should return sensible defaults
- Org with only archived rally cries — coverage calculations must not divide by zero

**Acceptance criteria:**
- Endpoint returns valid JSON with all documented fields
- No null fields in response (use empty collections, default strings)
- Response time under 500ms even with stub logic

---

### 5. Backend: Cycle History Endpoint (new)

**What changes:** New endpoint to return historical cycles for an org, enabling the "Week 6, Week 5..." pills in the UI.

**Existing tests that must keep passing:**
- `CycleServiceTest.listCycles_returnsPagedResults` — already tests basic listing

**New tests needed:**

| Test | Category | Priority |
|------|----------|----------|
| `CycleServiceTest`: getCycleHistory returns cycles in reverse chronological order | Unit | HIGH |
| `CycleServiceTest`: getCycleHistory limits to N most recent cycles | Unit | MEDIUM |
| `CycleServiceTest`: getCycleHistory includes state and commitment count per cycle | Unit | MEDIUM |
| `CycleServiceTest`: getCycleHistory for org with only 1 cycle returns single item | Unit | LOW |
| Integration: GET /api/v1/cycles/history returns correct JSON shape | Integration | HIGH |
| Integration: cycle history respects org isolation | Integration | MEDIUM |

**Acceptance criteria:**
- Returns at least the last 8 cycles
- Each entry includes cycle ID, label, state, date range, and commitment count

---

### 6. Backend: Bug Fixes (N+1 query, reorder batch save, RCDO UUID display)

**N+1 Query Fix:**

| Test | Category | Priority |
|------|----------|----------|
| Integration: listing commitments with bullets executes a bounded number of queries | Integration | HIGH |
| Verify with Hibernate query logging or query count assertion | Integration | HIGH |

**Reorder Batch Save Fix:**

| Test | Category | Priority |
|------|----------|----------|
| `CommitmentServiceTest`: reorder with 10+ items saves all in single batch | Unit | HIGH |
| Integration: reorder 10+ commitments returns 200 in under 200ms | Integration | MEDIUM |

Existing test `reorder_updatesRanksInOrder` already validates correctness. Add a test for larger batches.

**RCDO UUID Display Fix:**

| Test | Category | Priority |
|------|----------|----------|
| Integration: commitment response includes RCDO titles, not just UUIDs | Integration | HIGH |
| `CommitmentServiceTest`: DTO mapping resolves rallyCry/DO/outcome to title strings | Unit | HIGH |

**Acceptance criteria:**
- N+1 fix: query count does not grow with number of commitments (constant or O(1) queries)
- Reorder: batch save uses `saveAll`, not N individual saves
- UUID fix: no raw UUIDs appear in any API response where a title/name is expected

---

### 7. Frontend: Page Redesigns (My Week, Commitment Form, Reconciliation, Briefing, My Team, Strategy, Settings)

**Existing tests that must keep passing:**
- All 8 frontend test files (adjust selectors as needed for new markup)

**New tests needed (high-value only):**

| Test | Category | Priority |
|------|----------|----------|
| `MyWeekPage`: renders two-column layout with sidebar | Component | MEDIUM |
| `MyWeekPage`: cycle history pills render and navigate | Component | MEDIUM |
| `CommitmentForm`: new day+time horizon picker selects correct value | Component | HIGH |
| `CommitmentForm`: strategy linker breadcrumb displays RC > DO > Outcome | Component | MEDIUM |
| `ReconciliationPage`: accordion expand/collapse works | Component | MEDIUM |
| `ReconciliationPage`: displacement quick-signal badge sets displacement category | Component | HIGH |
| `ReconciliationPage`: progress bar reflects reconciled count / total | Component | MEDIUM |
| `BriefingPage`: renders metrics strip with 5 cards | Component | LOW |
| `BriefingPage`: rally cry coverage cards render with correct counts | Component | MEDIUM |
| `StrategyPage`: column board renders one column per rally cry | Component | MEDIUM |
| `StrategyPage`: three-dot menu opens with Edit/Archive options | Component | MEDIUM |
| `SettingsPage`: Organizations tab renders for admin users | Component | MEDIUM |
| Validation: new horizon picker Zod schema validates day+time combo | Unit | HIGH |

**What NOT to test:**
- Don't snapshot-test CSS (too brittle, no visual regression tool)
- Don't test animation timing or CSS transitions
- Don't test Tailwind class names

**Acceptance criteria:**
- All existing tests pass (possibly with updated selectors)
- New component tests verify key interactive behaviors, not visual styling
- Form validation tests cover the new horizon picker model

---

### 8. Frontend: New Pages (Portfolio, Landing, Architecture)

**Portfolio Overview:**

| Test | Category | Priority |
|------|----------|----------|
| `PortfolioPage`: renders company cards when data exists | Component | MEDIUM |
| `PortfolioPage`: renders empty state when no companies | Component | LOW |
| `PortfolioPage`: company switcher dropdown changes active company | Component | MEDIUM |

**Landing Page:**

| Test | Category | Priority |
|------|----------|----------|
| No tests recommended | — | — |

Rationale: the landing page is a static marketing page with no business logic. Testing static HTML is low ROI.

**Architecture Page:**

| Test | Category | Priority |
|------|----------|----------|
| No tests recommended | — | — |

Rationale: documentation page with no interactivity beyond scroll reveals. Zero business logic.

**Acceptance criteria:**
- Portfolio page renders without crashes for both data and empty states
- Landing and Architecture pages render without JS errors (verified via dev server, not tests)

---

## Test Prioritization Matrix

### Tier 1: Must Have Before Merge (blocks deployment)

1. All existing backend tests pass (34 files, ~150 tests)
2. All existing frontend tests pass (8 files, ~40 tests)
3. Horizon refactor: dual-write unit + integration tests
4. Horizon refactor: Flyway migration test
5. Bug fixes: N+1 query count assertion
6. Bug fixes: RCDO UUID display resolved in API responses
7. Briefing endpoint: returns 200 with valid shape
8. RCDO search: org isolation integration test

### Tier 2: Should Have Before Release (important for confidence)

9. RCDO search: full unit test suite (6 tests)
10. Cycle history: endpoint shape + ordering tests
11. Briefing: edge cases (empty org, no data)
12. Frontend: updated horizon picker validation schema test
13. Frontend: reconciliation displacement quick-signal test
14. Bug fixes: reorder batch save test

### Tier 3: Nice to Have (add when time permits)

15. Portfolio page component tests
16. Frontend component tests for layout changes
17. Strategy board column rendering test
18. Settings Organizations tab test
19. Briefing: suggested focus areas test

---

## Test Infrastructure Notes

### Backend
- **Testcontainers with reuse** is already configured. No changes needed.
- **Integration test base** handles DB cleanup via TRUNCATE CASCADE. New tables from Flyway migrations will need to be added to the TRUNCATE list in `IntegrationTestBase.cleanDatabase()`.
- **Token generation** (`tokenFor()`, `bearerToken()`) already handles role-based auth. Portfolio/org-switching may need multi-org token support if a user can belong to multiple orgs.

### Frontend
- **Vitest** is configured. No jest migration needed.
- **renderWithProviders** helper exists in `@/test/test-utils` for component testing with React Query / Router providers.
- **No visual regression tool** (Chromatic, Percy, etc.) exists. The 62-file restyle relies on manual visual review against the mockup HTML files.
- **No E2E framework** (Playwright, Cypress) exists. Adding one is out of scope for this redesign but would be the highest-ROI infrastructure investment for future work.

### Missing Infrastructure (Future Investment)

| Tool | Benefit | Effort |
|------|---------|--------|
| Playwright E2E | Catch full-stack regressions, test auth flows end-to-end | 2-3 days setup |
| Chromatic/Percy | Visual regression for the design system migration | 1 day setup, ongoing cost |
| API contract tests (Pact) | Frontend/backend schema drift detection | 2 days setup |
| Query count assertions | Prevent N+1 regressions permanently | 0.5 day (add TestEntityManager spy) |

---

## Running the Test Suite

```bash
# Backend: all tests (requires Docker for Testcontainers)
cd /Users/js/dev/st6/backend
./gradlew test

# Frontend: all tests
cd /Users/js/dev/st6/frontend
npm run test

# Frontend: watch mode during development
cd /Users/js/dev/st6/frontend
npm run test:watch
```

---

## Key Risks

1. **Horizon refactor breaks existing tests** — The CompletionHorizon enum is referenced in ~30 backend tests. If the enum changes shape, every test using `CompletionHorizon.EOD` etc. will need updating. Mitigate by keeping the old enum values valid during dual-write.

2. **Frontend selector breakage from restyle** — Changing component markup (e.g., swapping `<button>` for `<div role="button">`) will break testing-library queries. Run frontend tests early in the restyle process, not at the end.

3. **IntegrationTestBase TRUNCATE list stale** — New Flyway migrations adding tables will cause FK violations in cleanup if the new tables aren't added to the TRUNCATE statement. Add them immediately when creating the migration.

4. **No E2E coverage for auth flows** — Token-based auth is tested at the integration level with MockMvc, but no test verifies the full browser flow (login -> token -> API call -> render). The Security integration tests partially cover this.

5. **Briefing stub masks real integration issues** — If the briefing service returns mock data, tests will pass even if the real aggregation logic has bugs. When replacing the stub with real logic, rewrite the tests to use real data.
