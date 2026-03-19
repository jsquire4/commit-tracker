# ST6 Product Design — Comprehensive Redesign Plan

## The Problem

The app has pages but not a product. Each view was built independently without a unified information architecture. The result: executives can't interpret dashboards, managers can't take action from what they see, employees get no feedback on whether their work connects to strategy, and nobody can set strategy from within the app itself.

## What Good Looks Like (from research)

The best tools in this space share these patterns:

1. **Tability's "My Focus" model**: ICs see a clear personal entry point with red-dot indicators on items needing attention. Three-field check-in form (metric, confidence, note). Simple, fast, opinionated.

2. **15Five's manager review queue**: Managers process direct reports' check-ins sequentially. Each answer is a card with actions: comment, pass up, flag for follow-up, add to 1-on-1 agenda. Review takes ~5 min per IC.

3. **Perdoo's Strategy Map**: Visual hierarchy from strategic pillars → company objectives → team objectives → individual work. Executives see alignment gaps as disconnected nodes on the map.

4. **Tability's forced resolution rule**: If confidence is "at risk" for 2 consecutive weeks, the third week forces green or red. Prevents perpetual ambiguity.

5. **Cascade's executive briefing (Tapestry AI)**: Auto-generated narrative summaries organized by strategic objective, surfacing risks and recommending focus areas.

**The key insight across all tools**: The executive's view should be organized by **strategic objective first, then people second**. No tool does this perfectly — ST6 can.

## The ST6 Information Architecture

### Three Layers

```
STRATEGY (set once, updated quarterly)
  Rally Cries → Defining Objectives → Outcomes
  Set by: Executive
  Visible to: Everyone

EXECUTION (weekly cycle)
  Commitments → Reconciliation
  Done by: Everyone
  Reviewed by: Managers

INSIGHT (derived, always current)
  Briefing → Team Health → Observatory Detail
  Consumed by: Leadership
```

### Navigation (role-aware, 5 tabs max)

**Everyone sees:**
- **My Week** — personal commitment entry + reconciliation (the 15-5)
- **Lifecycle** — cycle state, transitions, carry-forward

**Managers+ also see:**
- **My Team** — review queue, assignment, team health narrative

**Directors+ also see:**
- **Briefing** — rally-cry-organized narrative + observatory data
- **Strategy** — create/manage rally cries, objectives, outcomes

This is 5 tabs maximum for an executive. Each tab has a clear purpose tied to a verb: Write (My Week), Manage (Lifecycle), Review (My Team), Understand (Briefing), Direct (Strategy).

## Page-by-Page Redesign

### 1. My Week (`/`) — "Write your 15-5"

**Current state**: CommitEntryPage — functional but lacks guidance and context.

**What to keep**: CommitmentCard, CommitmentForm, CommitmentList, drag reorder, RCDO autocomplete, the full creation/edit/delete flow. This works.

**What to add:**
- **Header context**: Show which rally cries exist and how many of your commitments link to each. Live feedback: "3 of 4 commitments are linked to a rally cry."
- **Carry-forward banner**: If items carried from last week, show them prominently at the top with "Resolve or continue" prompts.
- **Assigned work section**: Commitments assigned BY your manager appear in a separate "Assigned to you" section above your self-directed work. (Requires manager assignment flow — see My Team below.)
- **State-sensitive layout**: When cycle is RECONCILING, show inline reconciliation controls on each card (status dropdown, notes field, displacement capture) instead of requiring navigation to a separate reconciliation page. Keep the full reconciliation page as a fallback route.
- **Week summary**: When RECONCILED, show completion summary inline: "You completed 3 of 4. 1 carried forward."

**What to change:**
- Page title: "My Week" not just the cycle label
- Add coverage indicator showing rally cry alignment
- Add "suggested" commitments when RCDO coverage gaps exist for the user's team

### 2. Lifecycle (`/cycle`) — "Where are we in the week?"

**Current state**: WeeklyLifecyclePage — transition buttons + carry-forward panel + stubbed history.

