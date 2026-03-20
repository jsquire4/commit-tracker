# Compass — Problem Statement & Design Thinking

*Working document — not a spec. A place to think.*

---

## The Real Goal

This isn't just "build a 15-Five replacement." The artifact needs to demonstrate:
1. Builder capability (technical execution)
2. Domain understanding (PE turnaround operational/strategic challenges)
3. Product thinking — not "hit requirements," but "understands what a turnaround PE firm encounters when working with portcos"

The eval is code review + demo. Both need to be tight.

---

## What the App Currently Is

A functional weekly commitment tracker with RCDO alignment, chess categorization, manager oversight, and reconciliation flow. It answers: **"What did my team commit to this week?"**

It's a compliance tool. It collects data. It does not tell a story.

---

## What It Needs to Be

An **early warning system** for turnaround execution. It should answer in 60 seconds:
> "Is this portco executing against the turnaround thesis, and is it getting better or worse?"

The difference: reporting tells you what happened. An early warning system tells you what's about to go wrong.

---

## The Core Tension

**Commitments are inputs, not the product. The product is the signal.**

The app is currently built inside-out — organized around data entry (commitments as the primary object) when it should be organized around insight delivery (execution health as the primary object, commitments as the underlying evidence).

---

## What a PE Turnaround Operator Actually Worries About

- **Time.** 3-5 year hold period. Every week of misalignment costs money.
- **Drift, not state.** The dangerous situation isn't a team that's always been 40% strategic. It's a team that was 80% strategic in week 2 and is 40% now — without anyone making a conscious decision. Drift happens through accumulated individual weekly choices.
- **Middle management is the real lever.** ICs follow what managers assign and approve. A manager who assigns 80% operational work to their team is a turnaround risk, whether intentionally or not.
- **Information asymmetry.** Portco leadership often doesn't know what's actually happening at the IC level. The tool needs to compress that gap.
- **The data quality problem is a trust problem.** If employees believe this data feeds performance reviews, they'll game it. The signal becomes noise.
- **The Superorg is the actual product.** The portco tool is data collection. The PE firm's real value accumulates across 10 acquisitions: "portcos that hit 70%+ strategic alignment in weeks 1-4 have 2x turnaround success rate." That's proprietary operational intelligence.

---

## The Data Quality / Compliance Problem

The app asks people to do work (enter commitments, link RCDO, reconcile honestly) and gives them almost nothing back. Value flows up to managers. Labor flows down to employees. That's a compliance death spiral.

But — this is a PE turnaround context. ICs aren't voluntarily using this; they're required to. So "make ICs want to use it" isn't the right frame. The right frame is: **make gaming it harder than doing it right**, and make the data honest by design.

Specific risks:
- Categorizing everything as "Strategic" is as easy as being honest → alignment signal is noise
- RCDO linking is a 3-level dropdown → most likely field to be skipped or filled wrong
- Reconciliation notes are written for managers, not for the person writing them → low honesty incentive

---

## What's Actually Built (Current State)

### 5 Views
1. **Commit Entry** — CRUD, drag-to-reorder, completion horizons, chess category, RCDO linking, task bullets
2. **Weekly Lifecycle** — cycle state machine (DRAFT→LOCKED→RECONCILING→RECONCILED), carry-forward panel
3. **Reconciliation** — planned vs actual, per-commitment status + notes, task bullet checkboxes, completion summary
4. **Manager Dashboard** — Alignment Gap Chart (% strategic/operational), Assignment Signals, Team Rollup Table
5. **Chessboard** — visual grid by priority tier × chess category (read-only, drag not implemented)

### Seed Data
- 3 weeks (Mar 2, 9, 16, 2026), org: Meridian Manufacturing
- 10 users, realistic hierarchy (EXECUTIVE → VP → DIRECTOR → MANAGER → EMPLOYEE + ANALYST)
- 21 commitments, 6 reconciliation records (Week 1 only), carry-forward chains
- RCDO: 2 Rally Cries (Operational Excellence, Digital Transformation), 4 Defining Objectives, 5 Outcomes

### Data Model (solid)
The data to answer the PE questions is already tracked:
- 3 weeks of commitments with categories and RCDO links
- Reconciliation records with statuses and carry-forward chains
- Assignment attribution (who assigned what)
- RCDO coverage metrics computed by DashboardService

---

## What's Broken / Incomplete

- **`activeCycleId` hardcoded as empty string** in ManagerDashboardPage — cycle filtering is wired to nothing
- **Chessboard drag-to-reorder not implemented** — grid exists but is read-only
- **No historical reconciliation view** — ReconciliationPage redirects away from completed cycles; Week 1 data is invisible
- **No cycle navigation** — can't browse back to past cycles from the UI
- **RCDO coverage UI underdeveloped** — metrics computed in backend, not surfaced prominently in dashboard
- **No trend/velocity view** — the most critical PE signal

---

## The Conceptual Gap

The data to answer "is this team drifting?" is already in the model. It's not being surfaced.

| What's needed | Status |
|---|---|
| Week-over-week alignment % trend | Not built |
| Carry-forward velocity over time | Not built |
| Rally Cry coverage heatmap | Not built (data exists, UI doesn't show it) |
| Execution health score / grade | Not built |
| Drift detection / anomaly surfacing | Not built |
| PE vocabulary ("execution health" vs "team commitments") | Not done |

---

## Potential Investment Areas (not yet prioritized)

### Fix broken things first
- Hardcoded cycle ID in dashboard
- Historical reconciliation view
- Chessboard drag-to-reorder (or at minimum, not feel broken)
- Cycle navigation

### Trend/velocity layer on the dashboard
Strategic alignment % trending week-over-week (sparklines), carry-forward rate by week, Rally Cry coverage over time. This is the single highest-leverage addition — transforms the app from tracker to early warning system. **3 weeks of seed data is already enough to show drift.**

### RCDO coverage as a prominent signal
Which Rally Cries have zero or thin coverage this week? This should be loud, not buried. A portco where Rally Cry #2 has zero commitments from anyone is a red flag for a PE operator.

### Better seed data
Show a realistic drift story: team starts 70% strategic, drifts to 45% by week 6, begins recovery. Enough data to tell a narrative. Currently only 3 weeks.

### Language and framing
The app needs to speak PE. "Execution health" not "team commitments." "Turnaround alignment" not "RCDO coverage." The vocabulary matters in a demo.

### Superorg architecture note
Already in the data model (org is a first-class concept). But does anything in the app *say that out loud*? A comment in code, a note in a README, something in the dashboard header that implies this is one portco of many — that signal matters.

---

## Open Questions (still ruminating)

- Is the delta between "hit requirements" and "gets it" mostly about features, or mostly about how existing features are framed?
- What's the 60-second demo narrative? Start with the executive view showing drift, drill down to the manager causing it, then show how the tool surfaces the intervention point?
- How do you make categorization honest by design, not just required by form? Is there a structural answer here or just a cultural/process one?
- Does the chessboard need to be more central to the PE story, or is it more of a nice IC planning tool that's secondary to the dashboard?
- What would the ideal seed data story be? (drift pattern, recovery, one team off-track vs. another on-track — contrast is probably the most compelling demo structure)
