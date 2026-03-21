# Compass E2E Manual Test Plan

**Execution Method:** Chrome MCP browser automation (manual step-by-step)
**Application URL:** `http://localhost:5173` (Vite dev) or deployed Railway URL
**Backend Required:** Running with `local` profile, seed data loaded

---

## Seed Data Reference

**Organization:** Meridian Manufacturing

**Users (by role):**

| Name | Email | Role | Reports To |
|------|-------|------|------------|
| Sarah Chen | sarah.chen@meridian.com | EXECUTIVE | -- |
| Raj Patel | raj.patel@meridian.com | VP | Sarah Chen |
| Marcus Wright | marcus.wright@meridian.com | DIRECTOR | Raj Patel |
| Elena Rodriguez | elena.rodriguez@meridian.com | MANAGER | Marcus Wright |
| David Kim | david.kim@meridian.com | MANAGER | Marcus Wright |
| James Okafor | james.okafor@meridian.com | EMPLOYEE | Elena Rodriguez |
| Priya Sharma | priya.sharma@meridian.com | EMPLOYEE | Elena Rodriguez |
| Anna Mueller | anna.mueller@meridian.com | EMPLOYEE | David Kim |
| Tom Jackson | tom.jackson@meridian.com | EMPLOYEE | David Kim |
| Lisa Park | lisa.park@meridian.com | ANALYST | -- |

**Rally Cries:** Operational Excellence, Digital Transformation
**CHESS Categories:** Strategic, Operational, Defensive, Capability Building
**Cycles:** Week 1 (RECONCILED), Week 2 (LOCKED), Week 3 (DRAFT, current/active)

---

## Conventions

- **PASS:** Expected behavior observed; no console errors; visual matches design system
- **FAIL:** Any deviation from expected behavior, missing data, stuck loading state, console error, or visual regression
- **Design System Checks:** Warm off-white background (`bg-surface`), teal accents (`accent` / `#036A6A`), serif headlines (font-serif), consistent spacing, 120ms-300ms transitions

---

# PART 1: EXECUTIVE (Sarah Chen)

Sarah Chen has access to: My Week, My Team, The Briefing, Strategy, Portfolio, Settings (all 3 tabs: Profile, Admin, Organizations)

## 1.0 Login

### 1.0.1 Navigate to Dev Login
- **Action:** Open browser to application root URL
- **Expected:** Dev Login page loads. Header shows "DEV MODE" badge (amber), heading "Choose a user to log in as", subtitle text about local/test profiles
- **Verify:** Table renders with columns: Name, Email, Role, (action). All 10 seed users appear under "Meridian Manufacturing" org heading
- **PASS:** All users displayed, grouped by org
- **FAIL:** Empty table, loading spinner stuck, error message

### 1.0.2 Log in as Sarah Chen
- **Action:** Click the row for "Sarah Chen" (Role badge shows "Executive")
- **Expected:** Row shows "Signing in..." briefly, then app redirects to the main Layout with My Week page
- **Verify:** `localStorage` key `compass-dev-auth` is set with token, userId, orgId, role=EXECUTIVE, displayName="Sarah Chen"
- **PASS:** Redirected to My Week, nav bar visible
- **FAIL:** Stuck on login, error message, no redirect

---

## 1.1 Navigation Bar (Layout)

### 1.1.1 Verify Nav Structure
- **Action:** Observe the top navigation bar
- **Expected:** Two-row nav: Top row has "compass" brand text (serif, tracking-widest, uppercase), cycle week display centered (e.g. "Week 3 . Mar 16, 2026-Mar 23, 2026"), and right side has avatar initials "SC" (teal circle) + gear icon (SVG cog)
- **Verify:** Avatar initials are "SC" for Sarah Chen; gear icon links to `/settings`
- **PASS:** All elements present, correctly styled
- **FAIL:** Missing brand, wrong initials, missing cycle display

### 1.1.2 Verify Tab Bar (Executive sees all tabs)
- **Action:** Observe the bottom row of the nav (tab bar)
- **Expected:** Tabs visible: "My Week" (active, teal underline), "My Team", "The Briefing", "Strategy", "Portfolio"
- **Verify:** Active tab has `border-accent text-accent` styling. Other tabs have `border-transparent text-on-surface-variant`
- **PASS:** All 5 tabs visible, correct active state
- **FAIL:** Missing tabs, wrong tab count, no active indicator

### 1.1.3 Navigate to Each Tab
- **Action:** Click each tab in order: My Team, The Briefing, Strategy, Portfolio, then back to My Week
- **Expected for each:**
  - My Team: URL changes to `/team`, page heading "My Team" appears
  - The Briefing: URL changes to `/briefing`, briefing content loads
  - Strategy: URL changes to `/strategy`, heading "Strategic Framework" appears
  - Portfolio: URL changes to `/portfolio`, heading "Portfolio Overview" appears
  - My Week: URL changes to `/`, cycle state banner appears
- **Verify:** Each page loads without stuck spinner. Active tab indicator follows current page
- **PASS:** All navigations work, URL and content match
- **FAIL:** 404, wrong page content, stuck loading

### 1.1.4 Settings Gear Icon
- **Action:** Click the gear icon (SVG cog) in the top-right of the nav bar
- **Expected:** Navigates to `/settings`, Settings page loads with "Settings" heading
- **Verify:** Gear icon turns teal (active state) when on settings page
- **PASS:** Navigation works, active state correct
- **FAIL:** No navigation, no active state

### 1.1.5 Mobile Hamburger Menu (resize to <900px)
- **Action:** Resize browser window to less than 900px width
- **Expected:** Tab bar disappears. Hamburger menu icon (3 horizontal lines) appears in nav
- **Action:** Click hamburger icon
- **Expected:** Dropdown menu appears with all tab links (My Week, My Team, The Briefing, Strategy, Portfolio). Background has blur effect
- **Action:** Click "My Team" in dropdown
- **Expected:** Menu closes, navigates to `/team`
- **Action:** Click hamburger again
- **Expected:** Icon changes to X (close). Click X closes menu
- **Verify:** Menu closes on navigation. Icon toggles between hamburger/X
- **PASS:** Responsive menu works correctly
- **FAIL:** Menu doesn't appear, links don't close menu, icon doesn't toggle

### 1.1.6 Restore Desktop Width
- **Action:** Resize browser back to >900px
- **Expected:** Tab bar reappears, hamburger disappears
- **PASS:** Clean responsive transition
- **FAIL:** Both visible, or neither visible

---

## 1.2 My Week Page (DRAFT state -- current cycle Week 3)

### 1.2.1 Page Load
- **Action:** Navigate to `/` (My Week)
- **Expected:** Page loads with two-column layout: main column (65%) and sidebar (35%). No loading spinner stuck
- **Verify:** URL is `/`
- **PASS:** Page renders with content
- **FAIL:** Stuck spinner, error message, blank page

### 1.2.2 Cycle State Banner
- **Action:** Observe the cycle state banner at the top of the main column
- **Expected:** Light card with:
  - Left side: CycleStateIndicator pill showing green dot + "Draft -- ready to plan"
  - CycleHistorySelector showing week pills (up to 8 most recent)
  - Right side: "Lock Commitments" button (primary, with lock icon)
- **Verify:** The CycleStateIndicator has a teal dot (`bg-accent`) for DRAFT state. The current week pill is teal/filled
- **PASS:** Banner shows correct state, button visible
- **FAIL:** Wrong state shown, missing button

### 1.2.3 Cycle History Selector -- Week Pills
- **Action:** Observe the week pills in the cycle banner
- **Expected:** Up to 8 pills showing cycle labels (e.g. "Week of Mar 16, 2026", "Week of Mar 9, 2026", "Week of Mar 2, 2026"). Current week pill is teal with white text. Other pills are outlined/muted
- **Action:** Click a non-current week pill (e.g. Week 2)
- **Expected:** Page content updates to show Week 2 data. In Week 2 (LOCKED state), commitments should be read-only (no edit/delete buttons)
- **Action:** Click back to Week 3 (current)
- **Expected:** Returns to DRAFT state with editable commitments
- **PASS:** Week switching works, content updates
- **FAIL:** Pills don't respond, content doesn't change

### 1.2.4 Commitment Summary Strip
- **Action:** Observe the CommitmentSummaryStrip below the banner (if commitments exist)
- **Expected:** Shows summary metrics for current commitments (count, category breakdown, etc.)
- **PASS:** Strip visible with data
- **FAIL:** Missing or showing wrong numbers

### 1.2.5 Commitment List -- Sarah's Commitments
- **Action:** Observe the commitment cards in the main column
- **Expected:** Sarah has 1 commitment in Week 3: "Review Q1 OKR progress with VP team" (unplanned, Defensive category, Midday horizon). Card shows:
  - Priority rank: `#1`
  - Title: "Review Q1 OKR progress with VP team"
  - Badges: "Midday" horizon badge, "Defensive" category badge (amber/warm), "Unplanned" badge, "Unlinked" (italic, muted)
  - Drag handle (braille dots icon) on the left
  - Edit pencil icon (appears on hover on desktop, always visible on mobile)
  - Delete trash icon (appears on hover on desktop)
  - Expand chevron (if bullets exist -- this commitment has 3 bullets)
- **Verify:** Card has `bg-surface-lowest`, `rounded-sm` styling
- **PASS:** Card displays all elements correctly
- **FAIL:** Missing data, wrong badges, broken layout

### 1.2.6 Expand Commitment Bullets
- **Action:** Click the chevron (down arrow) on Sarah's commitment card
- **Expected:** Card expands to show 3 bullet items:
  1. "Pull Q1 OKR status report"
  2. "Prep talking points on Digital Transformation progress"
  3. "Facilitate 90-min leadership sync"
  Each bullet has a read-only checkbox (unchecked) and text. Checked bullets would show line-through
- **Verify:** Chevron rotates 180 degrees (points up). Bullets appear with border-t separator
- **Action:** Click chevron again
- **Expected:** Bullets collapse, chevron returns to default position
- **PASS:** Expand/collapse works, bullets display correctly
- **FAIL:** No expansion, missing bullets, chevron doesn't rotate

### 1.2.7 Edit Commitment (Pencil Icon)
- **Action:** Hover over Sarah's commitment card, then click the pencil (edit) icon
- **Expected:** CommitmentForm slide-over panel opens from the right with:
  - Header: "Edit Commitment" (serif font)
  - Close button (x) in top-right
  - Form pre-populated with existing data:
    - Title field: "Review Q1 OKR progress with VP team"
    - Task Bullets section showing "Break it down (3 of 5)" with 3 filled bullets
    - Category: Defensive should be selected
    - Horizon: Midday should be selected
    - Strategy Linker: Showing "Unlinked" / no link
    - Attribution: Self-directed (no assignedBy)
    - Notes: empty
  - Footer: "Save Changes" button (primary, full-width) + "Cancel" text link
- **Verify:** Panel slides in with 300ms animation. Overlay (dark scrim) covers the page behind
- **PASS:** Form opens pre-populated with correct data
- **FAIL:** Empty form, wrong data, panel doesn't open