**What to keep**: CycleStateIndicator, TransitionActions (with role guard), CarryForwardPanel.

**What to add:**
- **Role guard on transitions**: Only MANAGER+ can lock/transition. ICs see the state as read-only.
- **Cycle history**: Show last 4 completed cycles with summary stats (commitment count, completion rate, carry-forward count). Clicking a past cycle navigates to its reconciliation view.
- **Narrative context**: "This week: 34 people submitted 98 commitments. 62% linked to a rally cry."

**What to change:**
- Remove the stubbed CycleHistory and replace with real data from the cycles API
- Add timestamps to the state indicator showing when each transition happened

### 3. My Team (`/team`) — "Review and direct your team"

**Current state**: MyTeamPage shows narrative per-person cards. ManagerDashboardPage shows charts. Both are read-only.

**What to do**: Merge the best of both into one page.

**Structure:**
- **Section A: Team Summary** — headline narrative + key stats
  - "Your team: 5 people, 16 commitments this week. 75% linked to a rally cry."
  - Rally cry coverage: small bars showing which rally cries your team is working on
  - Assignment balance: "You assigned 40% of work. 60% self-directed."

- **Section B: Per-Person Cards** (from MyTeamPage — keep this, it works)
  - Name, commitment count, rally cry badges, last-week status
  - Warning indicator for concerning patterns
  - Expandable commitment detail

- **Section C: Coverage Gaps** (from ManagerDashboardPage RcdoCoverageGaps)
  - Plain text: "Nobody on your team is working on [Objective X]"
  - **Action button**: "Assign work to cover this" → opens assignment flow

- **Section D: Alignment Chart** (from ManagerDashboardPage AlignmentGapChart)
  - Keep the stacked bar chart BUT add a caption: "This shows how your team's work breaks down by category. The target is X% strategic."
  - Show the configured strategic target as a reference line

**New feature: Manager Assignment Flow**
- From any coverage gap or from the team summary, a manager can click "Assign commitment"
- Opens a form: select employee, enter title, RCDO link, CHESS category, bullets
- Creates a commitment in the employee's name with `assignedBy` set to the manager
- The commitment appears in the employee's "My Week" view under "Assigned to you"
- This requires a new backend endpoint or reuse of the existing create commitment endpoint with `assignedBy` set

### 4. Briefing (`/briefing`) — "Are we executing on strategy?"

**Current state**: BriefingPage — rally cry status cards + watch list. Text-only.

**What to keep**: The rally-cry-organized structure, the narrative text generation, the watch list.

**What to add:**
- **Inline visual evidence**: Small progress bars next to "2 of 4 objectives covered", sparkline trends next to "alignment dropped from 55% to 40%"
- **Actionable watch list**: Each watch list item links to the relevant team drill-down or person's commitments
- **Rally cry card drill-down**: Clicking "Show details" shows per-team contribution breakdown with commitment titles grouped by person
- **Week-over-week comparison**: "Compared to last week: +2 commitments on Zero-Defect, -3 on Supplier Consolidation"

**What to change:**
- Don't sort OFF_TRACK first — sort by the executive's defined priority order (rally cry sort_order)
- Show covered objectives by name, not just a count
- Add small trend indicators (↑↓→) inline with each stat

### 5. Strategy (`/strategy`) — NEW: "Set the direction"

**Current state**: Does not exist. RCDO hierarchy is seeded via CSV import.

**What to build:**
- **Page layout**: Nested card hierarchy showing Rally Cries → Defining Objectives → Outcomes
- **Create/edit/archive rally cries**: Title, description, sort order
- **Create/edit/archive defining objectives**: Title, description, owner (dropdown of managers/directors), linked to a rally cry
- **Create/edit/archive outcomes**: Title, description, owner, linked to a DO
- **Coverage visualization**: For each rally cry, show how many commitments are linked to it this week. "12 commitments across 8 people" next to the rally cry title. Coverage gaps highlighted.
- **Owner assignment**: Each DO and Outcome can have a designated owner (DRI) — this person is responsible for ensuring the objective gets worked on.

