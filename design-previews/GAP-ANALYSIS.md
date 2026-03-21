# Gap Analysis: Mockup Designs vs. Current Frontend

Generated: 2026-03-20

This document catalogs every distinct UI element, interaction, and data display across the 10 mockup files, then classifies each against the current frontend implementation.

**Legend:**
- **EXISTS** — Already built in the current app
- **NEEDS_RESTYLE** — Exists but needs visual redesign to match mockup
- **NEEDS_ENHANCEMENT** — Partially exists but needs new functionality added
- **NEW** — Doesn't exist at all, needs to be built from scratch

---

## Global: Design System & Navigation

The mockups define a complete design system ("Compass") with Inter + Newsreader typography, a warm neutral palette (#F9F9F7 surfaces, #036A6A accent, #E8E5E0 borders), whisper shadows, and staggered fade-up animations. The current app uses a dark-mode Tailwind utility class approach with blue accent colors and no serif typography.

| Feature | Status | Notes |
|---|---|---|
| Brand name "compass" in Newsreader serif, small-caps | **NEW** | Current app shows "Compass" in bold sans-serif |
| Warm neutral surface palette (#F9F9F7, #EEEEEC, etc.) | **NEW** | Current app is dark-mode (gray-950, gray-900) |
| Newsreader serif for headlines/headings | **NEW** | Current app uses Inter/system sans-serif throughout |
| Inter for body/labels with uppercase tracking | **NEEDS_RESTYLE** | Inter is used but label styling differs |
| Sticky nav with top bar + tab bar (two-row) | **NEEDS_RESTYLE** | Layout.tsx has a single-row nav bar; mockup has brand + cycle info on top row, tabs on second row |
| Week/cycle display in nav center | **NEEDS_ENHANCEMENT** | Current nav shows no cycle info |
| Avatar initials (square, 4px radius, accent bg) | **NEW** | Current has a round gray avatar |
| Gear icon linking to Settings | **EXISTS** | Layout.tsx has a gear icon NavLink to /settings |
| Staggered fade-up entrance animations | **NEW** | No entrance animations in current components |
| CSS custom properties design token system | **NEW** | Current uses Tailwind classes directly |
| Responsive grid (900px breakpoint) | **NEEDS_ENHANCEMENT** | Current responsive handling is minimal |
| Whisper shadow (subtle 12px 32px blur) | **NEW** | Current uses Tailwind shadow-sm |

---

## Mockup 01: My Week

**Current component:** `MyWeekPage.tsx` + `CommitmentList.tsx` + `CommitmentCard.tsx` + `CoverageStrip.tsx`

| Feature | Status | Notes |
|---|---|---|
| Two-column layout (65% main / 35% sidebar) | **NEW** | Current is single-column layout |
| Cycle state banner with colored dot + state chip | **NEEDS_RESTYLE** | Exists as a full-width bar with Badge component; mockup has a compact chip with dot |
| Cycle history pills (Week 6, Week 5, etc.) | **NEW** | No cycle history navigation exists |
| "Lock Commitments" button with lock icon | **NEEDS_ENHANCEMENT** | Cycle transitions exist but no explicit "Lock" button in the mockup's style |
| Tooltip on disabled Lock button | **NEW** | No tooltip behavior on cycle actions |
| Commitment Summary Strip (inline metrics bar) | **NEW** | No summary strip showing counts by category |
| Carry-forward panel with warning left-border | **NEEDS_RESTYLE** | Carry-forward banner exists but simpler (blue, list-only); mockup has task checkboxes, "Why carried" notes, Accept/Decline buttons |
| Carry-forward Accept/Decline buttons | **NEEDS_ENHANCEMENT** | Current shows items as read-only list; no accept/decline actions |
| Carry-forward task checkboxes showing partial completion | **NEEDS_ENHANCEMENT** | Current doesn't show sub-task status from prior week |
| "Why carried" notes block | **NEEDS_ENHANCEMENT** | No displacement/carry reason displayed in the carry-forward panel |
| "Assigned to You" section with distinct styling | **NEW** | No visual distinction between assigned vs. self-directed commitments in the list |
| Assigned card with accent left-border + "A" rank badge | **NEW** | Current cards don't differentiate assigned items |
| "Assigned by [name]" label with person icon | **NEW** | AssignmentAttribution component exists in CommitmentForm but not displayed on cards |
| Drag handle (braille dots icon) on cards | **NEW** | No drag-and-drop reordering in the UI (API supports reorder) |
| Priority rank circle (#1, #2, etc.) | **NEEDS_RESTYLE** | Current shows rank as a small gray circle with number; mockup design is more refined |
| Commitment card with hover edit pencil | **NEEDS_RESTYLE** | Current cards have explicit Edit/Delete buttons; mockup uses hover-reveal pencil |
| Expandable task bullets with chevron toggle | **NEEDS_ENHANCEMENT** | TaskBulletEditor exists in CommitmentForm; CommitmentCard may not show expandable bullets inline |
| Task bullet checkboxes (interactive) | **NEEDS_ENHANCEMENT** | Bullets exist but interactive checkbox toggling on the card view is new |
| CHESS category pill (colored: Strategic, Operational, etc.) | **NEEDS_RESTYLE** | Current shows category as text/badge; mockup has tonal background pills |
| Horizon pill (EOW, EOD, MORNING, AFTERNOON) | **NEEDS_RESTYLE** | HorizonSelector exists in form; display on cards needs mockup-style pills |
| Rally cry link on card ("-> Launch Enterprise Tier") | **NEEDS_RESTYLE** | RCDO link displayed as small gray text; mockup shows it as accent-colored link |
| "Unlinked" italic indicator | **EXISTS** | Current shows unlinked state |
| "+ Add commitment" dashed button | **NEEDS_RESTYLE** | Current has a solid blue "Add Commitment" button; mockup uses dashed border outline style |
| **Sidebar: "This Week's Priorities" heading** | **NEW** | No sidebar exists |
| Rally Cry cards in sidebar with description | **NEW** | Rally cries not shown on My Week page |
| Rally Cry objectives with "X linked" counts | **NEW** | Coverage data not displayed on My Week |
| "Link ->" button on each Rally Cry | **NEW** | No quick-link action from My Week sidebar |
| Coverage section showing unlinked commitments | **NEEDS_RESTYLE** | CoverageStrip exists but simpler; mockup shows specific unlinked items with warning icon |
| Reconciliation hint (dashed border preview of recon fields) | **NEW** | No inline reconciliation preview during DRAFT |

---

## Mockup 02: Commitment Form (Slide-Over)

**Current component:** `CommitmentForm.tsx` + `HorizonSelector.tsx` + `CategorySelector.tsx` + `TaskBulletEditor.tsx` + `AssignmentAttribution.tsx` + `StrategyLinker.tsx`

| Feature | Status | Notes |
|---|---|---|
| Right-side slide-over panel (440px) | **EXISTS** | CommitmentForm uses Headless UI Dialog with slide-over transition |
| Dark overlay behind panel | **EXISTS** | Transition.Child renders overlay |
| Panel header "New Commitment" in Newsreader serif | **NEEDS_RESTYLE** | Current uses standard font |
| Close button (X) with hover state | **EXISTS** | Present in current form |
| Title field (underline-style input) | **NEEDS_RESTYLE** | Current uses bordered input; mockup uses underline-only style |
| Validation error message ("Title is required") | **EXISTS** | Zod + react-hook-form validation exists |
| Task bullets with drag handles | **EXISTS** | TaskBulletEditor exists with drag capability |
| Task bullet add/remove with count (3 of 5) | **EXISTS** | Max 5, min 2 bullets enforced |
| CHESS Category 2x2 card grid with left-border colors | **NEEDS_RESTYLE** | CategorySelector exists but likely uses different visual treatment |
| Category card descriptions ("Drives long-term objectives") | **NEEDS_ENHANCEMENT** | Current selector may not show descriptions |
| Selected category checkmark indicator | **NEEDS_RESTYLE** | Current selection style differs |
| Two-row horizon picker (Day: Mon-Fri + Time: Morning-EOD) | **NEEDS_ENHANCEMENT** | HorizonSelector exists but mockup shows a two-row day+time picker; current may be a single dropdown/selector |
| Strategy link badge (breadcrumb-style showing RC > DO > Outcome) | **NEEDS_RESTYLE** | StrategyLinker exists; visual treatment differs |
| Strategy popover (searchable dropdown with RC/DO/Outcome tree) | **EXISTS** | StrategyLinker component with autocomplete exists (RcdoAutocomplete.tsx) |
| "Mark as non-strategic" button in popover | **NEEDS_ENHANCEMENT** | May not exist in current popover |
| Change/Clear links for strategy link | **NEEDS_ENHANCEMENT** | Current may handle differently |
| Attribution section (Self-directed / Assigned by toggle) | **EXISTS** | AssignmentAttribution component exists |
| Manager dropdown when "Assigned by" selected | **EXISTS** | Dropdown present in AssignmentAttribution |
| Notes textarea (optional) | **NEEDS_ENHANCEMENT** | May not exist in current form |
| "Save Commitment" + "Cancel" footer buttons | **EXISTS** | Form has submit/cancel actions |
| Slide-in/slide-out CSS animations | **EXISTS** | Headless UI transitions handle this |

---

## Mockup 03: Reconciliation (Planned vs. Actual)

**Current component:** `PlannedVsActualTable.tsx` + `CommitmentStatusMarker.tsx` + `UnplannedWorkEntry.tsx` + `DisplacementCapture.tsx` + `ChangeReasonCapture.tsx` + `CarryForwardPanel.tsx`

| Feature | Status | Notes |
|---|---|---|
| "Reconciling" cycle state banner with amber dot | **EXISTS** | MyWeekPage shows RECONCILING state banner |
| "Complete Reconciliation" disabled button | **EXISTS** | Submit button disabled until all reconciled |
| Unplanned work prompt banner | **NEEDS_RESTYLE** | UnplannedWorkEntry exists; mockup has a more prominent CTA banner |
| Existing unplanned work card with "Unplanned" badge | **NEEDS_ENHANCEMENT** | Unplanned items display exists but mockup shows richer card with "Requested by" attribution |
| Inline "Add Unplanned Work" form with all fields | **NEEDS_RESTYLE** | UnplannedWorkEntry exists; visual treatment differs |
| "Planned vs. Actual" section heading | **EXISTS** | PlannedVsActualTable has this concept |
| Accordion commitment cards (click to expand) | **NEEDS_RESTYLE** | Current PlannedVsActualTable may use different expand pattern; mockup has explicit accordion with chevron |
| Collapsed header row showing #, title, pills, status pill | **NEEDS_RESTYLE** | Exists but visual treatment differs significantly |
| Two-column Planned/Actual layout inside expanded card | **NEEDS_RESTYLE** | PlannedVsActualTable exists; mockup shows side-by-side columns |
| Status selector buttons (Completed / Partial / Not Started) | **EXISTS** | CommitmentStatusMarker provides these |
| Status helper text descriptions | **NEW** | Mockup shows inline descriptions under each status button |
| Carry-forward toggle (Yes/No buttons) | **EXISTS** | CarryForwardPanel exists |
| Displacement signal section ("What took priority?") | **NEEDS_ENHANCEMENT** | DisplacementCapture exists; mockup adds "quick signal" badge for unplanned displacement and multi-commitment selector |
| Quick-signal badge ("Unplanned work displaced this") | **NEW** | One-click displacement flag doesn't exist |
| Specific displacing commitment selector (checkbox list) | **NEW** | Mockup shows checkboxes listing other commitments that displaced this one |
| Bullet status checkboxes in reconciliation | **EXISTS** | Bullet-level reconciliation exists |
| "What changed and why?" notes textarea with char count | **NEEDS_ENHANCEMENT** | ChangeReasonCapture exists; char count display may be new |
| Displacement category dropdown (Manager Reassigned, Production Emergency, etc.) | **EXISTS** | DisplacementCapture has category selection |
| "Which commitment took its place?" dropdown | **NEEDS_ENHANCEMENT** | May not exist as a separate field |
| Reconciliation progress bar (3 of 4) | **EXISTS** | Progress bar shown in RECONCILING state |
| Fixed bottom bar with progress + submit button | **NEW** | Mockup has a sticky bottom bar; current puts submit inline |
| Status pills in collapsed view (Completed, Partial, Not Started, Carried Fwd) | **NEEDS_RESTYLE** | Status shown but not as colored pills in collapsed headers |

---

## Mockup 04: The Briefing

**Current component:** `BriefingView.tsx` + `RallyCryLevel.tsx` + `RallyCryDetailLevel.tsx` + `TeamDetailLevel.tsx` + `PersonDetailLevel.tsx` + `DrillDownBreadcrumb.tsx`

| Feature | Status | Notes |
|---|---|---|
| Two-column layout (70% main / 30% AI sidebar) | **NEEDS_RESTYLE** | Current BriefingView is full-width; no persistent AI sidebar |
| AI Briefing narrative card with generated timestamp | **NEEDS_ENHANCEMENT** | RallyCryLevel shows overview data; mockup has a dedicated AI narrative card |
| "Export PDF" button | **NEW** | No PDF export functionality |
| "Weekly Intelligence Summary" headline | **NEEDS_ENHANCEMENT** | Content exists as data; mockup wraps it in a formal AI briefing narrative |
| AI-generated prose paragraph (alignment %, coverage, carry-forward) | **NEEDS_ENHANCEMENT** | Metrics displayed as cards/numbers; mockup shows natural language narrative |
| "View sources" expandable section with citations | **NEW** | No source citation or validation display |
| Source references with data point counts and "View breakdown" links | **NEW** | Citations with links back to source data don't exist |
| "Suggested Focus Areas" list | **NEEDS_ENHANCEMENT** | Focus suggestions may exist in drill-down; mockup shows them prominently |
| Key Metrics Strip (5 cards: Alignment, Coverage, Carry-Forward, Completion, Drift) | **NEEDS_RESTYLE** | Health metrics exist in observatory; mockup shows them as a 5-card grid strip |
| Metric count-up animation | **NEW** | No count-up animations exist |
| Rally Cry Coverage section (3-column grid of rally cry cards) | **NEEDS_RESTYLE** | RallyCryLevel shows rally cries; mockup has a different card layout with description, linked counts, gap warnings |
| Rally cry card with amber left-border for coverage gap | **NEEDS_ENHANCEMENT** | Coverage gap highlighting may exist; visual treatment differs |
| Rally cry drill-down toggle ("Show linked commitments") | **EXISTS** | Drill-down functionality exists via drill-to navigation |
| Per-person commitment list under rally cry | **EXISTS** | RallyCryDetailLevel shows this |
| Team Health table (Team Lead, Headcount, Strategic %, Coverage, Drift, Carry-Forward) | **NEEDS_RESTYLE** | TeamRollupTable and related components exist; mockup has a specific table design |
| Drift Signal column with "Sustained" / "Emerging" labels | **EXISTS** | DriftSignalList exists |
| Row hover with chevron reveal | **NEW** | Table rows don't have hover chevrons |
| Warning row left-border (amber for drift) | **NEEDS_ENHANCEMENT** | Drift highlighting exists but border style differs |
| **AI Chat Sidebar** (full-height, sticky) | **NEW** | No conversational AI chat interface exists anywhere in the app |
| Chat bubbles (user/AI) with conversation history | **NEW** | No chat UI |
| Chat input with send button | **NEW** | No chat input |
| "Powered by AI" footer | **NEW** | No AI attribution display |

---

## Mockup 05: My Team

**Current component:** `MyTeamPage.tsx` + `TeamAnalytics.tsx` + `TeamRollupTable.tsx`

| Feature | Status | Notes |
|---|---|---|
| Page header with "My Team" title + week selector pills | **NEEDS_ENHANCEMENT** | Title exists; cycle history pills are new |
| AI-generated Team Summary card | **NEEDS_ENHANCEMENT** | MyTeamPage shows TeamOverview with stats; mockup has AI narrative text |
| "Suggested Actions" list with arrow bullets | **NEEDS_ENHANCEMENT** | Current doesn't show AI suggestions on MyTeamPage |
| Metrics strip (4 cards: Team Size, Coverage, Carry-Forward, Unlinked) | **NEEDS_RESTYLE** | Metrics shown inline in TeamOverview; mockup has a 4-card grid |
| Metric count-up animation | **NEW** | No animations |
| Rally Cry Coverage section (card per rally cry) | **NEEDS_ENHANCEMENT** | CoverageGaps component shows gaps; mockup shows all rally cries with allocation counts |
| Gap-flagged rally cry (amber left-border, "0 commitments") | **NEEDS_RESTYLE** | CoverageGaps shows these; visual treatment differs |
| Team Members section with "Assign Work" button | **NEEDS_RESTYLE** | Team member list exists; "Assign Work" button exists |
| Person card with expand/collapse accordion | **EXISTS** | PersonCard in MyTeamPage has expand/collapse |
| CHESS mini-bar (horizontal stacked bar per person) | **NEW** | No CHESS distribution bar on person cards |
| Person stats (X commitments, X linked) | **EXISTS** | Shown in PersonCard |
| Carried badge (amber pill) | **NEEDS_RESTYLE** | Shown in code; visual style differs |
| Drift signal text per person ("Alignment down Sustained") | **NEEDS_ENHANCEMENT** | Not shown per-person in current implementation |
| Status dot (teal/amber/rose) per person | **NEW** | No per-person health dot |
| Expanded commitment list with CHESS chips + RCDO chips | **EXISTS** | CommitmentList in expanded PersonCard shows these |
| Coverage summary chips per person | **NEEDS_ENHANCEMENT** | Coverage chips may not be per-person in current |
| Unlinked chip (rose colored) | **NEEDS_RESTYLE** | Unlinked shown but color may differ |
| Carried chip on specific commitments | **EXISTS** | Carried forward badge shown on commitments |
| **Assign Work Slide-Over Form** | **EXISTS** | AssignWorkForm component exists in MyTeamPage |
| Assign to dropdown | **EXISTS** | Employee select exists |
| Commitment title field | **EXISTS** | Title input exists |
| Task bullets with numbered rows + drag handles | **NEEDS_RESTYLE** | Bullets exist; mockup shows numbered + drag handles |
| CHESS Category 2x2 grid | **NEEDS_RESTYLE** | Select dropdown in current; mockup shows 2x2 grid |
| Day picker (Mon-Fri pills) | **NEEDS_ENHANCEMENT** | Current form has CompletionHorizon as EOW default; mockup shows day+time pill selectors |
| Time block picker (Morning-EOD pills) | **NEEDS_ENHANCEMENT** | Same as above |
| Strategy link display | **NEEDS_RESTYLE** | Strategy linker shown as text; mockup shows breadcrumb-style |
| Notes textarea | **NEEDS_ENHANCEMENT** | May not exist in current AssignWorkForm |

---

## Mockup 06: Strategic Framework

**Current component:** `StrategyPage.tsx`

| Feature | Status | Notes |
|---|---|---|
| Breadcrumb ("The Briefing > Strategic Framework") | **NEW** | No breadcrumb navigation exists |
| Page header with title + description + stats | **NEEDS_RESTYLE** | Current has simpler header |
| Column-based board layout (horizontal scroll, one column per Rally Cry) | **NEW** | Current StrategyPage uses a vertical card list; mockup uses a horizontal Kanban-style board |
| Rally Cry column header with title, description, stats, accent bottom border | **NEEDS_RESTYLE** | Current shows RallyCryCard with expand/collapse; mockup uses column headers |
| Three-dot menu on Rally Cry / Objective / Outcome | **NEEDS_RESTYLE** | Current uses hover-reveal archive button; mockup uses three-dot dropdown menu |
| Dropdown menu with Edit / Archive options | **NEEDS_ENHANCEMENT** | Current has inline edit + archive button; mockup has a dropdown |
| Objective cards within rally cry column | **NEEDS_RESTYLE** | ObjectiveCard exists; visual layout differs (column body vs. nested accordion) |
| Objective description + owner badge + linked count | **EXISTS** | ObjectiveCard shows these |
| Outcomes divider + outcomes list | **EXISTS** | OutcomeItem list under objectives |
| Outcome row with bullet, title, owner, linked count | **NEEDS_RESTYLE** | Exists but layout differs; mockup shows a row with multiple inline elements |
| Amber "No commitments" tag on outcomes with 0 linked | **NEW** | No visual flag for unlinked outcomes |
| Archive confirmation inline dialog | **EXISTS** | ArchiveButton has confirm step |
| "+ Add outcome" link per objective | **EXISTS** | InlineAddForm for outcomes |
| "+ Add objective" link per rally cry | **EXISTS** | InlineAddForm for objectives |
| "+ Add Rally Cry" column-style dashed button | **NEEDS_RESTYLE** | Current uses text link; mockup has a full column-height dashed button |
| Modal dialog for adding Rally Cry / Objective / Outcome | **NEW** | Current uses inline forms; mockup shows a centered modal dialog |
| Modal with title, breadcrumb context, title input, description textarea, owner select | **NEW** | InlineAddForm exists but modal presentation is new |
| Vertical separator lines between columns | **NEW** | Visual-only element for column board layout |

---

## Mockup 07: Settings

**Current component:** `SettingsPage.tsx` + `ProfileTab.tsx` + `AdminTab.tsx`

| Feature | Status | Notes |
|---|---|---|
| Page title "Settings" in Newsreader serif | **NEEDS_RESTYLE** | Current uses bold sans-serif |
| Three-tab bar (Profile, Admin, Organizations) | **NEEDS_ENHANCEMENT** | Current has 2 tabs (Profile, Admin); mockup adds Organizations tab |
| **Profile Tab** | | |
| Profile card with label/value rows | **EXISTS** | ProfileTab exists |
| Display Name with inline edit (pencil icon) | **EXISTS** | ProfileTab has inline edit |
| Email (read-only) | **EXISTS** | Shown in ProfileTab |
| Role badge (EXECUTIVE) | **EXISTS** | Shown in ProfileTab |
| Reports To field | **NEEDS_ENHANCEMENT** | May not be in current ProfileTab |
| Cost Band field | **NEEDS_ENHANCEMENT** | May not be in current ProfileTab |
| Organization field | **NEEDS_ENHANCEMENT** | May not be in current ProfileTab |
| **Admin Tab** | | |
| Toolbar with search input + role filter + status filter + Add User button | **NEEDS_ENHANCEMENT** | AdminTab exists; search/filter toolbar completeness varies |
| User table (Name, Email, Role, Reports To, Cost Band, Status, Actions) | **EXISTS** | AdminTab has user table |
| Role chips (EXEC, DIRECTOR, MANAGER, IC, ANALYST) | **EXISTS** | Role display exists |
| Status dot (Active/Inactive) | **EXISTS** | Status shown |
| Action links (Edit, Deactivate, Reactivate) | **EXISTS** | Actions exist in AdminTab |
| Staggered row fade-in animation | **NEW** | No row animations |
| Table footer with user count | **NEEDS_ENHANCEMENT** | May not show count |
| Add User slide-over with all fields | **EXISTS** | Admin likely has add user form |
| Deactivate confirmation modal | **EXISTS** | ConfirmDialog pattern used elsewhere |
| **Organizations Tab** | **NEW** | No Organizations tab exists |
| Current org card with accent left-border + "Current" badge | **NEW** | No org display |
| Org metadata (timezone, users, created date) | **NEW** | No org metadata display |
| "+ Create Organization" button | **NEW** | No org creation UI |
| Portfolio Organizations list with "Switch" action | **NEW** | No multi-org switching |
| Create Organization modal (name + timezone) | **NEW** | No org creation modal |

---

## Mockup 08: Portfolio Overview

**Current component:** None (no portfolio view exists)

| Feature | Status | Notes |
|---|---|---|
| **Entire Portfolio page** | **NEW** | No portfolio route or page exists |
| Modified nav with "Portfolio Overview" center label | **NEW** | Nav doesn't support portfolio mode |
| "Portfolio" nav tab (replaces standard 3-tab nav) | **NEW** | No portfolio navigation |
| Company switcher dropdown in nav | **NEW** | No org/company switching in nav |
| Cycle history pills | **NEW** | No cycle history on portfolio level |
| AI Portfolio narrative card | **NEW** | No portfolio-level AI briefing |
| Portfolio Metrics Strip (4 cards) | **NEW** | No portfolio metrics |
| Company cards with health grade border (teal/amber/rose) | **NEW** | No company card components |
| Company metrics row (Alignment, Coverage, Carry-Forward, Completion) | **NEW** | No per-company metrics display |
| Sparkline alignment trend charts (SVG) | **NEW** | No sparkline charts |
| Rally cry summary per company with status dots | **NEW** | No per-company rally cry summary |
| Drift signals row per company | **NEW** | No company-level drift display |
| Comparative Analysis table across companies | **NEW** | No cross-company comparison |
| Health Grade badges (On Track, Watch, At Risk) | **NEW** | No health grade system |
| Trend arrows (up/down/flat) | **NEW** | No trend indicators |
| AI Chat Sidebar (portfolio-scoped) | **NEW** | No AI chat at any level |
| Metric count-up animations | **NEW** | No animations |
| Sparkline draw animations | **NEW** | No SVG animations |

---

## Mockup 09: Landing Page

**Current component:** None (no marketing/landing page exists)

| Feature | Status | Notes |
|---|---|---|
| **Entire Landing page** | **NEW** | No landing/marketing page exists |
| Hero section with Compass branding | **NEW** | No hero |
| Animated canvas-based grid background | **NEW** | No canvas animations |
| Hero headline + subtitle + CTA buttons | **NEW** | No marketing copy |
| "The Problem" section (3-column grid) | **NEW** | No problem statement |
| "How Compass Works" 4-step flow | **NEW** | No how-it-works section |
| Step connector lines with draw animation | **NEW** | No step animations |
| "Built for Every Level" role cards (IC, Manager, Exec) | **NEW** | No role-based marketing |
| "See It in Action" preview cards | **NEW** | No view preview cards |
| "By the Numbers" stats strip | **NEW** | No stats strip |
| Footer with brand + attribution | **NEW** | No landing footer |
| Scroll-reveal IntersectionObserver animations | **NEW** | No scroll animations |
| Section gradient transitions | **NEW** | No gradient transitions |

---

## Mockup 10: Architecture Overview

**Current component:** None (no architecture documentation page exists)

| Feature | Status | Notes |
|---|---|---|
| **Entire Architecture page** | **NEW** | No architecture documentation route |
| Modified nav with "Architecture Overview" title | **NEW** | No page-specific nav title |
| "Back to App" nav link | **NEW** | No cross-page nav links |
| Hero with "System Architecture" headline | **NEW** | No arch hero |
| Executive Overview narrative card | **NEW** | No executive summary |
| Tech Stack 5-card strip | **NEW** | No tech stack display |
| Mermaid diagram: System Overview (graph) | **NEW** | No diagrams |
| Mermaid diagram: Core Data Model (ER) | **NEW** | No ER diagrams |
| Mermaid diagram: Weekly Lifecycle State Machine | **NEW** | No state machine diagrams |
| Mermaid diagram: Commitment to Intelligence (sequence) | **NEW** | No sequence diagrams |
| Architecture Decisions 3-column card grid (12 cards) | **NEW** | No ADR display |
| REST API table with method badges + auth chips | **NEW** | No API reference |
| Simulation Architecture section (4 company narratives) | **NEW** | No simulation documentation |
| IntersectionObserver scroll reveal for sections | **NEW** | No scroll animations |

---

## Summary Statistics

| Category | Count |
|---|---|
| **EXISTS** | ~35 features |
| **NEEDS_RESTYLE** | ~40 features |
| **NEEDS_ENHANCEMENT** | ~35 features |
| **NEW** | ~100+ features |

### Key Themes

1. **Design system overhaul** — The biggest single effort is migrating from dark-mode Tailwind utilities to the warm neutral "Executive Intelligence" design system with Newsreader serif typography, CSS custom properties, and motion tokens.

2. **Two entirely new pages** — Portfolio Overview (mockup 08) and the Landing/Marketing page (mockup 09) are complete greenfield builds with no existing code to build on.

3. **Architecture page is documentation** — Mockup 10 is an interactive documentation page with Mermaid diagrams; functionally separate from the app itself.

4. **AI Chat Sidebar** — Appears in Briefing (mockup 04) and Portfolio (mockup 08); no conversational AI interface exists anywhere in the current app.

5. **Strategy board layout** — Current StrategyPage uses a vertical accordion; mockup 06 calls for a horizontal column-based Kanban board, which is a significant layout rewrite.

6. **My Week sidebar** — Mockup 01 introduces a right sidebar with rally cry context and coverage; current My Week is single-column.

7. **Animation layer** — Every mockup includes staggered fade-up entrance animations, count-up metrics, sparkline draws, and scroll-reveal patterns. The current app has zero animation.

8. **Organizations management** — Mockup 07 adds an Organizations tab to Settings with multi-org support and company switching. This requires both frontend and backend work.