### 1.2.8 CommitmentForm -- Title Field
- **Action:** Clear the title field and try to submit
- **Expected:** Validation error appears below field: message about title being required (from Zod schema)
- **Action:** Type "Updated Q1 OKR review" in the title field
- **Expected:** Error clears as you type
- **Verify:** Input has underline style (`border-b-2 border-b-outline-variant`), focus changes border to accent color
- **PASS:** Validation works, styling correct
- **FAIL:** No validation, wrong error message

### 1.2.9 CommitmentForm -- Task Bullets Editor
- **Action:** Observe the task bullets section
- **Expected:** Shows existing bullets in editable inputs. Counter shows "(3 of 5)". Each bullet has an input field
- **Action:** Clear one bullet to empty, leaving only 1 filled bullet, and try to submit
- **Expected:** Validation error: "At least 2 bullets required"
- **Action:** Add text back. If fewer than 5 bullets, an "add bullet" mechanism should be available
- **PASS:** Bullet editing works, validation enforces min 2
- **FAIL:** Can't edit bullets, no validation

### 1.2.10 CommitmentForm -- Category Selector
- **Action:** Observe the Category section
- **Expected:** 4 selectable category options: Strategic, Operational, Defensive, Capability Building. "Defensive" should be selected/highlighted
- **Action:** Click "Strategic"
- **Expected:** Strategic becomes selected (teal border/highlight), Defensive deselects
- **Action:** Click "Strategic" again
- **Expected:** Toggles off (deselects)
- **PASS:** Category selection toggles correctly
- **FAIL:** Can't change category, no visual feedback

### 1.2.11 CommitmentForm -- Horizon Selector
- **Action:** Observe the "When will this be done?" section
- **Expected:** HorizonSelector with options (Morning, Midday, Afternoon, EOD, EOW). "Midday" should be selected
- **Action:** Click "EOW"
- **Expected:** EOW becomes selected. Additional day/time selectors may appear depending on implementation
- **PASS:** Horizon selection works
- **FAIL:** Can't change horizon

### 1.2.12 CommitmentForm -- Strategy Linker
- **Action:** Observe the "Link to strategy" section
- **Expected:** Shows a dashed-border button "Link to strategy..." since this commitment is unlinked
- **Action:** Click "Link to strategy..."
- **Expected:** Popover opens with:
  - Search input at top: placeholder "Search outcomes, objectives, rally cries..."
  - Grouped list: Rally Cry headers (bold, uppercase, colored dots) with nested objectives and outcomes
  - "Operational Excellence" group with objectives: "Reduce Scrap Rate" (outcomes: "Line 3 scrap audit complete", "New material spec approved"), "Streamline QA Process" (outcome: "Automated test station live")
  - "Digital Transformation" group with objectives: "ERP Migration" (outcome: "Vendor shortlist finalized"), "AI Quality Inspection" (outcome: "CV model trained on defect dataset")
  - Bottom: "Mark as non-strategic" option (italic, muted)
- **Action:** Type "scrap" in the search field
- **Expected:** List filters to show only items containing "scrap" (e.g. "Reduce Scrap Rate", "Line 3 scrap audit complete")
- **Action:** Click "Line 3 scrap audit complete"
- **Expected:** Popover closes. Link display shows breadcrumb: "Operational Excellence > Reduce Scrap Rate > Line 3 scrap audit complete". Below the breadcrumb, "Change" and "Clear" text links appear
- **Action:** Click "Clear"
- **Expected:** Link removed, returns to "Link to strategy..." button
- **PASS:** Strategy linker popover works with search, selection, and clearing
- **FAIL:** Popover doesn't open, search doesn't filter, selection doesn't register

### 1.2.13 CommitmentForm -- Attribution (Who assigned this?)
- **Action:** Observe the "Who assigned this?" section
- **Expected:** AssignmentAttribution component. Default: "Self-directed". Option to assign to a manager
- **PASS:** Attribution displays and is interactive
- **FAIL:** Missing section

### 1.2.14 CommitmentForm -- Notes
- **Action:** Observe the Notes textarea
- **Expected:** Textarea with placeholder "Any additional context...", label "Notes (optional)"
- **Action:** Type some text
- **Expected:** Text appears, focus ring shows accent color
- **PASS:** Textarea works
- **FAIL:** Can't type, no styling

### 1.2.15 CommitmentForm -- Cancel
- **Action:** Click "Cancel" text at the bottom of the form
- **Expected:** Panel slides closed (200ms), overlay fades out. No changes saved
- **PASS:** Panel closes without saving
- **FAIL:** Panel stays open, changes were saved

### 1.2.16 CommitmentForm -- Save Changes (Edit)
- **Action:** Open edit form again (pencil icon). Change the title to "Updated: Q1 OKR review with VP team". Click "Save Changes"
- **Expected:** Button shows loading state. After success, panel closes. Commitment card in the list updates to show new title
- **Verify:** API call `PUT /api/v1/commitments/{id}` fires. Card updates without full page reload (React Query cache invalidation)
- **PASS:** Save succeeds, card updates
- **FAIL:** Error message, panel stays open, card doesn't update

### 1.2.17 Create New Commitment
- **Action:** Click the "+ Add commitment" button (dashed border, full-width, with plus icon)
- **Expected:** CommitmentForm opens with header "New Commitment". All fields empty/default:
  - Title: empty, placeholder "Describe your commitment..."
  - Bullets: 2 empty bullet inputs, counter "(2 of 5)"
  - Category: none selected
  - Horizon: "EOD" (default)
  - Strategy Link: "Link to strategy..." button
  - Attribution: Self-directed
  - Notes: empty
  - Footer: "Save Commitment" button
- **PASS:** Empty form opens with correct defaults
- **FAIL:** Form pre-populated with previous data, wrong defaults

### 1.2.18 Create Commitment -- Full Form Fill
- **Action:** Fill out the form:
  - Title: "Prepare board deck for Q1 review"
  - Bullet 1: "Pull financial data from accounting"
  - Bullet 2: "Draft executive summary slide"
  - Category: Click "Strategic"
  - Horizon: Click "EOW"
  - Strategy Link: Click "Link to strategy...", select "Operational Excellence" rally cry header (rally cry only, no specific outcome)
  - Attribution: Leave as Self-directed
  - Notes: "Need final numbers from CFO by Thursday"
- **Action:** Click "Save Commitment"
- **Expected:** Loading state on button. Panel closes. New commitment card appears in the list with:
  - Title: "Prepare board deck for Q1 review"
  - Badges: "EOW", "Strategic" (navy-tinted), "-> Operational Excellence" link
  - Rank: appropriate priority number
  - Bullets expandable
- **Verify:** API call `POST /api/v1/commitments` fires
- **PASS:** New commitment created and appears in list
- **FAIL:** Validation error, API error, card doesn't appear

### 1.2.19 Delete Commitment
- **Action:** Hover over the newly created commitment card. Click the trash (delete) icon
- **Expected:** ConfirmDialog appears:
  - Title: "Delete Commitment"
  - Description: "Are you sure you want to delete this commitment? This action cannot be undone."
  - Two buttons: "Cancel" and "Delete" (danger/red variant)
- **Action:** Click "Cancel"
- **Expected:** Dialog closes, commitment still in list
- **Action:** Click delete icon again, then click "Delete"
- **Expected:** Loading state on Delete button. Dialog closes. Commitment card removed from list with animation
- **Verify:** API call `DELETE /api/v1/commitments/{id}` fires
- **PASS:** Delete flow works with confirmation
- **FAIL:** No confirmation dialog, card not removed, API error

### 1.2.20 Drag-and-Drop Reorder (DRAFT only)
- **Action:** If Sarah has 2+ commitments, grab the drag handle (braille dots icon, far left of card) on one commitment
- **Expected:** Cursor changes to `cursor-grab`, then `cursor-grabbing` on mouse down. Card lifts (opacity: 0.7, shadow). DragOverlay shows a copy of the card
- **Action:** Drag the card to a different position and release
- **Expected:** Cards reorder. Priority ranks update accordingly. API call to update priority fires
- **Verify:** DndContext from `@dnd-kit` manages the interaction. `useDragPriority` hook handles the API update
- **PASS:** Drag and drop reorders cards, ranks update
- **FAIL:** Can't grab handle, card doesn't move, ranks don't update

### 1.2.21 Rally Cry Sidebar (Right Column)
- **Action:** Observe the right sidebar
- **Expected:** RallyCrySidebar component showing rally cry coverage for Sarah's commitments. Below it, CoverageStrip showing RCDO coverage metrics from the dashboard
- **PASS:** Sidebar shows relevant data
- **FAIL:** Empty sidebar, wrong data

### 1.2.22 Empty State (if no commitments)
- **Action:** Delete all commitments (or test with a fresh user who has none)
- **Expected:** EmptyState component shows:
  - Title: "No commitments yet"
  - Description: "Start by adding your first commitment for this week."
  - Button: "Create your first commitment" (primary variant)
- **Action:** Click "Create your first commitment"
- **Expected:** CommitmentForm opens (same as "New Commitment")
- **PASS:** Empty state displays and button works
- **FAIL:** Broken layout, button doesn't open form

---

## 1.3 Cycle Transitions (DRAFT -> LOCKED -> RECONCILING)

### 1.3.1 Lock Commitments (DRAFT -> LOCKED)
- **Action:** Ensure at least 1 commitment exists. Click "Lock Commitments" button in the cycle banner
- **Expected:** ConfirmDialog opens:
  - Title: "Lock Commitments"
  - Description: "Locking will prevent further edits to commitments for this cycle. Are you sure?"
  - Buttons: "Lock" (confirm) and default cancel
- **Action:** Click "Lock"
- **Expected:** Loading state. Dialog closes. Cycle state banner updates:
  - CycleStateIndicator: amber dot + "Locked -- commitments locked"
  - TransitionActions button changes to "Begin Reconciliation"
  - Commitment cards become read-only: no drag handles, no edit pencils, no delete icons, no "Add commitment" button
- **Verify:** API call `POST /api/v1/cycles/{id}/transition` with targetState=LOCKED
- **PASS:** State transitions, UI updates to locked mode
- **FAIL:** Error, state doesn't change, edit controls still visible

### 1.3.2 Lock Disabled When No Commitments
- **Action:** (Before locking) If 0 commitments exist, observe the "Lock Commitments" button
- **Expected:** Button is disabled (grey, not clickable). Tooltip on hover: "Add at least one commitment first"
- **PASS:** Button disabled with tooltip
- **FAIL:** Button clickable with 0 commitments

### 1.3.3 Begin Reconciliation (LOCKED -> RECONCILING)
- **Action:** Click "Begin Reconciliation" button
- **Expected:** ConfirmDialog:
  - Title: "Begin Reconciliation"
  - Description: "This will open the cycle for reconciliation. Team members can start marking commitments as complete or carried forward."
  - Button: "Begin"
