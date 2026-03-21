# Compass Redesign — Implementation Plan

Generated: 2026-03-20

## Notation

- **Complexity**: S = small (<30 min), M = medium (30-90 min), L = large (90+ min)
- **Parallel**: whether a task can run concurrently with its sibling tasks within the same wave
- **Paths** are relative to the repo root (`/Users/js/dev/st6/`)

---

## WAVE 0: Foundation (Design Tokens + Shared Components)

Everything in Wave 0 is a prerequisite for all frontend work in Waves 2-5. Tasks within Wave 0 have their own internal dependency order noted below.

### 0.1 — Google Fonts in index.html

**File:** `frontend/index.html`
**Change:** Add `<link>` preconnect + stylesheet tags for Newsreader (400, 400i) and Inter (400, 500, 600) from Google Fonts. Remove `class="dark"` from `<html>`. Change `<body>` class from dark-mode to `bg-[#F9F9F7] text-[#2D3432] font-sans`.
**Complexity:** S
**Dependencies:** None
**Parallel:** Yes (with 0.2, 0.3)

### 0.2 — Rewrite tailwind.config.ts with Compass tokens

**File:** `frontend/tailwind.config.ts`
**Change:**
- Remove `darkMode: 'class'` (Compass is light-only)
- Replace `colors` with Compass semantic tokens: `surface` (#F9F9F7), `surface-lowest` (#FFFFFF), `surface-container-low` (#F2F4F2), `surface-container` (#EEEEEC), `surface-container-high` (#E8E8E6), `on-surface` (#2D3432), `on-surface-variant` (#5A605E), `muted` (#94A3B8), `accent` (#036A6A), `accent-dark` (#005050), `outline-variant` (#E8E5E0), `error` (#9F403D), `warning` (#C2860B), `navy` (#455F87), plus CHESS category colors (strategic, operational, defensive, capability)
- Add `fontFamily`: `serif: ['Newsreader', 'Georgia', 'serif']`, `sans: ['Inter', 'system-ui', 'sans-serif']`
- Add `borderRadius`: cap at `sm` (4px) default, add `pill` for chips
- Replace `boxShadow` with `whisper: '0 12px 32px -4px rgba(45, 52, 50, 0.06)'`
- Add animation keyframes: `fadeUp`, `fadeIn`, `shimmer`, `countUp`, `slideInRight`, `slideOutRight`
- Add `fontSize` scale matching DESIGN.md (display, headline, title, body, label, small)
**Complexity:** M
**Dependencies:** None
**Parallel:** Yes (with 0.1, 0.3)

### 0.3 — Rewrite global.css with Compass design tokens and motion utilities

**File:** `frontend/src/styles/global.css`
**Change:**
- Replace entire file. Remove all dark-mode utilities, glass-card, text-gradient, glow shadows, observatory animations.
- Add `:root` CSS custom properties block for all Compass colors (mirrors Tailwind config, enables runtime theming), motion timing (`--ease-standard`, `--ease-entrance`, `--ease-exit`, `--duration-fast/standard/entrance/slow`, `--stagger-delay`).
- Add `@layer base` rules: html antialiased, body with Inter font, `font-variant-numeric: tabular-nums` on `.tabular-nums`, Newsreader for `.font-serif`.
- Add `@layer utilities` with: `.animate-fade-up` (12px translate + opacity, staggered), `.animate-stagger` (rewrite with 40ms intervals per DESIGN.md), `.shimmer` skeleton loading, `.link-underline` (underline slides from left), `.ghost-border` (outline-variant at 15% opacity), scroll-reveal `.reveal` class, `.label-caps` (uppercase + 0.05rem tracking).
- Add slide-over overlay + panel keyframes.
- Add scrollbar utilities (light-mode colors).
**Complexity:** M
**Dependencies:** 0.2 (references Tailwind token names)
**Parallel:** Partially — can start in parallel but should finalize after 0.2

### 0.4 — Create/update shared components

All components below live under `frontend/src/components/`. They can be built in parallel with each other once 0.1-0.3 are complete.

#### 0.4a — Button component

**File:** `frontend/src/components/Button.tsx` (NEW)
**Change:** Create `Button` with variants: `primary` (teal fill, white text, 4px radius), `secondary` (surface-container-high fill, charcoal text), `tertiary` (text-only, underline on hover), `dashed` (dashed border outline, for "+ Add" actions). Props: variant, size, disabled, loading, icon, children. Press = translateY(1px). Hover = color shift per DESIGN.md.
**Complexity:** M
**Dependencies:** 0.2, 0.3
**Parallel:** Yes (with 0.4b-0.4h)

#### 0.4b — Card component

**File:** `frontend/src/components/Card.tsx` (NEW)
**Change:** Create `Card` wrapper: white bg on off-white, no border by default, optional `accent` left-border prop (teal/amber/rose), optional `hoverable` prop (bg shifts to surface on hover). No shadows unless `floating` prop. `padding` prop (compact/normal/spacious).
**Complexity:** S
**Dependencies:** 0.2, 0.3
**Parallel:** Yes

#### 0.4c — Input component

**File:** `frontend/src/components/Input.tsx` (NEW)
**Change:** Create `Input` with underline-only style (no box border). Props: label, error, helperText. Focus = teal underline with fade-in. Supports textarea variant. Character count display option.
**Complexity:** S
**Dependencies:** 0.2, 0.3
**Parallel:** Yes

#### 0.4d — Badge / StatusChip restyle

**File:** `frontend/src/components/Badge.tsx` (MODIFY)
**Change:** Restyle existing Badge to Compass design: surface-container-highest bg, on-surface text, no border, pill radius. Add `status` variant: teal dot for on-track, amber for watch, rose for at-risk. Add `category` variant with CHESS colors (left-border tonal pills). Remove dark-mode classes.
**Complexity:** S
**Dependencies:** 0.2, 0.3
**Parallel:** Yes

#### 0.4e — Tooltip component

**File:** `frontend/src/components/Tooltip.tsx` (NEW)
**Change:** Create Tooltip that fades in + translateY(-4px to 0), 150ms, with 200ms delay. Uses whisper shadow. Props: content, side, children. Uses `@floating-ui/react` or CSS-only approach.
**Complexity:** S
**Dependencies:** 0.3
**Parallel:** Yes

#### 0.4f — ConfirmDialog restyle

**File:** `frontend/src/components/ConfirmDialog.tsx` (MODIFY)
**Change:** Restyle existing ConfirmDialog to Compass: overlay fades to 40% opacity, dialog on white card with Newsreader headline, Inter body. Primary/secondary buttons per 0.4a pattern. Entrance animation per DESIGN.md.
**Complexity:** S
**Dependencies:** 0.2, 0.3, 0.4a
**Parallel:** Yes (after 0.4a Button exists)

#### 0.4g — SkeletonLoader component

**File:** `frontend/src/components/SkeletonLoader.tsx` (NEW)
**Change:** Create shimmer skeleton: gradient sweep left-to-right over placeholder rectangles using surface-container colors. 1.5s infinite linear. Variants: `line`, `card`, `metric`, `table-row`. Replaced elements fade in staggered.
**Complexity:** S
**Dependencies:** 0.3
**Parallel:** Yes

#### 0.4h — Restyle EmptyState, LoadingSpinner, PageHeader

**Files:**
- `frontend/src/components/EmptyState.tsx` (MODIFY)
- `frontend/src/components/LoadingSpinner.tsx` (MODIFY)
- `frontend/src/components/PageHeader.tsx` (MODIFY)

**Change:** Remove dark-mode classes, apply Compass colors. PageHeader: Newsreader serif for title, Inter for description, add optional subtitle + metrics strip slot. LoadingSpinner: use teal accent color.
**Complexity:** S
**Dependencies:** 0.2, 0.3
**Parallel:** Yes

### 0.5 — Redesign Layout.tsx (nav shell)

**File:** `frontend/src/components/Layout.tsx` (MODIFY)
**Change:**
- Two-row nav: top row = brand "compass" in Newsreader small-caps + cycle week/state center display + avatar initials (square, 4px radius, accent bg) + gear icon. Bottom row = tab bar (My Week, My Team, Briefing, Strategy, Portfolio — role-gated).
- Glassmorphism: surface at 85% opacity + 20px backdrop-blur.
- Sticky top, z-30.
- Remove dark-mode classes, gradient border. Replace with ghost-border bottom.
- Active tab: teal accent bottom border, not bg highlight.
- Add cycle context display (week number + state chip) — read from useCycle hook.
- Avatar shows initials from auth context displayName.
- Responsive: collapse to single row at <900px.
**Complexity:** L
**Dependencies:** 0.1, 0.2, 0.3, 0.4d (Badge for cycle state chip)
**Parallel:** No — this is the nav shell everything sits inside

### 0.4i — Toast notification system

**File:** `frontend/src/components/Toast.tsx` (NEW), `frontend/src/hooks/useToast.ts` (NEW)
**Change:** Create toast notification system. Toast slides down from top per DESIGN.md motion (300ms entrance, 200ms exit). Auto-dismisses after 4s with shrinking progress bar along bottom edge. Variants: `success` (teal accent), `error` (muted rose), `warning` (amber), `info` (navy). Props: message, variant, duration, dismissible. Hook `useToast()` returns `{showToast(message, variant)}` — call from any component. Toasts stack vertically. Max 3 visible. Used for: save success, save failure, permission denied, cycle transitions, form validation errors.
**Complexity:** M
**Dependencies:** 0.2, 0.3
**Parallel:** Yes

### 0.4j — Empty state illustrations

**File:** `frontend/src/components/EmptyState.tsx` (MODIFY — already in 0.4h), `frontend/src/assets/illustrations/` (NEW directory)
**Change:** Create simple SVG line-art illustrations for key empty states: "no commitments yet" (checklist outline), "no rally cries defined" (hierarchy outline), "no team members" (people outline), "no reconciliation data" (balance scale outline). Teal strokes (#036A6A), no fill. 120x120px viewBox. Add `illustration` prop to EmptyState component that selects the appropriate SVG.
**Complexity:** S
**Dependencies:** 0.4h
**Parallel:** Yes

### 0.6 — Motion utility hooks

**File:** `frontend/src/hooks/useMotion.ts` (NEW)
**Change:** Create custom hooks:
- `useFadeUp(ref)` — IntersectionObserver-based, triggers `.reveal` class once at threshold 0.1
- `useStagger(containerRef)` — applies staggered `--stagger-index` CSS var to children, 40ms per child
- `useCountUp(target, duration?)` — animates number from 0 to target over 400ms, returns current display value. Uses requestAnimationFrame.
**Complexity:** M
**Dependencies:** 0.3 (references CSS animation classes)
**Parallel:** Yes (with 0.5, 0.4*)

### 0.7 — Update App.tsx routes

**File:** `frontend/src/App.tsx` (MODIFY)
**Change:**
- Add lazy imports for: `StrategyPage`, `PortfolioPage`, `LandingPage`, `ArchitecturePage`
- Add routes: `/strategy`, `/portfolio`, `/landing`, `/architecture`
- Remove redirect from `/strategy` to `/briefing?mode=strategy` — give Strategy its own route back
- Add redirect from `/observatory/portfolio` to `/portfolio`
**Complexity:** S
**Dependencies:** 0.5 (Layout must be ready so new routes render inside it)
**Parallel:** Yes (can stub the lazy imports before pages exist)

---

## WAVE 1: Backend Changes (parallel with Wave 0)

Wave 1 runs entirely in parallel with Wave 0. No frontend dependencies.

### 1.1 — Horizon refactor: CompletionDay + CompletionTimeBlock enums

**Files:**
- `backend/src/main/java/com/compass/platform/domain/CompletionDay.java` (NEW)
- `backend/src/main/java/com/compass/platform/domain/CompletionTimeBlock.java` (NEW)
- `backend/src/main/java/com/compass/platform/domain/commit/Commitment.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/dto/CreateCommitmentRequest.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/dto/UpdateCommitmentRequest.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/dto/CommitmentResponse.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentMapper.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentService.java` (MODIFY)
- `backend/src/main/resources/db/migration/V020__add_completion_day_timeblock.sql` (NEW)
- `frontend/src/types/enums.ts` (MODIFY — add CompletionDay, CompletionTimeBlock types)
- `frontend/src/types/commitment.types.ts` (MODIFY — add day/timeBlock to commitment type)

**Change:**
- New enums: `CompletionDay` (MONDAY-FRIDAY), `CompletionTimeBlock` (MORNING, MIDDAY, AFTERNOON, EOD)
- Migration V020: add `completion_day` (varchar) and `completion_time_block` (varchar) nullable columns to `commitments`. Backfill: map existing `completion_horizon` values — EOW maps to (FRIDAY, EOD), MORNING to (null, MORNING), etc.
- Entity: add `completionDay` and `completionTimeBlock` fields alongside existing `completionHorizon` (dual-write).
- CommitmentService: on create/update, if day+timeBlock provided, write both new fields AND compute legacy `completionHorizon` for backward compat. If only legacy horizon provided, compute day+timeBlock.
- DTOs: add optional `completionDay` and `completionTimeBlock` to create/update requests. Add both to response alongside existing `completionHorizon`.
- Mapper: map new fields in both directions.
**Complexity:** L
**Dependencies:** None
**Parallel:** Yes (with 1.2-1.5)

### 1.2 — RCDO search/filter endpoint

**Files:**
- `backend/src/main/java/com/compass/platform/domain/rcdo/RcdoController.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/rcdo/RcdoService.java` (MODIFY)
- `frontend/src/api/rcdo.api.ts` (MODIFY — add search param)

**Change:** Add `@RequestParam(required = false) String q` to the `GET /api/v1/rcdo/tree` endpoint. In RcdoService, filter rally cries/objectives/outcomes where title ILIKE `%q%` when `q` is present. Return full matching subtrees (if an outcome matches, include its parent DO and RC).
**Complexity:** M
**Dependencies:** None
**Parallel:** Yes

### 1.3 — Briefing service stub

**Files:**
- `backend/src/main/java/com/compass/platform/domain/briefing/BriefingController.java` (NEW)
- `backend/src/main/java/com/compass/platform/domain/briefing/BriefingService.java` (NEW)
- `backend/src/main/java/com/compass/platform/domain/briefing/dto/BriefingResponse.java` (NEW)
- `backend/src/main/java/com/compass/platform/domain/briefing/dto/BriefingSuggestion.java` (NEW)
- `backend/src/main/java/com/compass/platform/domain/briefing/dto/BriefingCitation.java` (NEW)
- `frontend/src/api/briefing.api.ts` (NEW)
- `frontend/src/types/briefing.types.ts` (NEW)

**Change:**
- `GET /api/v1/briefing?cycleId={id}` — returns mock/hardcoded AI narrative text, suggested focus areas, and citation stubs. The service composes real metrics (alignment %, coverage, carry-forward rate) from existing AnalyticsService/DriftDetectionService but wraps them in a narrative template string. Citations reference real data points.
- Frontend types and API client to consume the new endpoint.
**Complexity:** M
**Dependencies:** None
**Parallel:** Yes

### 1.4 — Cycle history endpoint

**Files:**
- `backend/src/main/java/com/compass/platform/domain/cycle/CycleController.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/cycle/CycleService.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/cycle/dto/CycleHistoryResponse.java` (NEW)
- `frontend/src/api/cycles.api.ts` (MODIFY)
- `frontend/src/hooks/useCycle.ts` (MODIFY)

**Change:** Add `GET /api/v1/cycles/history` — returns lightweight list of past cycles for the user's org: `[{id, weekNumber, startDate, endDate, state}]`, ordered by weekNumber desc, limit 12. CycleService queries existing CycleRepository with org filter. Frontend hook `useCycleHistory()` wraps the query.
**Complexity:** S
**Dependencies:** None
**Parallel:** Yes

### 1.5 — Bug fixes (N+1, batch reorder, RCDO breadcrumb)

**Files:**
- `backend/src/main/java/com/compass/platform/domain/dashboard/DashboardService.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentService.java` (MODIFY)
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentRepository.java` (MODIFY)
- `frontend/src/features/shared/StrategyLinker.tsx` (MODIFY)

**Change:**
- **N+1 in DashboardService:** The `commitmentsByUser` map likely triggers N+1 on task_bullets and RCDO joins. Add `@EntityGraph` or `JOIN FETCH` query in CommitmentRepository for dashboard loads. Add a custom query `findByCycleIdAndUserIdInWithBullets` that eagerly fetches task_bullets.
- **Batch save in reorder:** CommitmentService.reorder() currently saves each commitment individually in the loop. Change to collect all and call `commitmentRepository.saveAll(commitments)` for a single batch flush.
- **RCDO UUID breadcrumb:** StrategyLinker shows UUID in breadcrumb instead of RC > DO > Outcome titles. Ensure the autocomplete response includes display names at each level, and the linker uses them.
**Complexity:** M
**Dependencies:** None
**Parallel:** Yes

---

## WAVE 2: Core Page Redesigns (depends on Wave 0)

All Wave 2 tasks depend on Wave 0 completion. Tasks within Wave 2 can run in parallel.

### 2.1 — My Week page redesign

**Files:**
- `frontend/src/features/my-week/MyWeekPage.tsx` (MODIFY — major rewrite)
- `frontend/src/features/my-week/CoverageStrip.tsx` (MODIFY)
- `frontend/src/features/my-week/CommitmentSummaryStrip.tsx` (NEW)
- `frontend/src/features/my-week/RallyCrySidebar.tsx` (NEW)
- `frontend/src/features/my-week/CycleHistorySelector.tsx` (NEW)
- `frontend/src/features/commit-entry/CommitmentCard.tsx` (MODIFY — major restyle)
- `frontend/src/features/commit-entry/CommitmentList.tsx` (MODIFY)
- `frontend/src/features/weekly-lifecycle/CarryForwardPanel.tsx` (MODIFY)
- `frontend/src/features/weekly-lifecycle/CycleStateIndicator.tsx` (MODIFY)
- `frontend/src/features/weekly-lifecycle/TransitionActions.tsx` (MODIFY)
- `frontend/src/hooks/useCycle.ts` (MODIFY — add cycle history query)

**Changes:**
- **MyWeekPage:** Convert from single-column to two-column layout (65% main / 35% sidebar). Main column: cycle state chip, cycle history pills, commitment summary strip, carry-forward panel, "Assigned to You" section, commitment list, "+ Add commitment" dashed button. Sidebar: "This Week's Priorities" heading, rally cry cards with linked counts, coverage section.
- **CommitmentSummaryStrip (NEW):** Inline metrics bar showing counts by CHESS category + total. Uses count-up animation.
- **RallyCrySidebar (NEW):** Fetches RCDO tree, shows rally cry cards with description, objective count, "X linked" badge, "Link" button. Coverage warnings for unlinked items.
- **CycleHistorySelector (NEW):** Horizontal pill strip (Week 6, Week 5...) using useCycleHistory hook. Active pill highlighted with teal.
- **CommitmentCard:** Restyle to Compass. White card, no shadow. Hover reveals edit pencil (remove explicit Edit/Delete buttons). Priority rank circle refined. CHESS category pill with tonal color. Horizon pill showing day+time. Rally cry link as accent-colored arrow link. "Assigned by [name]" label. Expandable task bullets with chevron toggle + interactive checkboxes. Drag handle (braille dots). Left-border accent for assigned items.
- **CommitmentList:** Add "Assigned to You" section header when assigned items exist. Staggered fade-up on cards.
- **CarryForwardPanel:** Restyle with warning left-border (amber). Add task checkboxes showing partial completion, "Why carried" notes, Accept/Decline buttons per item.
- **CycleStateIndicator:** Compact chip with colored dot (teal/amber/rose) instead of full-width bar.
- **TransitionActions:** Restyle "Lock Commitments" button. Add Tooltip on disabled state.
- **CoverageStrip:** Restyle to show unlinked commitments with warning icon per Compass design.
**Complexity:** L (largest single task in the plan)
**Dependencies:** Wave 0 complete, 1.1 (for day+time display), 1.4 (for cycle history)
**Parallel:** Yes (with 2.2, 2.3, 2.4)

### 2.2 — Commitment Form redesign

**Files:**
- `frontend/src/features/commit-entry/CommitmentForm.tsx` (MODIFY)
- `frontend/src/features/commit-entry/HorizonSelector.tsx` (MODIFY — major rewrite)
- `frontend/src/features/commit-entry/CategorySelector.tsx` (MODIFY)
- `frontend/src/features/commit-entry/TaskBulletEditor.tsx` (MODIFY)
- `frontend/src/features/commit-entry/AssignmentAttribution.tsx` (MODIFY)
- `frontend/src/features/commit-entry/RcdoAutocomplete.tsx` (MODIFY)
- `frontend/src/features/shared/StrategyLinker.tsx` (MODIFY)

**Changes:**
- **CommitmentForm:** Restyle panel header to Newsreader serif. All input fields use underline-only style (Input component from 0.4c). Slide-in/out animations match DESIGN.md timing. Footer buttons use Button component.
- **HorizonSelector:** Complete rewrite from dropdown to two-row pill picker. Row 1: Day pills (Mon-Fri). Row 2: Time pills (Morning, Midday, Afternoon, EOD). Selected = teal fill. Writes to both new `completionDay`/`completionTimeBlock` fields and legacy `completionHorizon`.
- **CategorySelector:** Convert from whatever current layout to 2x2 card grid. Each card: left-border color per CHESS category, title, description ("Drives long-term objectives"), checkmark when selected.
- **TaskBulletEditor:** Add numbered row indicators, restyle drag handles, match Compass spacing.
- **AssignmentAttribution:** Restyle toggle and dropdown to Compass design.
- **StrategyLinker / RcdoAutocomplete:** Breadcrumb-style display (RC > DO > Outcome) with accent colors. Add "Mark as non-strategic" button. Add Change/Clear links. Use search endpoint from 1.2.
**Complexity:** M
**Dependencies:** Wave 0 complete, 1.1 (for day+time picker API), 1.2 (for RCDO search)
**Parallel:** Yes (with 2.1, 2.3, 2.4)

### 2.3 — Reconciliation redesign

**Files:**
- `frontend/src/features/reconciliation/PlannedVsActualTable.tsx` (MODIFY — major rewrite)
- `frontend/src/features/reconciliation/CommitmentStatusMarker.tsx` (MODIFY)
- `frontend/src/features/reconciliation/UnplannedWorkEntry.tsx` (MODIFY)
- `frontend/src/features/reconciliation/DisplacementCapture.tsx` (MODIFY)
- `frontend/src/features/reconciliation/ChangeReasonCapture.tsx` (MODIFY)
- `frontend/src/features/weekly-lifecycle/CarryForwardPanel.tsx` (already modified in 2.1 — additional reconciliation-specific changes here)
- `frontend/src/features/reconciliation/ReconciliationBottomBar.tsx` (NEW)
- `frontend/src/features/reconciliation/DisplacementQuickSignal.tsx` (NEW)

**Changes:**
- **PlannedVsActualTable:** Convert to collapsible accordion pattern. Collapsed row: rank #, title, CHESS pill, horizon pill, status pill. Expanded: two-column Planned vs Actual layout with status selector, bullet checkboxes, displacement section, notes. Unplanned work displayed at top.
- **CommitmentStatusMarker:** Restyle status buttons (Completed/Partial/Not Started). Add helper text descriptions under each.
- **UnplannedWorkEntry:** More prominent CTA banner. Richer card with "Unplanned" badge, "Requested by" attribution. Inline add form restyled.
- **DisplacementCapture:** Add "What took priority?" section. Add DisplacementQuickSignal component.
- **DisplacementQuickSignal (NEW):** One-click "Unplanned work displaced this" badge. Checkbox list of other commitments that displaced this one.
- **ChangeReasonCapture:** Add character count display to textarea.
- **ReconciliationBottomBar (NEW):** Fixed sticky bottom bar with progress indicator (3 of 4 reconciled) + "Complete Reconciliation" button.
**Complexity:** L
**Dependencies:** Wave 0 complete
**Parallel:** Yes (with 2.1, 2.2, 2.4)

### 2.4 — Settings restyle

**Files:**
- `frontend/src/features/settings/SettingsPage.tsx` (MODIFY)
- `frontend/src/features/settings/ProfileTab.tsx` (MODIFY)
- `frontend/src/features/settings/AdminTab.tsx` (MODIFY)

**Changes:**
- **SettingsPage:** Newsreader serif page title. Tab bar restyled to Compass (underline active indicator, not bg highlight). Prepare third tab slot for Organizations (Wave 3).
- **ProfileTab:** Restyle to Card component with label/value rows. Add Reports To, Cost Band, Organization fields (read from existing API data). Compass styling throughout.
- **AdminTab:** Restyle toolbar: search input (underline style), role filter dropdown, status filter, "Add User" button (Button component). Table restyled with Compass colors, staggered row fade-in. Footer with user count. Role chips use Badge component. Action links restyled.
**Complexity:** M
**Dependencies:** Wave 0 complete
**Parallel:** Yes (with 2.1, 2.2, 2.3)

---

## WAVE 3: Advanced Pages (depends on Wave 0, partially Wave 1)

### 3.1 — Briefing page redesign

**Files:**
- `frontend/src/features/briefing/BriefingView.tsx` (MODIFY — major rewrite)
- `frontend/src/features/briefing/levels/RallyCryLevel.tsx` (MODIFY)
- `frontend/src/features/briefing/levels/RallyCryDetailLevel.tsx` (MODIFY)
- `frontend/src/features/briefing/levels/TeamDetailLevel.tsx` (MODIFY)
- `frontend/src/features/briefing/levels/PersonDetailLevel.tsx` (MODIFY)
- `frontend/src/features/briefing/DrillDownBreadcrumb.tsx` (MODIFY)
- `frontend/src/features/briefing/BriefingNarrativeCard.tsx` (NEW)
- `frontend/src/features/briefing/BriefingMetricsStrip.tsx` (NEW)
- `frontend/src/features/briefing/BriefingCitations.tsx` (NEW)
- `frontend/src/features/briefing/TeamHealthTable.tsx` (NEW)
- `frontend/src/hooks/useBriefing.ts` (NEW)

**Changes:**
- **BriefingView:** Convert to two-column layout (70% main / 30% AI sidebar). Main: narrative card, metrics strip, rally cry coverage grid, team health table. Sidebar: AI Chat component (from 4.2). "Export PDF" button in header.
- **BriefingNarrativeCard (NEW):** AI-generated narrative with timestamp. "Weekly Intelligence Summary" headline (Newsreader). Prose paragraph with alignment %, coverage, carry-forward metrics. Generated from briefing service (1.3).
- **BriefingMetricsStrip (NEW):** 5-card grid: Alignment, Coverage, Carry-Forward, Completion, Drift. Each card: metric label, large number with count-up animation, trend arrow.
- **BriefingCitations (NEW):** Expandable "View sources" section. Citation cards with data point counts and "View breakdown" links.
- **RallyCryLevel:** Restyle to 3-column grid of rally cry cards. Each card: title, description, linked count, gap warning (amber left-border when low coverage). "Show linked commitments" toggle.
- **TeamHealthTable (NEW):** Table with columns: Team Lead, Headcount, Strategic %, Coverage, Drift, Carry-Forward. Drift column with "Sustained"/"Emerging" labels. Row hover with chevron reveal. Warning rows with amber left-border.
- **TeamDetailLevel / PersonDetailLevel / DrillDownBreadcrumb:** Restyle to Compass. Compass typography, colors, spacing.
- **useBriefing hook (NEW):** Wraps briefing.api.ts, provides narrative, metrics, citations data.
**Complexity:** L
**Dependencies:** Wave 0 complete, 1.3 (briefing service), 1.4 (cycle history)
**Parallel:** Yes (with 3.2, 3.3, 3.4)

### 3.2 — My Team page redesign

**Files:**
- `frontend/src/features/my-team/MyTeamPage.tsx` (MODIFY — major rewrite)
- `frontend/src/features/my-team/TeamAnalytics.tsx` (MODIFY)
- `frontend/src/features/my-team/TeamSummaryCard.tsx` (NEW)
- `frontend/src/features/my-team/TeamMetricsStrip.tsx` (NEW)
- `frontend/src/features/my-team/PersonCard.tsx` (NEW — extracted from MyTeamPage inline code)
- `frontend/src/features/my-team/RallyCryCoverageCards.tsx` (NEW)
- `frontend/src/features/my-team/ChessMiniBar.tsx` (NEW)
- `frontend/src/features/my-team/AssignWorkForm.tsx` (MODIFY — if inline in MyTeamPage, extract)

**Changes:**
- **MyTeamPage:** Add week selector pills (CycleHistorySelector from 2.1). AI summary card at top. Metrics strip. Rally cry coverage cards. Team members section with "Assign Work" button.
- **TeamSummaryCard (NEW):** AI-generated narrative stub. "Suggested Actions" list with arrow bullets.
- **TeamMetricsStrip (NEW):** 4-card grid: Team Size, Coverage, Carry-Forward, Unlinked. Count-up animations.
- **PersonCard (NEW):** Expand/collapse accordion. Header: name, avatar initials, status dot (teal/amber/rose), stats (X commitments, X linked), CHESS mini-bar, carried badge (amber pill), drift signal text. Expanded: commitment list with CHESS + RCDO chips, coverage summary chips.
- **ChessMiniBar (NEW):** Horizontal stacked bar showing CHESS distribution per person. Thin bar, 4 segments colored by category.
- **RallyCryCoverageCards (NEW):** Card per rally cry showing allocation counts. Gap-flagged card with amber left-border when 0 commitments.
- **AssignWorkForm:** Restyle slide-over. Add day picker (Mon-Fri pills) + time block picker. CHESS category 2x2 grid (reuse CategorySelector from 2.2). Strategy linker breadcrumb style. Notes textarea.
**Complexity:** L
**Dependencies:** Wave 0 complete, 2.1 (CycleHistorySelector reuse), 1.3 (briefing data for AI summary)
**Parallel:** Yes (with 3.1, 3.3, 3.4)

### 3.3 — Strategy page redesign (Kanban board)

**Files:**
- `frontend/src/features/strategy/StrategyPage.tsx` (MODIFY — complete rewrite)
- `frontend/src/features/strategy/RallyCryColumn.tsx` (NEW)
- `frontend/src/features/strategy/ObjectiveCard.tsx` (NEW — extracted/rewritten)
- `frontend/src/features/strategy/OutcomeRow.tsx` (NEW — extracted/rewritten)
- `frontend/src/features/strategy/StrategyModal.tsx` (NEW)
- `frontend/src/features/strategy/StrategyBreadcrumb.tsx` (NEW)
- `frontend/src/features/strategy/StrategyDropdownMenu.tsx` (NEW)

**Changes:**
- **StrategyPage:** Complete layout change from vertical accordion to horizontal Kanban column board. Horizontal scroll container. One column per Rally Cry. Page header with breadcrumb ("The Briefing > Strategic Framework"), title, description, aggregate stats. "+ Add Rally Cry" as full-height dashed column button.
- **RallyCryColumn (NEW):** Column header: title, description, stats (X objectives, X outcomes), teal bottom border accent. Body: list of ObjectiveCards. Three-dot dropdown menu (Edit/Archive). "+ Add objective" link at bottom.
- **ObjectiveCard (NEW):** Card within column: title, description, owner badge, "X linked" count. Outcomes divider + OutcomeRow list. "+ Add outcome" link. Three-dot menu.
- **OutcomeRow (NEW):** Inline row: bullet, title, owner, linked count. Amber "No commitments" tag when 0 linked. Three-dot menu.
- **StrategyModal (NEW):** Centered modal dialog (replaces inline forms). Title field, description textarea, owner select, breadcrumb context showing parent hierarchy. Overlay + entrance animation.
- **StrategyBreadcrumb (NEW):** "The Briefing > Strategic Framework" navigation breadcrumb at page top.
- **StrategyDropdownMenu (NEW):** Three-dot trigger, dropdown with Edit/Archive options. Uses Headless UI Menu.
- Vertical separator lines between columns (CSS border-right on columns).
**Complexity:** L
**Dependencies:** Wave 0 complete
**Parallel:** Yes (with 3.1, 3.2, 3.4)

### 3.4 — Settings Organizations tab

**Files:**
- `frontend/src/features/settings/SettingsPage.tsx` (MODIFY — add third tab)
- `frontend/src/features/settings/OrganizationsTab.tsx` (NEW)
- `frontend/src/features/settings/CreateOrgModal.tsx` (NEW)
- `frontend/src/api/users.api.ts` (MODIFY — add org endpoints if needed)

**Changes:**
- **SettingsPage:** Add "Organizations" tab (third position). Render OrganizationsTab.
- **OrganizationsTab (NEW):** Current org card with teal left-border + "Current" badge. Org metadata: timezone, user count, created date. Portfolio organizations list with "Switch" action per org. "+ Create Organization" button.
- **CreateOrgModal (NEW):** Modal with name input + timezone select. Uses StrategyModal-like pattern (or ConfirmDialog variant).
- Note: Multi-org switching requires backend support that may already exist via Org entity. If not, this becomes a UI-only display with the create action wired to existing `POST /api/v1/users/orgs` endpoint.
**Complexity:** M
**Dependencies:** Wave 0 complete, 2.4 (Settings base restyle)
**Parallel:** Yes (with 3.1, 3.2, 3.3)

---

## WAVE 4: New Experiences (depends on Waves 1-3)

### 4.1 — Portfolio page

**Files:**
- `frontend/src/features/portfolio/PortfolioPage.tsx` (NEW)
- `frontend/src/features/portfolio/PortfolioNarrativeCard.tsx` (NEW)
- `frontend/src/features/portfolio/PortfolioMetricsStrip.tsx` (NEW)
- `frontend/src/features/portfolio/CompanyCard.tsx` (NEW)
- `frontend/src/features/portfolio/Sparkline.tsx` (NEW)
- `frontend/src/features/portfolio/ComparisonTable.tsx` (NEW)
- `frontend/src/features/portfolio/HealthGradeBadge.tsx` (NEW)
- `frontend/src/features/portfolio/TrendArrow.tsx` (NEW)
- `frontend/src/hooks/usePortfolio.ts` (NEW)
- `frontend/src/api/portfolio.api.ts` (NEW)
- `frontend/src/types/portfolio.types.ts` (NEW)

**Changes:**
- **PortfolioPage (NEW):** Two-column layout (70% main / 30% AI sidebar). Header: "Portfolio Overview" + week selector pills + company switcher dropdown. Main: narrative card, metrics strip, company cards grid, comparative analysis table. Sidebar: AI Chat (reuse from 4.2).
- **PortfolioNarrativeCard:** AI narrative stub for portfolio level. Same pattern as BriefingNarrativeCard.
- **PortfolioMetricsStrip:** 4-card grid: Aggregate Alignment, Coverage, Carry-Forward, Completion. Count-up animations.
- **CompanyCard (NEW):** Card per portfolio company. Health grade border color (teal/amber/rose). Company name, metrics row (4 inline metrics), sparkline alignment trend, rally cry summary with status dots, drift signals row.
- **Sparkline (NEW):** SVG inline chart. 80px wide, 24px tall. Draws alignment trend line (last 6 weeks). Animate: stroke-dasharray draw from 0 to full. Teal for positive, amber for flat, rose for declining.
- **ComparisonTable (NEW):** Cross-company table: Company, Alignment, Coverage, Carry-Forward, Completion, Health Grade, Trend. HealthGradeBadge + TrendArrow components in cells.
- **HealthGradeBadge (NEW):** Badge showing "On Track" (teal), "Watch" (amber), "At Risk" (rose).
- **TrendArrow (NEW):** SVG arrow (up/down/flat) with color coding.
- **usePortfolio hook:** Wraps existing `observatory.api.ts` portfolio endpoints (PortfolioService already exists in backend).
- **portfolio.api.ts:** Client functions calling existing `/api/v1/observatory/portfolio/*` endpoints.
- **portfolio.types.ts:** TypeScript interfaces for portfolio data shapes.
**Complexity:** L
**Dependencies:** Wave 0 complete, 1.3 (briefing pattern), 0.7 (route), 3.1 (BriefingNarrativeCard pattern to reuse)
**Parallel:** Yes (with 4.2, but 4.2 is also needed by 4.1 — see note)

### 4.2 — AI Chat Sidebar component

**Files:**
- `frontend/src/components/AIChatSidebar.tsx` (NEW)
- `frontend/src/components/ChatBubble.tsx` (NEW)
- `frontend/src/hooks/useAIChat.ts` (NEW)

**Changes:**
- **AIChatSidebar (NEW):** Full-height sticky sidebar (30-35% width). Header: "AI Assistant" label. Chat area: scrollable message list. Input: text field with send button. Footer: "Powered by AI" disclaimer.
- **ChatBubble (NEW):** Message bubble. User messages: right-aligned, accent bg. AI messages: left-aligned, surface-container bg. Timestamp. Fade-in entrance.
- **useAIChat hook (NEW):** Manages message state (local only — no backend). Stub: echoes back canned responses based on keywords. Interface prepared for future API integration with `sendMessage(text): Promise<string>` pattern.
- Shared between Briefing (3.1) and Portfolio (4.1). Both pages render `<AIChatSidebar />` in their sidebar column.
**Complexity:** M
**Dependencies:** Wave 0 complete
**Parallel:** Should be built first (or early in Wave 4) since 4.1 and 3.1 depend on it. Can technically start during Wave 3.

> **Note on dependency cycle:** 3.1 (Briefing) wants the AI sidebar, and 4.2 is slotted in Wave 4. Resolution: Build AIChatSidebar as a stub in Wave 3 (placeholder in Briefing sidebar), then flesh it out in Wave 4. Or pull 4.2 into Wave 3 as 3.5.

---

## WAVE 5: Standalone + Polish (minimal dependencies)

### 5.1 — Landing page

**Files:**
- `frontend/src/features/landing/LandingPage.tsx` (NEW)
- `frontend/src/features/landing/HeroSection.tsx` (NEW)
- `frontend/src/features/landing/GridCanvas.tsx` (NEW)
- `frontend/src/features/landing/ProblemSection.tsx` (NEW)
- `frontend/src/features/landing/HowItWorksSection.tsx` (NEW)
- `frontend/src/features/landing/RoleCardsSection.tsx` (NEW)
- `frontend/src/features/landing/PreviewCardsSection.tsx` (NEW)
- `frontend/src/features/landing/StatsStrip.tsx` (NEW)
- `frontend/src/features/landing/LandingFooter.tsx` (NEW)

**Changes:**
- **LandingPage:** Full-page marketing/landing page. No nav shell (renders outside Layout). Sections: Hero, Problem, How It Works, Built for Every Level, See It in Action, By the Numbers, Footer.
- **HeroSection:** "Compass" branding in Newsreader. Headline + subtitle + two CTA buttons (primary "Get Started", secondary "See Architecture"). GridCanvas background.
- **GridCanvas (NEW):** Canvas element rendering animated dot grid. Subtle, slow-moving. CSS animation only — no heavy JS.
- **ProblemSection:** 3-column card grid. Each card: icon, title, description.
- **HowItWorksSection:** 4-step horizontal flow. Step cards with numbers + connector lines (SVG). Connector lines draw on scroll (stroke-dashoffset animation).
- **RoleCardsSection:** 3 role cards (IC, Manager, Executive) with what each gets from Compass.
- **PreviewCardsSection:** Screenshot/preview cards showing each major view.
- **StatsStrip:** Metrics bar with count-up numbers (e.g., "210+ features", "6 companies", etc.).
- **LandingFooter:** Brand + attribution text.
- All sections use IntersectionObserver scroll-reveal (useFadeUp from 0.6).
**Complexity:** L
**Dependencies:** 0.6 (motion hooks), 0.2/0.3 (design tokens). Otherwise standalone.
**Parallel:** Yes (with 5.2, 5.3, 5.4)

### 5.2 — Architecture page

**Files:**
- `frontend/src/features/architecture/ArchitecturePage.tsx` (NEW)
- `frontend/src/features/architecture/ArchitectureNav.tsx` (NEW)
- `frontend/src/features/architecture/MermaidDiagram.tsx` (NEW)
- `frontend/src/features/architecture/TechStackStrip.tsx` (NEW)
- `frontend/src/features/architecture/ArchDecisionGrid.tsx` (NEW)
- `frontend/src/features/architecture/ApiReferenceTable.tsx` (NEW)
- `frontend/src/features/architecture/SimulationSection.tsx` (NEW)

**Changes:**
- **ArchitecturePage:** Documentation page. Modified nav with "Architecture Overview" title + "Back to App" link. Sections: Hero, Executive Overview, Tech Stack, 4 Mermaid diagrams, Architecture Decisions, API Reference, Simulation Architecture. Scroll-reveal on each section.
- **ArchitectureNav (NEW):** Simplified nav bar with title + back link. Renders instead of main Layout.
- **MermaidDiagram (NEW):** Wrapper component that renders Mermaid.js diagrams. Takes `definition` string prop. Lazy-loads mermaid library. 4 instances: System Overview (graph), Core Data Model (ER), Weekly Lifecycle (state machine), Commitment to Intelligence (sequence).
- **TechStackStrip:** 5-card horizontal strip: Spring Boot, React, PostgreSQL, Railway, TypeScript. Each card: icon, name, description.
- **ArchDecisionGrid:** 3-column grid of 12 ADR cards. Each: title, rationale summary.
- **ApiReferenceTable:** Table with columns: Method (GET/POST/PUT/DELETE badges), Path, Description, Auth (role chips).
- **SimulationSection:** 4 company narrative cards. Hardcoded content from simulation seed data.
**Complexity:** L
**Dependencies:** 0.2/0.3 (design tokens). Add `mermaid` npm dependency.
**Parallel:** Yes (with 5.1, 5.3, 5.4)

### 5.3 — Animation polish pass

**Files:** (multiple files across all features)
- All page-level components from Waves 2-4
- `frontend/src/hooks/useMotion.ts` (MODIFY if needed)
- `frontend/src/styles/global.css` (MODIFY if needed)

**Changes:**
- Audit every page for missing animations per DESIGN.md:
  - Card hover transitions (bg shift 150ms)
  - Button press translateY(1px)
  - Link underline slide-in
  - Tab switch cross-fade
  - Expand/collapse chevron rotation (180deg, 200ms)
  - Toast/notification slide-down with progress bar
  - Drag handle hover (muted to charcoal)
  - Checkbox checkmark scale overshoot
  - Focus ring fade-in
  - Skeleton loading on all data-fetching pages
- Ensure stagger timing is exactly 40ms per DESIGN.md (not 50ms as in current CSS).
- Verify no spring physics, parallax, confetti, or scale transforms on cards.
**Complexity:** M
**Dependencies:** Waves 2-4 complete (this is a polish pass)
**Parallel:** Yes (with 5.4)

### 5.4 — PDF export (client-side)

**Files:**
- `frontend/src/lib/pdfExport.ts` (NEW)
- `frontend/src/features/briefing/BriefingView.tsx` (MODIFY — wire export button)
- `frontend/package.json` (MODIFY — add html2pdf.js or jspdf dependency)

**Changes:**
- **pdfExport.ts (NEW):** Utility function `exportToPdf(elementRef, filename)`. Uses `html2canvas` + `jsPDF` (or `html2pdf.js`) to capture a DOM element as a styled PDF. Configures page size, margins, and Compass branding header/footer.
- **BriefingView:** Wire "Export PDF" button to call `exportToPdf` on the main content column (excluding chat sidebar).
- Add npm dependency: `html2pdf.js` (or `jspdf` + `html2canvas`).
**Complexity:** M
**Dependencies:** 3.1 (Briefing page must exist)
**Parallel:** Yes (with 5.1, 5.2, 5.3)

---

## Dependency Graph Summary

```
Wave 0 (Foundation)          Wave 1 (Backend)
    |                            |
    v                            v
Wave 2 (Core Pages) <-------- 1.1, 1.2, 1.4
    |
    v
Wave 3 (Advanced Pages) <--- 1.3
    |
    v
Wave 4 (New Experiences) --- 4.2 can start during Wave 3
    |
    v
Wave 5 (Polish + Standalone) --- 5.1, 5.2 can start after Wave 0
```

## Parallelism Matrix

| Wave | Can run in parallel with | Internal parallelism |
|------|-------------------------|---------------------|
| 0 | Wave 1 | 0.1-0.3 parallel; 0.4a-h parallel after 0.3; 0.5 last |
| 1 | Wave 0 | All tasks (1.1-1.5) fully parallel |
| 2 | — (needs Wave 0) | 2.1-2.4 all parallel |
| 3 | — (needs Wave 0+2) | 3.1-3.4 all parallel |
| 4 | — (needs Waves 1-3) | 4.1-4.2 mostly parallel |
| 5 | 5.1+5.2 can start after Wave 0 | 5.1-5.4 all parallel |

## Estimated Totals

| Wave | Tasks | S | M | L |
|------|-------|---|---|---|
| 0 | 14 | 7 | 4 | 1 |
| 1 | 5 | 1 | 3 | 1 |
| 2 | 4 | 0 | 2 | 2 |
| 3 | 4 | 0 | 1 | 3 |
| 4 | 2 | 0 | 1 | 1 |
| 5 | 4 | 0 | 2 | 2 |
| **Total** | **33** | **8** | **13** | **10** |

## Files Index

### New files to create (~45)

**Frontend components:**
- `frontend/src/components/Button.tsx`
- `frontend/src/components/Card.tsx`
- `frontend/src/components/Input.tsx`
- `frontend/src/components/Tooltip.tsx`
- `frontend/src/components/SkeletonLoader.tsx`
- `frontend/src/components/AIChatSidebar.tsx`
- `frontend/src/components/ChatBubble.tsx`

**Frontend hooks:**
- `frontend/src/hooks/useMotion.ts`
- `frontend/src/hooks/useBriefing.ts`
- `frontend/src/hooks/usePortfolio.ts`
- `frontend/src/hooks/useAIChat.ts`

**Frontend API + types:**
- `frontend/src/api/briefing.api.ts`
- `frontend/src/api/portfolio.api.ts`
- `frontend/src/types/briefing.types.ts`
- `frontend/src/types/portfolio.types.ts`

**My Week feature:**
- `frontend/src/features/my-week/CommitmentSummaryStrip.tsx`
- `frontend/src/features/my-week/RallyCrySidebar.tsx`
- `frontend/src/features/my-week/CycleHistorySelector.tsx`

**Reconciliation feature:**
- `frontend/src/features/reconciliation/ReconciliationBottomBar.tsx`
- `frontend/src/features/reconciliation/DisplacementQuickSignal.tsx`

**My Team feature:**
- `frontend/src/features/my-team/TeamSummaryCard.tsx`
- `frontend/src/features/my-team/TeamMetricsStrip.tsx`
- `frontend/src/features/my-team/PersonCard.tsx`
- `frontend/src/features/my-team/RallyCryCoverageCards.tsx`
- `frontend/src/features/my-team/ChessMiniBar.tsx`

**Briefing feature:**
- `frontend/src/features/briefing/BriefingNarrativeCard.tsx`
- `frontend/src/features/briefing/BriefingMetricsStrip.tsx`
- `frontend/src/features/briefing/BriefingCitations.tsx`
- `frontend/src/features/briefing/TeamHealthTable.tsx`

**Strategy feature:**
- `frontend/src/features/strategy/RallyCryColumn.tsx`
- `frontend/src/features/strategy/ObjectiveCard.tsx`
- `frontend/src/features/strategy/OutcomeRow.tsx`
- `frontend/src/features/strategy/StrategyModal.tsx`
- `frontend/src/features/strategy/StrategyBreadcrumb.tsx`
- `frontend/src/features/strategy/StrategyDropdownMenu.tsx`

**Settings feature:**
- `frontend/src/features/settings/OrganizationsTab.tsx`
- `frontend/src/features/settings/CreateOrgModal.tsx`

**Portfolio feature (all new):**
- `frontend/src/features/portfolio/PortfolioPage.tsx`
- `frontend/src/features/portfolio/PortfolioNarrativeCard.tsx`
- `frontend/src/features/portfolio/PortfolioMetricsStrip.tsx`
- `frontend/src/features/portfolio/CompanyCard.tsx`
- `frontend/src/features/portfolio/Sparkline.tsx`
- `frontend/src/features/portfolio/ComparisonTable.tsx`
- `frontend/src/features/portfolio/HealthGradeBadge.tsx`
- `frontend/src/features/portfolio/TrendArrow.tsx`

**Landing page (all new):**
- `frontend/src/features/landing/LandingPage.tsx`
- `frontend/src/features/landing/HeroSection.tsx`
- `frontend/src/features/landing/GridCanvas.tsx`
- `frontend/src/features/landing/ProblemSection.tsx`
- `frontend/src/features/landing/HowItWorksSection.tsx`
- `frontend/src/features/landing/RoleCardsSection.tsx`
- `frontend/src/features/landing/PreviewCardsSection.tsx`
- `frontend/src/features/landing/StatsStrip.tsx`
- `frontend/src/features/landing/LandingFooter.tsx`

**Architecture page (all new):**
- `frontend/src/features/architecture/ArchitecturePage.tsx`
- `frontend/src/features/architecture/ArchitectureNav.tsx`
- `frontend/src/features/architecture/MermaidDiagram.tsx`
- `frontend/src/features/architecture/TechStackStrip.tsx`
- `frontend/src/features/architecture/ArchDecisionGrid.tsx`
- `frontend/src/features/architecture/ApiReferenceTable.tsx`
- `frontend/src/features/architecture/SimulationSection.tsx`

**Backend:**
- `backend/src/main/java/com/compass/platform/domain/CompletionDay.java`
- `backend/src/main/java/com/compass/platform/domain/CompletionTimeBlock.java`
- `backend/src/main/java/com/compass/platform/domain/briefing/BriefingController.java`
- `backend/src/main/java/com/compass/platform/domain/briefing/BriefingService.java`
- `backend/src/main/java/com/compass/platform/domain/briefing/dto/BriefingResponse.java`
- `backend/src/main/java/com/compass/platform/domain/briefing/dto/BriefingSuggestion.java`
- `backend/src/main/java/com/compass/platform/domain/briefing/dto/BriefingCitation.java`
- `backend/src/main/java/com/compass/platform/domain/cycle/dto/CycleHistoryResponse.java`
- `backend/src/main/resources/db/migration/V020__add_completion_day_timeblock.sql`
- `frontend/src/lib/pdfExport.ts`

### Files to modify (~40)

**Foundation:**
- `frontend/index.html`
- `frontend/tailwind.config.ts`
- `frontend/src/styles/global.css`
- `frontend/src/App.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/Badge.tsx`
- `frontend/src/components/ConfirmDialog.tsx`
- `frontend/src/components/EmptyState.tsx`
- `frontend/src/components/LoadingSpinner.tsx`
- `frontend/src/components/PageHeader.tsx`

**Types/API:**
- `frontend/src/types/enums.ts`
- `frontend/src/types/commitment.types.ts`
- `frontend/src/api/rcdo.api.ts`
- `frontend/src/api/cycles.api.ts`
- `frontend/src/api/users.api.ts`
- `frontend/src/hooks/useCycle.ts`

**My Week / Commit Entry:**
- `frontend/src/features/my-week/MyWeekPage.tsx`
- `frontend/src/features/my-week/CoverageStrip.tsx`
- `frontend/src/features/commit-entry/CommitmentCard.tsx`
- `frontend/src/features/commit-entry/CommitmentList.tsx`
- `frontend/src/features/commit-entry/CommitmentForm.tsx`
- `frontend/src/features/commit-entry/HorizonSelector.tsx`
- `frontend/src/features/commit-entry/CategorySelector.tsx`
- `frontend/src/features/commit-entry/TaskBulletEditor.tsx`
- `frontend/src/features/commit-entry/AssignmentAttribution.tsx`
- `frontend/src/features/commit-entry/RcdoAutocomplete.tsx`
- `frontend/src/features/shared/StrategyLinker.tsx`

**Weekly Lifecycle:**
- `frontend/src/features/weekly-lifecycle/CarryForwardPanel.tsx`
- `frontend/src/features/weekly-lifecycle/CycleStateIndicator.tsx`
- `frontend/src/features/weekly-lifecycle/TransitionActions.tsx`

**Reconciliation:**
- `frontend/src/features/reconciliation/PlannedVsActualTable.tsx`
- `frontend/src/features/reconciliation/CommitmentStatusMarker.tsx`
- `frontend/src/features/reconciliation/UnplannedWorkEntry.tsx`
- `frontend/src/features/reconciliation/DisplacementCapture.tsx`
- `frontend/src/features/reconciliation/ChangeReasonCapture.tsx`

**Briefing:**
- `frontend/src/features/briefing/BriefingView.tsx`
- `frontend/src/features/briefing/DrillDownBreadcrumb.tsx`
- `frontend/src/features/briefing/levels/RallyCryLevel.tsx`
- `frontend/src/features/briefing/levels/RallyCryDetailLevel.tsx`
- `frontend/src/features/briefing/levels/TeamDetailLevel.tsx`
- `frontend/src/features/briefing/levels/PersonDetailLevel.tsx`

**My Team:**
- `frontend/src/features/my-team/MyTeamPage.tsx`
- `frontend/src/features/my-team/TeamAnalytics.tsx`

**Strategy:**
- `frontend/src/features/strategy/StrategyPage.tsx`

**Settings:**
- `frontend/src/features/settings/SettingsPage.tsx`
- `frontend/src/features/settings/ProfileTab.tsx`
- `frontend/src/features/settings/AdminTab.tsx`

**Backend:**
- `backend/src/main/java/com/compass/platform/domain/commit/Commitment.java`
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentService.java`
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentRepository.java`
- `backend/src/main/java/com/compass/platform/domain/commit/CommitmentMapper.java`
- `backend/src/main/java/com/compass/platform/domain/commit/dto/CreateCommitmentRequest.java`
- `backend/src/main/java/com/compass/platform/domain/commit/dto/UpdateCommitmentRequest.java`
- `backend/src/main/java/com/compass/platform/domain/commit/dto/CommitmentResponse.java`
- `backend/src/main/java/com/compass/platform/domain/rcdo/RcdoController.java`
- `backend/src/main/java/com/compass/platform/domain/rcdo/RcdoService.java`
- `backend/src/main/java/com/compass/platform/domain/cycle/CycleController.java`
- `backend/src/main/java/com/compass/platform/domain/cycle/CycleService.java`
- `backend/src/main/java/com/compass/platform/domain/dashboard/DashboardService.java`

### NPM dependencies to add
- `mermaid` (for Architecture page diagrams)
- `html2pdf.js` or `jspdf` + `html2canvas` (for PDF export)