**Access**: EXECUTIVE and VP only for create/edit. DIRECTOR can view.

**Backend needed:**
- `POST /api/v1/rcdo/defining-objectives` — create DO (currently CSV-only)
- `POST /api/v1/rcdo/outcomes` — create Outcome (currently CSV-only)
- Existing endpoints: `POST /api/v1/rcdo/rally-cries` (already exists), `PUT /api/v1/rcdo/{type}/{id}` (already exists), `DELETE /api/v1/rcdo/{type}/{id}` (already exists — soft delete)

### 6. Observatory (`/observatory`) — "Deep-dive analytics"

**Current state**: ExecutiveHealthPage with Mission Control layout.

**What to keep**: The org health map concept (VP sections with manager cards), sparklines, exception alerts.

**What to change:**
- Fix the CHESS bar fabrication (using real data, not estimated ratios)
- Add the configured strategic target as a reference on all alignment metrics
- Make exception alerts link to the specific team drill-down
- Add a cycle selector to compare across weeks
- Show coverage data per VP section (which rally cries each VP's teams are working on)

**What to fix:**
- TeamDrillDown: show manager name in header (not UUID)
- TeamDrillDown: scope CompletionTrend and DisplacementReport to the specific managerId
- TeamDrillDown: add narrative summary at the top before the charts
- CostImpactTable: scope to the team's subordinates, not the whole company

### 7. Reconciliation (`/reconciliation`) — "Close out the week"

**Current state**: Functional but lacks context.

**What to keep**: The reconciliation form, status marking, unplanned work entry.

**What to add:**
- Notes field required for non-COMPLETED statuses (the backend already enforces this, but the frontend should make it prominent)
- Displacement capture prominently surfaced (not buried)
- Summary screen after submission: "You completed 3 of 4. 1 carried forward because: ERP system issues."
- Alignment impact: "2 of your strategic commitments completed. 1 strategic commitment carried forward."

## Implementation Waves

### Wave 1: Strategy Page + Backend Endpoints (highest impact gap)
- Build `POST /api/v1/rcdo/defining-objectives` endpoint
- Build `POST /api/v1/rcdo/outcomes` endpoint
- Build StrategyPage frontend with RCDO hierarchy management
- This unblocks the entire alignment analytics layer

### Wave 2: My Week Enhancements
- Add rally cry coverage indicator
- Add carry-forward banner
- Add inline reconciliation for RECONCILING state
- Add week summary for RECONCILED state

### Wave 3: My Team + Manager Assignment
- Merge MyTeamPage + ManagerDashboardPage into one coherent view
- Add coverage gap action buttons
- Build manager assignment flow (form + backend wiring)
- Add chart captions and target reference lines

### Wave 4: Briefing Enhancements
- Add inline visual evidence (progress bars, sparklines)
- Make watch list items actionable (links to drill-down)
- Add week-over-week comparison
- Show covered objectives by name

### Wave 5: Observatory + TeamDrillDown Fixes
- Fix scoping bugs (cost impact, completion trend, displacement)
- Fix UUID display in TeamDrillDown header
- Add narrative summaries above charts
- Add cycle selector

### Wave 6: Lifecycle + Reconciliation Polish
- Add cycle history with real data
- Role-guard transition buttons
- Add reconciliation summary screen
- Surface displacement capture more prominently

## Design Principles (enforced across all waves)

1. **Every chart has a caption** explaining what it shows and what the takeaway is
2. **Every gap has an action** — "nobody is working on X" → "Assign work to cover this"
3. **Every metric shows a target** — the configured threshold from ObservatoryConfig
4. **Scope matches the viewer** — team drill-down shows the team, not the company
5. **Words first, charts second** — narrative summary above every chart section
6. **Carry-forward and displacement are first-class** — not afterthoughts buried in tables