- **Action:** Click "Begin"
- **Expected:** State transitions. Page changes to reconciliation view:
  - CycleStateIndicator: red dot + "Reconciling -- reconciliation open"
  - No more TransitionActions button
  - Main content changes to: UnplannedWorkEntry banner + "Planned vs. Actual" heading + PlannedVsActualTable accordion + ReconciliationBottomBar
- **Verify:** API call with targetState=RECONCILING
- **PASS:** Transitions to reconciliation view
- **FAIL:** Error, wrong view displayed

---

## 1.4 Reconciliation Flow

### 1.4.1 Unplanned Work Banner
- **Action:** Observe the top of the reconciliation view
- **Expected:** Prominent banner with teal left border:
  - Text: "Did anything unplanned come up this week?"
  - Subtext: "Capture unplanned work so it counts toward your effort."
  - Button: "Add unplanned work" (primary, with plus icon)
- **PASS:** Banner displayed
- **FAIL:** Missing banner

### 1.4.2 Add Unplanned Work -- Open Form
- **Action:** Click "Add unplanned work" button
- **Expected:** Inline form appears below the banner with dashed accent border:
  - Heading: "Add Unplanned Work"
  - Fields:
    - Title (required, with asterisk)
    - Bullet items (min 2, max 5, with add/remove controls)
    - Completion Horizon dropdown (Morning, Midday, Afternoon, End of Day, End of Week)
    - Rally Cry dropdown (required, loads from RCDO tree)
    - Who requested this? dropdown (Self-initiated, Manager, Director, External stakeholder)
    - What happened? -- CommitmentStatusMarker (Completed/Partial/Not Started radio buttons)
  - Actions: "Add Work" (primary) + "Cancel" (secondary)
- **PASS:** Form renders with all fields
- **FAIL:** Missing fields, form doesn't open

### 1.4.3 Add Unplanned Work -- Validation
- **Action:** Click "Add Work" with all fields empty
- **Expected:** Error message: "Title is required."
- **Action:** Fill title but leave only 1 bullet filled
- **Expected:** Error: "At least 2 bullet items are required."
- **Action:** Fill 2 bullets but don't select reconciliation status
- **Expected:** Error: "Reconciliation status is required for unplanned work."
- **Action:** Select a status but don't select a Rally Cry
- **Expected:** Error: "RCDO linking (Rally Cry) is required."
- **PASS:** All validations fire in correct order
- **FAIL:** Missing validation, wrong messages

### 1.4.4 Add Unplanned Work -- Submit
- **Action:** Fill all required fields:
  - Title: "Emergency client escalation handling"
  - Bullet 1: "Join emergency call with client"
  - Bullet 2: "Coordinate cross-team response"
  - Horizon: "End of Day"
  - Rally Cry: Select "Operational Excellence"
  - Who requested: "External stakeholder"
  - Status: Click "Completed"
- **Action:** Click "Add Work"
- **Expected:** Form closes, reconciliation view refreshes to include the new unplanned commitment in the PlannedVsActualTable
- **PASS:** Unplanned work added successfully
- **FAIL:** Error, form stays open

### 1.4.5 Add Unplanned Work -- Cancel
- **Action:** Open form again, fill some fields, click "Cancel"
- **Expected:** Form closes, no data saved, form resets to empty
- **PASS:** Clean cancel
- **FAIL:** Data persisted, form doesn't close

### 1.4.6 Planned vs. Actual Table -- Accordion Cards
- **Action:** Observe the PlannedVsActualTable
- **Expected:** Accordion cards for each commitment. First card expanded by default, rest collapsed. Each collapsed card shows:
  - Chevron (left)
  - Priority rank (#1, #2, etc.)
  - Title (truncated if long)
  - Horizon pill (e.g. "MIDDAY")
  - CHESS category with colored bar
  - Rally cry link or "Unlinked" (italic)
  - Status pill (if already reconciled): colored badge with icon + label
- **Verify:** Cards have staggered fade-in animation (40ms delay each)
- **PASS:** Cards render correctly with all metadata
- **FAIL:** Missing cards, wrong data, no accordion

### 1.4.7 Expand a Commitment Card
- **Action:** Click on a collapsed card header
- **Expected:** Card expands with 2-column layout:
  - LEFT column (PLANNED): Read-only bullet list with empty checkbox icons and bullet text. Header: "PLANNED"
  - RIGHT column (ACTUAL): Interactive reconciliation controls. Header: "ACTUAL"
    - Status marker ("What happened?"): 3 radio buttons -- Completed (teal), Partial (amber), Not Started (red)
    - Helper text row explaining each status
    - Bullet checkboxes (if bullets exist)
    - Notes textarea (appears after status selected)
- **Verify:** Previously expanded card collapses (only one open at a time)
- **PASS:** Expand works, two-column layout correct
- **FAIL:** Doesn't expand, broken layout

### 1.4.8 Set Status -- Completed
- **Action:** Click "Completed" status button (checkmark icon)
- **Expected:**
  - Button fills with teal background + white text
  - Success message: "All bullets complete. No notes required."
  - Auto-saves (API call `PUT /api/v1/reconciliation/commitments/{id}`)
  - "Saving..." indicator appears briefly
  - Status pill updates in collapsed header view
- **PASS:** Completed status saves
- **FAIL:** No visual change, save fails

### 1.4.9 Set Status -- Partial
- **Action:** Click "Partial" status button (half symbol)
- **Expected:**
  - Button fills with amber background
  - Notes textarea appears with placeholder: "Why didn't this complete? This information helps leadership understand blockers."
  - "Carry to next week?" toggle appears with "Yes" / "No" buttons
  - DisplacementQuickSignal appears: "Was this displaced by other work?"
  - DisplacementCapture section appears: "Displacement Category" with dropdown, "Which commitment took its place?" dropdown, "Details" textarea
- **Action:** Type notes: "Only completed 2 of 3 tasks due to client emergency"
- **Action:** Click "Yes" on carry forward toggle
- **Expected:** "Yes" button fills navy. API auto-saves on notes blur
- **Action:** In DisplacementCapture, select "PRODUCTION_EMERGENCY" from the category dropdown
- **Expected:** Dropdown shows 7 options: Manager reassigned, Production emergency, Blocked on resources, Scope changed, Deprioritized, External dependency, Other
- **PASS:** All partial-completion controls work
- **FAIL:** Missing controls, save fails

### 1.4.10 Set Status -- Not Started
- **Action:** Click "Not Started" status button (X symbol)
- **Expected:** Button fills with red background. Same additional controls as Partial (notes, carry forward, displacement)
- **PASS:** Not Started works identically to Partial for additional controls
- **FAIL:** Missing controls

### 1.4.11 Bullet Checkboxes (Actual Column)
- **Action:** In an expanded card's ACTUAL column, click a bullet checkbox
- **Expected:** Checkbox toggles. Auto-saves immediately (API call includes bulletStatuses array)
- **Verify:** Saving indicator appears briefly
- **Action:** Click another checkbox
- **Expected:** Toggles and saves independently
- **PASS:** Checkbox toggles save correctly
- **FAIL:** No toggle, save fails

### 1.4.12 Carry Forward Toggle
- **Action:** On a Partial or Not Started commitment, observe the carry forward section
- **Expected:** Box with arrow icon, "Carry to next week?" text, "Yes" and "No" buttons
- **Action:** Click "Yes"
- **Expected:** "Yes" button: navy background, white text, navy border. "No" button: outlined
- **Action:** Click "No"
- **Expected:** Buttons swap. "No" becomes filled, "Yes" becomes outlined
- **PASS:** Toggle works correctly
- **FAIL:** Buttons don't toggle, wrong state

### 1.4.13 Reconciliation Bottom Bar
- **Action:** Observe the fixed bottom bar
- **Expected:** Sticky bar at viewport bottom with:
  - Left: Progress bar (120px wide) + text "X of Y reconciled"
  - Right: "Complete Reconciliation" button
  - Glass-morphism background (white 92% opacity + blur)
- **Verify:** Progress bar color: amber when incomplete, teal when all reconciled
- **PASS:** Bottom bar visible and correct
- **FAIL:** Bar not visible, wrong counts

### 1.4.14 Complete Reconciliation -- Disabled State
- **Action:** With fewer than all commitments reconciled, observe the "Complete Reconciliation" button
- **Expected:** Button is secondary variant (grey/outline), disabled. Not clickable
- **Action:** Also observe the inline warning above the bottom bar
- **Expected:** Amber warning box: "Reconcile all remaining commitments before submitting." with count "X of Y reconciled" and progress bar
- **PASS:** Button disabled, warning visible
- **FAIL:** Button enabled prematurely

### 1.4.15 Complete Reconciliation -- All Reconciled
- **Action:** Reconcile all commitments (set a status on each)
- **Expected:** Bottom bar progress bar fills to 100% (teal). Button changes to primary variant (teal, enabled). Inline warning disappears
- **Action:** Click "Complete Reconciliation"
- **Expected:** Loading state ("Submitting..."). On success, page transitions to RECONCILED state:
  - CycleStateIndicator: teal dot + "Reconciled -- week complete"
  - Summary banner: "You completed X of Y commitments. Z carried forward."
  - Completion rate percentage
  - Summary cards grid: Completed, Partial, Not Started, Carried (4 cards)
  - List of reconciled commitments with status badges
  - No more transition actions
- **Verify:** API call `POST /api/v1/reconciliation/cycles/{id}/complete`
- **PASS:** Reconciliation completes, summary displayed
- **FAIL:** Error, stuck in reconciling state

### 1.4.16 Reconciled State View
- **Action:** Observe the RECONCILED view
- **Expected:**
  - Teal banner: "You completed X of Y commitment(s). Z carried forward. Completion rate: N%"
  - 4 summary cards in grid: Completed (count), Partial (count), Not Started (count), Carried (count)
  - List of commitments with:
    - Priority rank circle
    - Title
    - RCDO link (if any)
    - Status badge: Completed (checkmark), Partial (half), Not Started (X), Carried (arrow)
- **PASS:** All data displays correctly
- **FAIL:** Wrong counts, missing badges

---

## 1.5 Carry Forward Panel (visible in next DRAFT cycle)

### 1.5.1 Verify Carry Forward Items Appear
- **Action:** If any commitments were marked "Carry Forward" in reconciliation, navigate to the next cycle (or the current DRAFT cycle if items were carried from a previous cycle)
- **Expected:** CarryForwardPanel appears with amber accent border:
  - Header: "X item(s) carried from last week" with arrow icon
  - Each carried item shows:
    - Title
    - Status pill (e.g. "Partially Completed" or "Not Started")
    - Read-only bullet checkboxes showing completion state
    - Reconciliation notes (if any): "Why carried: ..."
    - Accept button (teal outline) + Decline button (red outline)
- **PASS:** Carry forward panel displays
- **FAIL:** Panel missing, wrong items

### 1.5.2 Accept a Carried Item
- **Action:** Click "Accept" on a carried item
- **Expected:** Item visual changes: line-through title, reduced opacity, "Accepted" label appears in teal. Toast notification: "Commitment accepted -- it's in your list"
- **PASS:** Accept works with visual feedback
- **FAIL:** No visual change, no toast

### 1.5.3 Decline a Carried Item
- **Action:** Click "Decline" on a carried item
- **Expected:** Inline form appears within the item:
  - Input: "Reason for declining (optional)" with placeholder "e.g. no longer relevant"
  - Buttons: "Cancel" (text) + "Confirm Decline" (red background)
- **Action:** Type "No longer relevant" and click "Confirm Decline"
- **Expected:** Loading state ("Removing..."). Item removed from carry forward panel. API deletes the commitment
- **Action:** On another item, click "Decline" then "Cancel"
- **Expected:** Inline form disappears, item unchanged
- **PASS:** Decline flow works
- **FAIL:** Can't decline, item not removed

### 1.5.4 All Items Accepted
- **Action:** Accept all carried items
- **Expected:** CarryForwardPanel disappears entirely (hidden when all accepted)
- **PASS:** Panel auto-hides
- **FAIL:** Panel stays visible

---

## 1.6 My Team Page

### 1.6.1 Navigate to My Team
- **Action:** Click "My Team" tab in nav
- **Expected:** URL: `/team`. Page heading: "My Team" (serif font). CycleHistorySelector in header area
- **PASS:** Page loads
- **FAIL:** Access denied, error

### 1.6.2 Team Summary Card
- **Action:** Observe the TeamSummaryCard at the top
- **Expected:** AI-generated team summary card with insights about the team's current state
- **PASS:** Card renders with content
- **FAIL:** Empty or missing

### 1.6.3 Team Metrics Strip
- **Action:** Observe the TeamMetricsStrip
- **Expected:** 4 metric tiles:
  - Team Size (number of members)
  - Rally Cry Coverage (percentage)
  - Carry-Forward Rate (percentage)
  - Unlinked Commitments (count)
- **PASS:** All 4 metrics display with values
- **FAIL:** Missing metrics, wrong numbers

### 1.6.4 Rally Cry Coverage Cards
- **Action:** Observe the RallyCryCoverageCards section
- **Expected:** Cards showing coverage per rally cry with commitment counts
- **PASS:** Coverage cards display
- **FAIL:** Empty or missing

### 1.6.5 Team Members Section -- Header
- **Action:** Observe the "Team Members" section header
- **Expected:** Heading "Team Members" + "Assign Work" button (secondary, with arrow icon) on the right
- **PASS:** Header with button
- **FAIL:** Missing button

### 1.6.6 Person Cards -- Collapsed View
- **Action:** Observe the list of team member cards
- **Expected:** Each PersonCard shows (collapsed):
  - Display name (bold)
  - Role label (IC/Manager)
  - ChessMiniBar (horizontal stacked bar showing CHESS category breakdown)
  - "X commitments . Y linked" text
  - Carried count if > 0 (amber pill with recycle icon)
  - "At Risk" label if no linked commitments
  - Status dot: teal (good), amber (warning), rose (risk)
  - Chevron for expand
- **Verify:** Cards sorted with risk-flagged members first, then alphabetical
- **PASS:** All person cards render with correct data
- **FAIL:** Missing members, wrong data

### 1.6.7 Person Card -- Expand
- **Action:** Click on a person card (e.g. Elena Rodriguez)
- **Expected:** Card expands to show:
  - Commitment list: each commitment with title, CHESS category chip, rally cry link chip (teal for linked, red for "Unlinked"), carried badge if applicable
  - "Assign work ->" text link at bottom
  - Rally Cry Coverage section: pills showing which rally cries are covered and any gaps
- **Verify:** Commitment list items separated by border-t dividers
- **PASS:** Expanded view shows all data
- **FAIL:** Missing commitments, broken layout

### 1.6.8 Person Card -- Border Accents
- **Action:** Observe border-left colors on person cards
- **Expected:**
  - Rose/red left border: member at risk (no linked commitments but has commitments)
  - Amber left border: member has carried items or incomplete linking
  - No accent border: healthy state
- **PASS:** Border accents match status
- **FAIL:** Wrong colors or missing accents

### 1.6.9 Assign Work -- From Person Card
- **Action:** Expand a person card. Click "Assign work ->" link
- **Expected:** AssignWorkForm slide-over opens from right. "Assign to" dropdown pre-filled with the selected team member
- **PASS:** Form opens with pre-selected member
- **FAIL:** Form opens empty

### 1.6.10 Assign Work -- From Header Button
- **Action:** Click "Assign Work" button in the Team Members section header
- **Expected:** AssignWorkForm opens with "Assign to" dropdown showing "Select a team member..." (no pre-selection)
- **PASS:** Form opens with empty selection
- **FAIL:** Pre-selected or doesn't open

### 1.6.11 AssignWorkForm -- Full Layout
- **Action:** Observe the AssignWorkForm slide-over
- **Expected:** Panel with:
  - Header: "Assign Work" (serif) + close (X) button
  - Body (scrollable):
    - "Assign to" dropdown: lists all team members
    - "Commitment Title" input (required)
    - "Task Bullets" section: 2 default bullet inputs, "+" Add bullet link, remove (X) on each if > 2
    - "CHESS Category" 2x2 grid: Strategic, Operational, Defensive, Capability (toggle selection)
    - "Day" pills: Mon, Tue, Wed, Thu, Fri (toggle selection, rounded-full)
    - "Time Block" pills: Morning, Midday, Afternoon, EOD (toggle selection)
    - "Strategy Link" placeholder/linker
    - "Notes" textarea (optional)
  - Footer: "Cancel" (secondary) + "Assign" (primary) buttons
- **PASS:** All form sections present
- **FAIL:** Missing sections

### 1.6.12 AssignWorkForm -- Validation
- **Action:** Click "Assign" with empty form
- **Expected:** Error: "Please select a team member."
- **Action:** Select a member but leave title empty
- **Expected:** Error: "Title is required."
- **Action:** Fill title but only 1 bullet filled
- **Expected:** Error: "At least 2 task bullets are required."
- **PASS:** All validations fire
- **FAIL:** Missing validation

### 1.6.13 AssignWorkForm -- Submit
- **Action:** Fill:
  - Assign to: James Okafor
  - Title: "Document new inspection procedure"
  - Bullet 1: "Review current procedure"
  - Bullet 2: "Draft new steps"
  - CHESS: Click "Operational"
  - Day: Click "Wed"
  - Time Block: Click "EOD"
- **Action:** Click "Assign"
- **Expected:** Loading state on Assign button. Panel closes. Commitment created for James Okafor with `assignedBy` set to Sarah Chen's userId
- **PASS:** Assignment created
- **FAIL:** Error, form stays open

### 1.6.14 AssignWorkForm -- CHESS Category Toggle
- **Action:** Click "Strategic" in the CHESS grid
- **Expected:** Strategic gets teal border + accent text
- **Action:** Click "Strategic" again
- **Expected:** Deselects (toggles off)
- **PASS:** Toggle works
- **FAIL:** Can't toggle off

### 1.6.15 AssignWorkForm -- Day/Time Pills Toggle
- **Action:** Click "Mon" day pill
- **Expected:** Mon fills teal with white text (rounded-full)
- **Action:** Click "Mon" again
- **Expected:** Deselects
- **Action:** Click "Tue"
- **Expected:** Tue selected, only one active at a time
- **PASS:** Pills toggle correctly
- **FAIL:** Multiple selected, can't deselect

### 1.6.16 AssignWorkForm -- Bullet Management
- **Action:** Click "+ Add bullet" (if < 5 bullets)
- **Expected:** New empty bullet input appears
- **Action:** Keep adding until 5 bullets
- **Expected:** "+ Add bullet" link disappears at 5
- **Action:** Click X (remove) on a bullet (if > 2)
- **Expected:** Bullet removed
- **Action:** Try to remove when only 2 remain
- **Expected:** X buttons not shown when only 2 bullets remain
- **PASS:** Add/remove works with min 2 / max 5 constraints
- **FAIL:** Can go below 2 or above 5

### 1.6.17 Team Analytics Section
- **Action:** Observe the TeamAnalytics section below team members
- **Expected:** Collapsible section with team analytics data
- **PASS:** Analytics renders
- **FAIL:** Missing or empty

---

## 1.7 The Briefing Page

### 1.7.1 Navigate to The Briefing
- **Action:** Click "The Briefing" tab
- **Expected:** URL: `/briefing`. Two-column layout (70% main / 30% AI sidebar). Mode tabs visible at top

### 1.7.2 Mode Tab Bar
- **Action:** Observe the mode tabs at top of page
- **Expected:** 4 tabs: "Briefing" (active/selected), "Health Map", "Strategy", "Config"
- **Action:** Click each tab
- **Expected:**
  - Briefing: Shows narrative card, metrics, rally cry coverage, team health
  - Health Map: Loads ExecutiveHealthPage (lazy loaded, may show spinner)
  - Strategy: Loads StrategyPage inline
  - Config: Loads ObservatoryConfigPage (lazy loaded)
- **Action:** Return to "Briefing" tab
- **PASS:** All mode tabs switch content
- **FAIL:** Tab doesn't switch, content doesn't load

### 1.7.3 Briefing Narrative Card
- **Action:** Observe the BriefingNarrativeCard
- **Expected:**
  - Header row: "AI Briefing . Generated [date] [time]" (left) + "Export PDF ↓" button (right, teal outline)
  - Headline: Large serif heading with the briefing headline
  - Narrative prose: Body text paragraph with analysis
  - Sources section: "View sources ▾" toggle (collapsed by default)
  - Suggested Focus Areas: Section with arrow-prefixed bullet items
- **PASS:** All sections render
- **FAIL:** Empty card, missing sections

### 1.7.4 Export PDF Button
- **Action:** Click "Export PDF ↓" button
- **Expected:** PDF export initiates (using `exportBriefingToPdf`). Toast notification on success: "Briefing exported as PDF". On failure: "Export failed"
- **PASS:** Export triggers, toast shows
- **FAIL:** No action, no feedback

### 1.7.5 Sources Toggle
- **Action:** Click "View sources ▾" text
- **Expected:** Sources section expands with animated transition (max-height + opacity). Shows:
  - List of citations: each with label, detail (monospace), and optional link text "→"
  - Footer: "All metrics validated against source data..."
- **Verify:** Toggle text changes to "Hide sources ▴"
- **Action:** Click "Hide sources ▴"
- **Expected:** Section collapses
- **PASS:** Toggle works with animation
- **FAIL:** No animation, doesn't toggle

### 1.7.6 Briefing Metrics Strip
- **Action:** Observe the BriefingMetricsStrip below the narrative card
- **Expected:** Row of metric tiles with key briefing metrics
- **PASS:** Metrics display
- **FAIL:** Empty

### 1.7.7 Rally Cry Coverage Section
- **Action:** Observe the Rally Cry Level section
- **Expected:** Rally cry cards showing coverage data with commitment counts. Each rally cry is clickable
- **Action:** Click on a rally cry (e.g. "Operational Excellence")
- **Expected:** Drill-down: page transitions to RallyCryDetailLevel. Breadcrumb appears at top. URL updates with query params
- **PASS:** Drill-down navigates
- **FAIL:** No drill-down

### 1.7.8 Drill-Down Breadcrumb
- **Action:** Observe the breadcrumb after drilling into a rally cry
- **Expected:** Breadcrumb shows navigation path (e.g. "Briefing > Operational Excellence"). Clicking "Briefing" returns to top level
- **Action:** Click a team in the rally cry detail to drill further
- **Expected:** Breadcrumb extends (e.g. "Briefing > Operational Excellence > Elena Rodriguez")
- **Action:** Click "Briefing" in breadcrumb
- **Expected:** Returns to briefing home (top level). Mode tabs reappear
- **PASS:** Breadcrumb navigation works at all levels
- **FAIL:** Can't navigate back, breadcrumb missing

### 1.7.9 Team Health Table
- **Action:** Observe the TeamHealthTable in the briefing main column
- **Expected:** Table with columns: Team Lead, Headcount, Strategic %, Completion, Drift Signal, Trending, (arrow)
  - Rows sorted: declining drift first, then by strategic alignment ascending
  - Drift rows have amber left border (3px)
  - Hover shows right arrow icon
  - Rows are clickable (cursor pointer)
  - Drift signal column shows "Alignment ↓ Sustained" or "Alignment ↓ Emerging" or "--"
  - Trending shows weeks count (e.g. "3w") or "--"
- **Action:** Click a row (e.g. Elena Rodriguez's team)
- **Expected:** Drills into TeamDetailLevel view
- **PASS:** Table renders, rows clickable, drill-down works
- **FAIL:** Empty table, rows not clickable

### 1.7.10 AI Chat Sidebar
- **Action:** Observe the right sidebar (30% width, sticky)
- **Expected:** AIChatSidebar with:
  - Header: Clock icon + "Compass Intelligence" text
  - Scrollable chat area with seed conversation (6 messages alternating user/AI):
    1. User: "Why did strategic alignment drop this week?"
    2. AI: Long response about alignment drop
    3. User: "Which rally cries have the worst coverage?"
    4. AI: Response about churn reduction
    5. User: "What should I focus on in my 1:1 with Marcus?"
    6. AI: Response about Marcus's team
  - Input area: Text input "Ask about this week..." + teal send button (arrow icon)
  - Footer: "Powered by AI . Based on current cycle data"
- **PASS:** All sidebar elements present
- **FAIL:** Missing sections, empty chat

### 1.7.11 AI Chat -- Send Message
- **Action:** Type "What is our completion rate?" in the chat input
- **Expected:** Input accepts text. Send button becomes enabled (not 50% opacity)
- **Action:** Click the send button (or press Enter)
- **Expected:**
  - Input clears
  - User message bubble appears at bottom of chat
  - Loading indicator (3 pulsing dots) appears
  - AI response bubble appears after delay
  - Chat auto-scrolls to bottom
- **Verify:** Send disabled while loading. Input disabled while loading
- **PASS:** Message sends and response appears
- **FAIL:** Message doesn't send, no response, no loading indicator

### 1.7.12 AI Chat -- Enter Key
- **Action:** Type a message and press Enter
- **Expected:** Message sends (same as clicking send button)
- **Action:** Type a message and press Shift+Enter
- **Expected:** Does NOT send (Shift+Enter should not trigger send based on the code: `!e.shiftKey`)
- **PASS:** Enter sends, Shift+Enter doesn't
- **FAIL:** Wrong key behavior

### 1.7.13 AI Chat -- Empty Send
- **Action:** With empty input, click send button
- **Expected:** Nothing happens (button disabled when `!inputValue.trim()`)
- **PASS:** Empty send prevented
- **FAIL:** Empty message sent

---

## 1.8 Strategy Page

### 1.8.1 Navigate to Strategy
- **Action:** Click "Strategy" tab
- **Expected:** URL: `/strategy`. Page heading: "Strategic Framework" (serif). Subtext: "Define rally cries, objectives, and outcomes. All commitments link back to this tree." Summary stats (e.g. "2 rally cries . 4 objectives . 5 outcomes")
- **PASS:** Page loads with heading and stats
- **FAIL:** Access denied, error

### 1.8.2 Strategy Board -- Kanban Layout
- **Action:** Observe the main content area
- **Expected:** Horizontal scrolling Kanban board. Each rally cry is a column (RallyCryColumn). After the last column, a dashed "Add Rally Cry" button column
- **Verify:** Horizontal scroll works with thin scrollbar. Columns are min-width 340px, max 440px
- **PASS:** Kanban renders
- **FAIL:** Vertical stacking, no scroll

### 1.8.3 Rally Cry Column Content
- **Action:** Observe a rally cry column (e.g. "Operational Excellence")
- **Expected:** Column with:
  - Rally cry title as column header
  - Description text
  - Edit (pencil) and Archive buttons on the rally cry header
  - Defining objectives nested below, each with:
    - Objective title
    - Owner name (if assigned)
    - Edit/Archive buttons
    - Outcomes nested below each objective
    - "Add Outcome" button per objective
  - "Add Objective" button at bottom of column
- **PASS:** Full RCDO tree displays in column
- **FAIL:** Missing nesting, broken layout

### 1.8.4 Add Rally Cry
- **Action:** Click the dashed "Add Rally Cry" button (far right)
- **Expected:** StrategyModal opens (centered dialog):
  - Title: "Add Rally Cry" (serif)
  - No breadcrumb (rally cries are top-level)
  - Fields:
    - Title input: placeholder "Rally cry title..."
    - Description textarea (5 rows): placeholder "Describe the strategic narrative..."
    - No owner select (rally cries don't have owners)
  - Buttons: "Save" (primary, disabled until title filled) + "Cancel"
- **Action:** Type title "Customer Obsession" and description "Win through service"
- **Action:** Click "Save"
- **Expected:** Loading state ("Saving..."). Dialog closes. New rally cry column appears in the Kanban board
- **PASS:** Rally cry created
- **FAIL:** Error, dialog stays open

### 1.8.5 Add Objective Under Rally Cry
- **Action:** Click "Add Objective" button under "Operational Excellence" column
- **Expected:** StrategyModal opens:
  - Title: "Add Objective"
  - Breadcrumb: "Rally Cry: **Operational Excellence**" (teal bold)
  - Fields: Title, Description (3 rows), Owner select dropdown (lists all org members)
- **Action:** Fill title: "Reduce Downtime". Select owner: "Elena Rodriguez". Click "Save"
- **Expected:** Modal closes. New objective appears under Operational Excellence
- **PASS:** Objective created
- **FAIL:** Error, missing breadcrumb

### 1.8.6 Add Outcome Under Objective
- **Action:** Click "Add Outcome" button under an objective
- **Expected:** StrategyModal opens:
  - Title: "Add Outcome"
  - Breadcrumb: "Rally Cry: **Operational Excellence** > Objective: **Reduce Scrap Rate**"
  - Fields: Title, Description, Owner select
- **Action:** Fill title: "5% reduction in monthly scrap". Click "Save"
- **Expected:** Modal closes. New outcome appears under the objective
- **PASS:** Outcome created with correct nesting
- **FAIL:** Wrong parent, error

### 1.8.7 Edit Rally Cry
- **Action:** Click the edit (pencil) icon on "Operational Excellence" rally cry header
- **Expected:** StrategyModal opens:
  - Title: "Edit Rally Cry"
  - Fields pre-populated: Title = "Operational Excellence", Description = existing description
- **Action:** Change title to "Operational Excellence 2.0". Click "Save"
- **Expected:** Updates and column header changes
- **PASS:** Edit works
- **FAIL:** Not pre-populated, error on save

### 1.8.8 Edit Objective
- **Action:** Click edit on an objective (e.g. "Reduce Scrap Rate")
- **Expected:** StrategyModal with "Edit Objective", breadcrumb to parent rally cry, pre-populated fields including owner
- **PASS:** Edit works with pre-populated data
- **FAIL:** Wrong data

### 1.8.9 Edit Outcome
- **Action:** Click edit on an outcome
- **Expected:** StrategyModal with "Edit Outcome", breadcrumb to parent rally cry + objective, pre-populated
- **PASS:** Edit works
- **FAIL:** Wrong breadcrumb

### 1.8.10 Archive Rally Cry
- **Action:** Click the archive button on a rally cry
- **Expected:** ConfirmDialog:
  - Title: 'Archive "Operational Excellence"?'
  - Description: "This will archive the item. Linked commitments will not be deleted."
  - Buttons: "Cancel" + "Archive" (danger/red)
- **Action:** Click "Cancel"
- **Expected:** Dialog closes, rally cry still visible
- **Action:** Click archive again, then "Archive"
- **Expected:** Loading state. Dialog closes. Rally cry column removed from board
- **PASS:** Archive flow works
- **FAIL:** No confirmation, item not removed

### 1.8.11 Archive Objective / Outcome
- **Action:** Repeat archive test on an objective and an outcome
- **Expected:** Same confirmation dialog pattern. Items removed from their respective parent after confirmation
- **PASS:** Archive works at all levels
- **FAIL:** Error at any level

### 1.8.12 Strategy Modal -- Save Disabled When Empty
- **Action:** Open "Add Rally Cry" modal. Observe "Save" button with empty title
- **Expected:** Save button disabled (grey, not clickable)
- **Action:** Type a character
- **Expected:** Save button enables
- **PASS:** Button enables/disables correctly
- **FAIL:** Button always enabled or always disabled

---

## 1.9 Portfolio Page

### 1.9.1 Navigate to Portfolio
- **Action:** Click "Portfolio" tab
- **Expected:** URL: `/portfolio`. Two-column layout (70%/30%). Main column: "Portfolio Overview" heading + CycleHistorySelector. AI sidebar on right
- **PASS:** Page loads
- **FAIL:** Access denied, error

### 1.9.2 Portfolio Narrative Card
- **Action:** Observe the PortfolioNarrativeCard
- **Expected:** AI-generated narrative about portfolio performance
- **PASS:** Card renders
- **FAIL:** Empty

### 1.9.3 Portfolio Metrics Strip
- **Action:** Observe the PortfolioMetricsStrip
- **Expected:** Row of portfolio-wide metric tiles
- **PASS:** Metrics display
- **FAIL:** Empty

### 1.9.4 Company Cards
- **Action:** Observe the company card grid
- **Expected:** One card per portfolio company. Each CompanyCard shows key metrics (alignment, completion, team size, etc.) with animation delays
- **Action:** Click a company card
- **Expected:** Navigates to that company's full briefing (if clickable)
- **PASS:** Cards render with data
- **FAIL:** Empty or missing

### 1.9.5 Comparison Table
- **Action:** Observe the ComparisonTable below company cards
- **Expected:** Table comparing portfolio companies across key metrics
- **PASS:** Table renders
- **FAIL:** Empty

### 1.9.6 Portfolio AI Chat Sidebar
- **Action:** Observe the right sidebar
- **Expected:** AIChatSidebar with portfolio-specific seed conversation:
  - "Which company needs the most attention right now?" / Response about Apex Dynamics
  - "Compare Meridian and Cascade on execution quality" / Detailed comparison response
  - Placeholder: "Ask about the portfolio..."
  - Footer: "Powered by AI . Portfolio-wide analysis"
- **PASS:** Sidebar with portfolio context
- **FAIL:** Wrong context, empty

### 1.9.7 Cycle History in Portfolio
- **Action:** Click a different week pill in the CycleHistorySelector
- **Expected:** Portfolio data reloads for that cycle
- **PASS:** Data updates
- **FAIL:** No change

---

## 1.10 Settings Page

### 1.10.1 Navigate to Settings
- **Action:** Click gear icon or navigate to `/settings`
- **Expected:** "Settings" heading. Tab bar with 3 tabs: "Profile", "Admin", "Organizations"
- **Verify:** Executive sees all 3 tabs (Profile + Admin + Organizations)
- **PASS:** All 3 tabs visible
- **FAIL:** Missing tabs

### 1.10.2 Profile Tab
- **Action:** "Profile" tab is active by default
- **Expected:** Card titled "Your Profile" with definition list:
  - Display Name: "Sarah Chen" + pencil edit icon on the right
  - Email: "sarah.chen@meridian.com"
  - Role: Badge "Executive"
  - Reports To: "--" (Sarah has no manager)
  - Cost Band: "Not assigned" or band name
  - Organization: "--"
- **PASS:** All fields display with correct data
- **FAIL:** Wrong data, missing fields

### 1.10.3 Profile -- Edit Display Name
- **Action:** Click the pencil icon next to Display Name
- **Expected:** Display name becomes an editable input (underline style, teal border) with "Save" and "Cancel" text buttons
- **Action:** Change name to "Sarah M. Chen"
- **Action:** Click "Save"
- **Expected:** Returns to read-only view showing "Sarah M. Chen"
- **Action:** Edit again, then click "Cancel"
- **Expected:** Reverts to previous value, no save
- **PASS:** Edit flow works
- **FAIL:** Can't edit, doesn't save

### 1.10.4 Admin Tab -- Navigate
- **Action:** Click "Admin" tab
- **Expected:** User management interface loads. Toolbar + user table + footer count

### 1.10.5 Admin Tab -- Toolbar
- **Action:** Observe the toolbar area
- **Expected:**
  - Search input: placeholder "Search by name or email..."
  - Role filter dropdown: "All Roles" default, options for all 6 roles
  - Status filter dropdown: "Active" default, option "All"
  - "+ Add User" button (primary, teal)
  - Above the toolbar (executive only): "+ Create Organization" button (dashed)
- **PASS:** All toolbar elements present
- **FAIL:** Missing elements

### 1.10.6 Admin Tab -- User Table
- **Action:** Observe the user table
- **Expected:** Table with columns: Name, Email, Role, Reports To, Cost Band, Status, Actions
  - All 10 seed users listed (default: Active filter shows only active users)
  - Role column shows badge (IC, Manager, Director, VP, Exec)
  - Status column: green dot + "Active" for active users
  - Actions column: "Edit" link + "Deactivate" link (red text). "Deactivate" not shown for current user (Sarah)
  - Footer: "10 users" count
- **PASS:** Table renders all data correctly
- **FAIL:** Missing users, wrong data

### 1.10.7 Admin Tab -- Search Filter
- **Action:** Type "elena" in the search input
- **Expected:** Table filters to show only Elena Rodriguez
- **Action:** Clear search
- **Expected:** All users return
- **Action:** Type "meridian" (part of email domain)
- **Expected:** All users with "meridian" in email shown
- **PASS:** Search filters by name and email
- **FAIL:** Filter doesn't work

### 1.10.8 Admin Tab -- Role Filter
- **Action:** Select "Manager" from role dropdown
- **Expected:** Table shows only Elena Rodriguez and David Kim (both MANAGER role)
- **Action:** Select "All Roles"
- **Expected:** All users return
- **PASS:** Role filter works
- **FAIL:** Wrong users shown

### 1.10.9 Admin Tab -- Status Filter
- **Action:** Select "All" from status dropdown
- **Expected:** Shows both active and inactive users. Inactive users have muted text + grey dot "Inactive"
- **Action:** Select "Active"
- **Expected:** Only active users shown
- **PASS:** Status filter works
- **FAIL:** Wrong filter behavior

### 1.10.10 Admin Tab -- Add User
- **Action:** Click "+ Add User"
- **Expected:** Slide-over panel from right:
  - Header: "Add User" (serif)
  - Close (X) button
  - Fields:
    - Display Name (required)
    - Email (required)
    - Role dropdown: Individual Contributor selected by default. Options: IC, Analyst, Manager, Director, VP, Executive
    - Reports To dropdown: "None (top-level)" default, lists all managers+
    - Level / Cost Band dropdown: "Not assigned" default, lists available bands
  - Footer: "Cancel" + "Add User" buttons
- **PASS:** Form opens with correct defaults
- **FAIL:** Wrong defaults, missing fields

### 1.10.11 Admin Tab -- Add User Validation
- **Action:** Click "Add User" with empty form
- **Expected:** Error: "Display name is required."
- **Action:** Fill name but leave email empty
- **Expected:** Error: "Email is required."
- **PASS:** Validation fires
- **FAIL:** No validation

### 1.10.12 Admin Tab -- Add User Submit
- **Action:** Fill:
  - Display Name: "Test User"
  - Email: "test@meridian.com"
  - Role: Employee (IC)
  - Reports To: Elena Rodriguez
- **Action:** Click "Add User"
- **Expected:** Loading state. Panel closes. New user appears in the table
- **PASS:** User created
- **FAIL:** Error, user not in table

### 1.10.13 Admin Tab -- Edit User
- **Action:** Click "Edit" link on a user row (e.g. James Okafor)
- **Expected:** Slide-over opens with "Edit User" header. Fields pre-populated:
  - Display Name: "James Okafor"
  - Email: "james.okafor@meridian.com" (disabled, not editable)
  - Role: Employee
  - Reports To: Elena Rodriguez
  - Cost Band: current value
- **Action:** Change role to "Manager". Click "Save Changes"
- **Expected:** Panel closes. User row updates to show new role
- **PASS:** Edit works
- **FAIL:** Fields not pre-populated, can't save

### 1.10.14 Admin Tab -- Deactivate User
- **Action:** Click "Deactivate" on a user row (e.g. Tom Jackson, NOT current user Sarah)
- **Expected:** ConfirmDialog:
  - Title: "Deactivate User"
  - Description: "Are you sure you want to deactivate Tom Jackson? They will no longer be able to access the platform."
  - Buttons: "Cancel" + "Deactivate" (danger/red)
- **Action:** Click "Deactivate"
- **Expected:** User row updates: text becomes muted, status changes to grey dot "Inactive", "Deactivate" link replaced with "Reactivate" link
- **PASS:** Deactivation works
- **FAIL:** Error, status doesn't change

### 1.10.15 Admin Tab -- Reactivate User
- **Action:** Switch status filter to "All". Find the deactivated user. Click "Reactivate" link
- **Expected:** User becomes active again: status dot turns green, text un-mutes, "Reactivate" changes to "Deactivate"
- **PASS:** Reactivation works
- **FAIL:** Can't reactivate

### 1.10.16 Admin Tab -- Cannot Deactivate Self
- **Action:** Find Sarah Chen's row in the user table
- **Expected:** No "Deactivate" link shown (current user cannot deactivate themselves)
- **PASS:** Self-deactivation prevented
- **FAIL:** Deactivate link visible for current user

### 1.10.17 Admin Tab -- Create Organization (Executive only)
- **Action:** Click "+ Create Organization" button (above the toolbar)
- **Expected:** Modal dialog:
  - Title: "Create Organization" (serif)
  - Fields:
    - Organization Name (required): placeholder "Acme Manufacturing Inc."
    - Timezone dropdown: options include Eastern, Central, Mountain, Pacific, UTC, London, Berlin, Tokyo. Default: "America/Chicago"
  - Buttons: "Cancel" + "Create" (disabled until name filled)
- **Action:** Type "Test Corp" and click "Create"
- **Expected:** Loading state. Modal closes
- **PASS:** Org creation works
- **FAIL:** Error

### 1.10.18 Organizations Tab
- **Action:** Click "Organizations" tab
- **Expected:**
  - Current Organization card (teal left border):
    - Heading: "Sarah Chen's Organization" (or similar)
    - "Current" badge (teal)
    - Users count, Org ID (truncated UUID)
  - "+ Create Organization" button (dashed)
  - "Portfolio Organizations" section (placeholder text about future multi-org)
- **PASS:** Tab renders with correct data
- **FAIL:** Missing org data

### 1.10.19 Organizations Tab -- Create Org Modal
- **Action:** Click "+ Create Organization" on the Organizations tab
- **Expected:** CreateOrgModal opens (same as in Admin tab) with name and timezone fields
- **PASS:** Modal opens
- **FAIL:** Nothing happens

---

## 1.11 Standalone Pages

### 1.11.1 Landing Page
- **Action:** Navigate to `/landing`
- **Expected:** Full-page marketing landing page (outside Layout, no nav bar). Sections in order:
  - HeroSection
  - ProblemSection
  - HowItWorksSection
  - RoleCardsSection
  - PreviewCardsSection
  - StatsStrip
  - LandingFooter
- **PASS:** All sections render
- **FAIL:** Broken layout, missing sections

### 1.11.2 Architecture Page
- **Action:** Navigate to `/architecture`
- **Expected:** Full architecture documentation page (outside Layout). Sections:
  - ArchitectureNav (sticky navigation)
  - Hero: "System Architecture" heading
  - Executive Overview section (expandable card)
  - TechStackStrip
  - System Overview diagram (Mermaid)
  - Core Data Model diagram (Mermaid ER)
  - Weekly Lifecycle State Machine diagram (Mermaid)
  - From Commitment to Intelligence diagram (Mermaid sequence)
  - Architecture Decisions grid
  - REST API reference table
  - Simulation section
  - Footer with "Back to application" link
- **Action:** Click "Back to application" link in footer
- **Expected:** Navigates to `/` (My Week)
- **PASS:** All sections render, link works
- **FAIL:** Missing diagrams, broken navigation

---

## 1.12 Backward-Compat Redirects

### 1.12.1 /cycle redirects to /
- **Action:** Navigate to `/cycle`
- **Expected:** Redirects to `/` (My Week)

### 1.12.2 /reconciliation redirects to /
- **Action:** Navigate to `/reconciliation`
- **Expected:** Redirects to `/`

### 1.12.3 /dashboard redirects to /team
- **Action:** Navigate to `/dashboard`
- **Expected:** Redirects to `/team`

### 1.12.4 /observatory redirects to /briefing
- **Action:** Navigate to `/observatory`
- **Expected:** Redirects to `/briefing`

### 1.12.5 /observatory/portfolio redirects to /portfolio
- **Action:** Navigate to `/observatory/portfolio`
- **Expected:** Redirects to `/portfolio`

- **PASS for all:** Correct redirect destination
- **FAIL:** 404, wrong redirect

---

# PART 2: MANAGER (Elena Rodriguez)

Elena Rodriguez has access to: My Week, My Team, Settings (Profile + Admin tabs only, no Organizations tab)

## 2.0 Login as Elena Rodriguez

### 2.0.1 Switch User
- **Action:** Clear localStorage (`compass-dev-auth`). Refresh page to see DevLogin. Click Elena Rodriguez row
- **Expected:** Logs in as Elena. Avatar initials: "ER"
- **PASS:** Logged in with correct context
- **FAIL:** Wrong user

---

## 2.1 Navigation -- Manager Tab Visibility

### 2.1.1 Verify Tab Bar
- **Action:** Observe nav tab bar
- **Expected:** Only 2 tabs visible: "My Week" and "My Team"
  - "The Briefing" NOT visible (requires DIRECTOR+)
  - "Strategy" NOT visible (requires VP+)
  - "Portfolio" NOT visible (requires VP+)
- **PASS:** Only My Week and My Team tabs
- **FAIL:** Extra tabs visible

---

## 2.2 My Week -- Elena's Commitments

### 2.2.1 Elena's Week 3 Commitments
- **Action:** Navigate to My Week
- **Expected:** Elena has 1 commitment in Week 3: "Communicate approved material spec to all production supervisors" (Operational, EOD, linked to Operational Excellence > Reduce Scrap Rate > New material spec approved)
- **Verify:** DRAFT state, commitment is editable
- **PASS:** Correct commitment data
- **FAIL:** Wrong commitments

### 2.2.2 Week History -- Navigate to Week 1 (RECONCILED)
- **Action:** Click Week 1 pill in CycleHistorySelector
- **Expected:** Shows Elena's Week 1 data in RECONCILED view: "Complete Line 3 scrap audit..." with COMPLETED status badge
- **Action:** Navigate back to Week 3
- **PASS:** Historical view works
- **FAIL:** Wrong data

### 2.2.3 Week History -- Navigate to Week 2 (LOCKED)
- **Action:** Click Week 2 pill
- **Expected:** Shows Elena's Week 2 data in LOCKED state. No edit/delete buttons on commitment cards
- **PASS:** Locked view is read-only
- **FAIL:** Edit controls visible in LOCKED state

---

## 2.3 My Team -- Manager View

### 2.3.1 Elena's Team
- **Action:** Navigate to My Team
- **Expected:** Elena sees her direct reports: James Okafor and Priya Sharma. Page heading "My Team"
- **Verify:** Team size metric shows 2 (or appropriate count)
- **PASS:** Correct team members displayed
- **FAIL:** Wrong members, access denied

### 2.3.2 Assign Work to James
- **Action:** Expand James's PersonCard. Click "Assign work ->"
- **Expected:** AssignWorkForm opens with James pre-selected in "Assign to" dropdown
- **Action:** Fill: Title "Review safety protocol documentation", Bullet 1 "Pull current docs", Bullet 2 "Flag outdated sections". Click "Assign"
- **Expected:** Assignment created. James's expanded card should show the new commitment
- **PASS:** Assignment works
- **FAIL:** Error

---

## 2.4 Settings -- Manager View

### 2.4.1 Settings Tab Visibility
- **Action:** Navigate to Settings
- **Expected:** 2 tabs visible: "Profile" and "Admin"
  - "Organizations" tab NOT visible (requires VP+)
- **PASS:** Correct 2 tabs
- **FAIL:** Organizations tab visible

### 2.4.2 Admin Tab -- No Create Org Button
- **Action:** Click Admin tab
- **Expected:** No "+ Create Organization" button above the toolbar (Executive only feature)
- **PASS:** Button not shown
- **FAIL:** Button visible for Manager

### 2.4.3 Profile Tab -- Elena's Data
- **Action:** Click Profile tab
- **Expected:**
  - Display Name: "Elena Rodriguez"
  - Email: "elena.rodriguez@meridian.com"
  - Role: Badge "Manager"
  - Reports To: "Marcus Wright"
- **PASS:** Correct profile data
- **FAIL:** Wrong data

---

# PART 3: IC / EMPLOYEE (James Okafor)

James Okafor has access to: My Week only (plus Settings with Profile tab only)

## 3.0 Login as James Okafor

### 3.0.1 Switch User
- **Action:** Clear localStorage. Refresh. Click James Okafor row
- **Expected:** Logs in as James. Avatar initials: "JO"
- **PASS:** Correct login
- **FAIL:** Wrong user

---

## 3.1 Navigation -- Employee Tab Visibility

### 3.1.1 Verify Tab Bar
- **Action:** Observe nav tab bar
- **Expected:** Only 1 tab visible: "My Week"
  - "My Team" NOT visible (requires MANAGER+)
  - "The Briefing" NOT visible (requires DIRECTOR+)
  - "Strategy" NOT visible (requires VP+)
  - "Portfolio" NOT visible (requires VP+)
- **PASS:** Only My Week tab
- **FAIL:** Extra tabs visible

---

## 3.2 My Week -- Employee View

### 3.2.1 James's Commitments
- **Action:** Navigate to My Week
- **Expected:** James has 1 commitment in Week 3: "Establish weekly scrap tracking dashboard in PowerBI" (Operational, EOW, linked to Operational Excellence > Reduce Scrap Rate)
- **PASS:** Correct data
- **FAIL:** Wrong commitments

### 3.2.2 Assigned Work Indicator
- **Action:** Check if James has any assigned commitments (Week 2: carried forward from Week 1, assigned by Elena)
- **Expected:** If in a cycle where James has an assigned commitment: card shows teal left border (3px), "A" instead of rank number (teal circle), "Assigned by Elena Rodriguez" label with person icon above the title
- **PASS:** Assignment attribution displays correctly
- **FAIL:** No attribution visible

### 3.2.3 Full CRUD Cycle as Employee
- **Action:** Create a new commitment: Title "Test IC commitment", 2 bullets, category Strategic, horizon EOD
- **Action:** Edit it: change title to "Updated IC commitment"
- **Action:** Delete it: confirm delete
- **Expected:** Full create-edit-delete cycle works for IC user
- **PASS:** All CRUD operations work
- **FAIL:** Any operation fails

### 3.2.4 Commitment Card -- Hover States
- **Action:** Hover over a commitment card
- **Expected:**
  - Card background changes from `bg-surface-lowest` to `bg-surface` (subtle hover)
  - Edit pencil icon fades in (opacity 0 -> 100 on desktop)
  - Delete trash icon fades in (opacity 0 -> 100 on desktop)
  - Drag handle opacity increases (50% -> 100%)
- **Action:** Move mouse away
- **Expected:** All hover states revert with fast transition
- **PASS:** All hover states work
- **FAIL:** No hover effects

---

## 3.3 Settings -- Employee View

### 3.3.1 Settings Tab Visibility
- **Action:** Navigate to Settings (via gear icon)
- **Expected:** Only 1 tab visible: "Profile"
  - "Admin" tab NOT visible (requires MANAGER+)
  - "Organizations" tab NOT visible (requires VP+)
- **PASS:** Only Profile tab
- **FAIL:** Extra tabs visible

### 3.3.2 Profile Tab -- James's Data
- **Action:** Observe Profile tab
- **Expected:**
  - Display Name: "James Okafor"
  - Email: "james.okafor@meridian.com"
  - Role: Badge "Individual Contributor"
  - Reports To: "Elena Rodriguez"
  - Cost Band: value or "Not assigned"
  - Organization: "--"
- **PASS:** Correct data
- **FAIL:** Wrong data

### 3.3.3 Profile -- Edit Display Name (IC)
- **Action:** Click pencil icon next to Display Name
- **Expected:** Edit mode: input with "James Okafor", Save/Cancel buttons
- **Action:** Change to "James K. Okafor", click Save
- **Expected:** Name updates
- **PASS:** Edit works for IC
- **FAIL:** Can't edit

---

## 3.4 Access Restrictions -- Employee Trying Restricted URLs

### 3.4.1 /team URL Direct Access
- **Action:** Manually navigate to `/team` in the URL bar
- **Expected:** MyTeamPage renders but shows access restricted view: "Access Restricted" heading, "My Team is only accessible to managers and above." message
- **PASS:** Graceful access denial
- **FAIL:** Page loads with data, or crashes

### 3.4.2 /briefing URL Direct Access
- **Action:** Navigate to `/briefing`
- **Expected:** BriefingView renders with access restricted: "Access Restricted", "The Briefing is only accessible to Directors, VPs, and Executives."
- **PASS:** Graceful denial
- **FAIL:** Page loads

### 3.4.3 /strategy URL Direct Access
- **Action:** Navigate to `/strategy`
- **Expected:** StrategyPage shows: "You do not have access to manage strategy. VP or Executive role required."
- **PASS:** Access denied
- **FAIL:** Strategy page loads

### 3.4.4 /portfolio URL Direct Access
- **Action:** Navigate to `/portfolio`
- **Expected:** PortfolioPage loads (no explicit role guard in PortfolioPage code -- may show loading or error if API returns 403)
- **Verify:** Check if API returns appropriate error for non-VP/Executive
- **PASS:** Appropriate handling
- **FAIL:** Full data visible to IC

---

# PART 4: CROSS-CUTTING CONCERNS

## 4.1 Error Boundary

### 4.1.1 Error Boundary Recovery
- **Action:** If an error occurs on any page (or can be triggered)
- **Expected:** ErrorBoundary catches it. Shows error UI rather than blank white screen
- **PASS:** Error boundary renders fallback
- **FAIL:** White screen of death

## 4.2 Loading States

### 4.2.1 Skeleton Loaders
- **Action:** On initial page load (or throttle network), observe loading states
- **Expected:** SkeletonLoader components show pulsing grey card placeholders (variant="card", count=3 on My Week)
- **PASS:** Skeleton loaders appear during load
- **FAIL:** Blank page during load

### 4.2.2 Full-Page Spinner
- **Action:** Navigate to a lazy-loaded page (e.g. Briefing Health Map tab)
- **Expected:** LoadingSpinner appears (centered, with optional label text)
- **PASS:** Spinner shows
- **FAIL:** Blank page

## 4.3 Design System Consistency

### 4.3.1 Typography
- **Verify across all pages:**
  - Headlines use `font-serif` (serif typeface)
  - Body text uses `text-body` (sans-serif)
  - Labels use `text-label` or `label-caps` (uppercase, tracking)
  - Monospace for technical values (font-mono)
- **PASS:** Consistent typography
- **FAIL:** Mixed fonts, wrong sizes

### 4.3.2 Color Palette
- **Verify across all pages:**
  - Primary accent: teal (#036A6A) for active states, links, primary buttons
  - Background: warm off-white (`bg-surface`)
  - Cards: `bg-surface-lowest` (slightly lighter)
  - Error: red tones
  - Warning: amber/gold tones
  - Navy: used for supplementary info
- **PASS:** Consistent colors
- **FAIL:** Clashing colors, wrong palette

### 4.3.3 Transitions and Animations
- **Verify across all pages:**
  - Page transitions use `animate-fade-up` with stagger delays
  - Hover transitions use `duration-[var(--duration-fast)]` (~150ms)
  - Panel slide-overs: 300ms entrance, 200ms exit
  - Accordion expand/collapse: 300ms max-height transition
- **PASS:** Smooth, consistent animations
- **FAIL:** Janky, instant, or missing transitions

### 4.3.4 Responsive Breakpoints
- **Test at:**
  - 1280px+ (full desktop): two-column layouts, horizontal Kanban
  - 900-1279px: tab bar still visible, layouts may stack
  - <900px: hamburger menu, single-column layouts
  - <640px: tighter padding, smaller headings
- **PASS:** Layout adapts at each breakpoint
- **FAIL:** Overflow, overlapping elements, broken layouts

## 4.4 Toast Notifications

### 4.4.1 Success Toast
- **Action:** Perform an action that triggers a toast (e.g. accept a carried-forward item)
- **Expected:** Toast appears (likely bottom-center or top-right) with success message and auto-dismisses
- **PASS:** Toast appears and dismisses
- **FAIL:** No toast

## 4.5 Confirm Dialogs

### 4.5.1 Dialog Accessibility
- **Verify for all ConfirmDialog instances:**
  - Overlay: dark scrim covers background
  - Dialog: centered, white background, rounded corners
  - Focus trapped inside dialog
  - Escape key closes dialog (unless loading)
  - Click outside closes dialog (unless loading)
  - Loading state disables all buttons
- **PASS:** Accessible dialogs
- **FAIL:** Focus escapes, can't close

---

# APPENDIX: Test Execution Checklist

| # | Test | Role | Result |
|---|------|------|--------|
| 1.0.1 | Dev Login page loads | EXEC | |
| 1.0.2 | Log in as Sarah Chen | EXEC | |
| 1.1.1 | Nav structure correct | EXEC | |
| 1.1.2 | Tab bar shows 5 tabs | EXEC | |
| 1.1.3 | Navigate all tabs | EXEC | |
| 1.1.4 | Settings gear icon | EXEC | |
| 1.1.5 | Mobile hamburger menu | EXEC | |
| 1.1.6 | Restore desktop width | EXEC | |
| 1.2.1 | My Week page load | EXEC | |
| 1.2.2 | Cycle state banner | EXEC | |
| 1.2.3 | Week pill navigation | EXEC | |
| 1.2.4 | Commitment summary strip | EXEC | |
| 1.2.5 | Commitment card display | EXEC | |
| 1.2.6 | Expand commitment bullets | EXEC | |
| 1.2.7 | Edit commitment form opens | EXEC | |
| 1.2.8 | Title field validation | EXEC | |
| 1.2.9 | Task bullets editor | EXEC | |
| 1.2.10 | Category selector | EXEC | |
| 1.2.11 | Horizon selector | EXEC | |
| 1.2.12 | Strategy linker | EXEC | |
| 1.2.13 | Attribution selector | EXEC | |
| 1.2.14 | Notes textarea | EXEC | |
| 1.2.15 | Cancel form | EXEC | |
| 1.2.16 | Save changes (edit) | EXEC | |
| 1.2.17 | Create new commitment | EXEC | |
| 1.2.18 | Full form fill + save | EXEC | |
| 1.2.19 | Delete commitment | EXEC | |
| 1.2.20 | Drag-and-drop reorder | EXEC | |
| 1.2.21 | Rally cry sidebar | EXEC | |
| 1.2.22 | Empty state | EXEC | |
| 1.3.1 | Lock commitments | EXEC | |
| 1.3.2 | Lock disabled (0 commits) | EXEC | |
| 1.3.3 | Begin reconciliation | EXEC | |
| 1.4.1 | Unplanned work banner | EXEC | |
| 1.4.2 | Unplanned work form | EXEC | |
| 1.4.3 | Unplanned work validation | EXEC | |
| 1.4.4 | Unplanned work submit | EXEC | |
| 1.4.5 | Unplanned work cancel | EXEC | |
| 1.4.6 | Planned vs Actual accordion | EXEC | |
| 1.4.7 | Expand commitment row | EXEC | |
| 1.4.8 | Status: Completed | EXEC | |
| 1.4.9 | Status: Partial | EXEC | |
| 1.4.10 | Status: Not Started | EXEC | |
| 1.4.11 | Bullet checkboxes | EXEC | |
| 1.4.12 | Carry forward toggle | EXEC | |
| 1.4.13 | Bottom bar display | EXEC | |
| 1.4.14 | Complete recon disabled | EXEC | |
| 1.4.15 | Complete reconciliation | EXEC | |
| 1.4.16 | Reconciled state view | EXEC | |
| 1.5.1 | Carry forward panel | EXEC | |
| 1.5.2 | Accept carried item | EXEC | |
| 1.5.3 | Decline carried item | EXEC | |
| 1.5.4 | All items accepted | EXEC | |
| 1.6.1 | Navigate My Team | EXEC | |
| 1.6.2 | Team summary card | EXEC | |
| 1.6.3 | Team metrics strip | EXEC | |
| 1.6.4 | Rally cry coverage cards | EXEC | |
| 1.6.5 | Team members header | EXEC | |
| 1.6.6 | Person cards collapsed | EXEC | |
| 1.6.7 | Person card expand | EXEC | |
| 1.6.8 | Person card borders | EXEC | |
| 1.6.9 | Assign work from person | EXEC | |
| 1.6.10 | Assign work from header | EXEC | |
| 1.6.11 | AssignWorkForm layout | EXEC | |
| 1.6.12 | AssignWorkForm validation | EXEC | |
| 1.6.13 | AssignWorkForm submit | EXEC | |
| 1.6.14 | CHESS category toggle | EXEC | |
| 1.6.15 | Day/time pills toggle | EXEC | |
| 1.6.16 | Bullet management | EXEC | |
| 1.6.17 | Team analytics | EXEC | |
| 1.7.1 | Navigate Briefing | EXEC | |
| 1.7.2 | Mode tab bar | EXEC | |
| 1.7.3 | Narrative card | EXEC | |
| 1.7.4 | Export PDF | EXEC | |
| 1.7.5 | Sources toggle | EXEC | |
| 1.7.6 | Metrics strip | EXEC | |
| 1.7.7 | Rally cry drill-down | EXEC | |
| 1.7.8 | Breadcrumb navigation | EXEC | |
| 1.7.9 | Team health table | EXEC | |
| 1.7.10 | AI chat sidebar | EXEC | |
| 1.7.11 | AI chat send message | EXEC | |
| 1.7.12 | AI chat enter key | EXEC | |
| 1.7.13 | AI chat empty send | EXEC | |
| 1.8.1 | Navigate Strategy | EXEC | |
| 1.8.2 | Kanban layout | EXEC | |
| 1.8.3 | Rally cry column content | EXEC | |
| 1.8.4 | Add rally cry | EXEC | |
| 1.8.5 | Add objective | EXEC | |
| 1.8.6 | Add outcome | EXEC | |
| 1.8.7 | Edit rally cry | EXEC | |
| 1.8.8 | Edit objective | EXEC | |
| 1.8.9 | Edit outcome | EXEC | |
| 1.8.10 | Archive rally cry | EXEC | |
| 1.8.11 | Archive obj/outcome | EXEC | |
| 1.8.12 | Save disabled when empty | EXEC | |
| 1.9.1 | Navigate Portfolio | EXEC | |
| 1.9.2 | Portfolio narrative | EXEC | |
| 1.9.3 | Portfolio metrics | EXEC | |
| 1.9.4 | Company cards | EXEC | |
| 1.9.5 | Comparison table | EXEC | |
| 1.9.6 | Portfolio AI chat | EXEC | |
| 1.9.7 | Cycle history in portfolio | EXEC | |
| 1.10.1 | Navigate Settings | EXEC | |
| 1.10.2 | Profile tab | EXEC | |
| 1.10.3 | Edit display name | EXEC | |
| 1.10.4 | Admin tab navigate | EXEC | |
| 1.10.5 | Admin toolbar | EXEC | |
| 1.10.6 | Admin user table | EXEC | |
| 1.10.7 | Search filter | EXEC | |
| 1.10.8 | Role filter | EXEC | |
| 1.10.9 | Status filter | EXEC | |
| 1.10.10 | Add user form | EXEC | |
| 1.10.11 | Add user validation | EXEC | |
| 1.10.12 | Add user submit | EXEC | |
| 1.10.13 | Edit user | EXEC | |
| 1.10.14 | Deactivate user | EXEC | |
| 1.10.15 | Reactivate user | EXEC | |
| 1.10.16 | Cannot deactivate self | EXEC | |
| 1.10.17 | Create organization | EXEC | |
| 1.10.18 | Organizations tab | EXEC | |
| 1.10.19 | Orgs create modal | EXEC | |
| 1.11.1 | Landing page | EXEC | |
| 1.11.2 | Architecture page | EXEC | |
| 1.12.1-5 | Backward-compat redirects | EXEC | |
| 2.0.1 | Login as Elena | MGR | |
| 2.1.1 | Manager tab visibility | MGR | |
| 2.2.1 | Elena's commitments | MGR | |
| 2.2.2 | Week 1 history | MGR | |
| 2.2.3 | Week 2 locked view | MGR | |
| 2.3.1 | Elena's team | MGR | |
| 2.3.2 | Assign work to James | MGR | |
| 2.4.1 | Settings 2 tabs | MGR | |
| 2.4.2 | No create org button | MGR | |
| 2.4.3 | Elena's profile | MGR | |
| 3.0.1 | Login as James | IC | |
| 3.1.1 | Employee tab visibility | IC | |
| 3.2.1 | James's commitments | IC | |
| 3.2.2 | Assigned work indicator | IC | |
| 3.2.3 | Full CRUD cycle | IC | |
| 3.2.4 | Hover states | IC | |
| 3.3.1 | Settings 1 tab | IC | |
| 3.3.2 | James's profile | IC | |
| 3.3.3 | Edit display name (IC) | IC | |
| 3.4.1 | /team access denied | IC | |
| 3.4.2 | /briefing access denied | IC | |
| 3.4.3 | /strategy access denied | IC | |
| 3.4.4 | /portfolio access check | IC | |
| 4.1.1 | Error boundary | ALL | |
| 4.2.1 | Skeleton loaders | ALL | |
| 4.2.2 | Full-page spinner | ALL | |
| 4.3.1 | Typography | ALL | |
| 4.3.2 | Color palette | ALL | |
| 4.3.3 | Transitions/animations | ALL | |
| 4.3.4 | Responsive breakpoints | ALL | |
| 4.4.1 | Toast notifications | ALL | |
| 4.5.1 | Dialog accessibility | ALL | |
