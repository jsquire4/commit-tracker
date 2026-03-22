# Data Integrity Audit — 2026-03-22

Full audit of every metric, computation, and display across all views and roles.

## CRITICAL (math is wrong, user sees incorrect data)

| # | Issue | Where |
|---|-------|-------|
| C1 | Reconciliation summary is org-wide, not per-user. Employee sees everyone's numbers. "Complete Reconciliation" blocked until entire org finishes. | `ReconciliationService.computeSummary()` |
| C2 | SpeechBubble + CompletionTrendChart tooltip ×100 double-multiplication. Shows 7200% instead of 72%. | `ExecutionTrendChart.tsx:380,384`, `CompletionTrendChart.tsx:36` |
| C3 | Trend arrows ALL show flat — case mismatch. Backend sends `"declining"`, frontend checks `"DECLINING"`. | `ExecutiveHealthPage.tsx`, `OrgUnitCard.tsx` |
| C4 | CHESS distribution bar on executive manager cards is fabricated. Operational/Defensive/Capability are synthetic 40/35/25 split of remainder, not real data. | `ExecutiveHealthPage.tsx` |
| C5 | TeamTrajectories always empty. Filters for `role === 'MANAGER'` but backend only emits VP/DIRECTOR units. | `TeamTrajectories.tsx` |
| C6 | "Rally Cry Coverage" KPI is actually Strategic %. Different metric entirely. | `ObservatoryPage.tsx`, `ExecutionTrendChart.tsx` |
| C7 | Two different "completion rate" definitions. ReconciliationService counts COMPLETED only. AnalyticsService counts COMPLETED + PARTIALLY_COMPLETED. | `ReconciliationService` vs `AnalyticsService` |
| C8 | TeamRollupTable completion = "any recon record" including NOT_STARTED and CARRIED_FORWARD. | `TeamRollupTable.tsx:50-51` |
| C9 | Rally cries with zero team coverage are completely invisible — absent from both byRallyCry and uncoveredObjectives. | `DashboardService.getRcdoCoverage()` |
| C10 | Integrity flags never fire — un-resolved null cycleId passed to detectCompletionMismatch and detectDuplicateNotes. | `DriftDetectionService.detectSignalIntegrity()` |
| C11 | Carry-forward trend dot inverted — green when rate increases (bad), yellow when decreases (good). | `LlmBriefingService.buildMetrics()` |

## HIGH (data is misleading or inconsistent across views)

| # | Issue | Where |
|---|-------|-------|
| H1 | Dashboard ignores cycle history selector — always shows active cycle while commitments show historical. | `MyTeamPage.tsx` |
| H2 | PersonCard CHESS bar vs commitment counts from different cycles when historical cycle selected. | `PersonCard.tsx` |
| H3 | Manager's own commitments excluded from every team metric but included in org-wide. No way to see where they count. | `findSubtreeUserIds` SQL, `ExecutiveHealthComposer` |
| H4 | Category names not normalized in DashboardService — raw `getName()` vs `CategoryUtils.normalizeCategoryName()` elsewhere. | `DashboardService` |
| H5 | DisplacementService doesn't filter to RECONCILED cycles — inconsistent with all other analytics. | `DisplacementService.resolveRecentCycles()` |
| H6 | MyTeamPage carry-forward counts carry-ins (carriedFromCommitmentId != null) not CARRIED_FORWARD reconciliation status. | `MyTeamPage.tsx:108-111` |
| H7 | CarryForwardVelocity uses org-scoped commitments not team-scoped. | `CarryForwardVelocity.tsx` |
| H8 | ChessMiniBar denominator excludes uncategorized — bar over-represents categorized proportions. | `ChessMiniBar.tsx` |
| H9 | Briefing drill-down Level 2 (TeamDetailLevel) charts show org-wide data, not team-filtered. CompletionTrend, DisplacementReport, CarryChains all unfiltered. | `TeamDetailLevel.tsx` |
| H10 | TeamDetailLevel carryForwardCount in header counts org-wide chains, not this team's. | `TeamDetailLevel.tsx` |
| H11 | TeamDetailLevel alignment % uses org-wide data for non-managers. | `TeamDetailLevel.tsx` |
| H12 | StubBriefingService returns empty metrics — metrics strip invisible without LLM configured. | `StubBriefingService.java` |

## MEDIUM (wrong labels, missing data, config ignored)

| # | Issue | Where |
|---|-------|-------|
| M1 | "Unplanned Work %" label is actually Not Started rate. | `WeekOnWeek.tsx` |
| M2 | "Total assignments" card shows manager-assigned count only, not total. | `AssignmentSignals.tsx` |
| M3 | Concentration risk thresholds differ — backend ≥50%, frontend >60%. | `AssignmentSignals.tsx` vs `DashboardService` |
| M4 | Displacement Events row hardcoded to "—" when per-week data exists. | `WeekOnWeek.tsx:131` |
| M5 | Heatmap manager "(you)" row uses team-averaged data, not personal. | `ExecutionHeatmap.tsx` |
| M6 | Signal thresholds hardcoded — ignore ObservatoryConfig. | `ObservatorySignals.tsx`, `AnalyticsService` |
| M7 | CHESS color lookup inconsistent — some components normalize, some don't. | `MemberCommitmentDetail.tsx` vs `PersonCard.tsx` |
| M8 | RallyCrySidebar not cycle-scoped — shows current rally cries for historical views. | `RallyCrySidebar.tsx` |
| M9 | Decline reason input captured but never sent to API. | `CarryForwardPanel.tsx` |
| M10 | RallyCryLevel headcount fallback uses commitments.length instead of distinct user count. | `RallyCryLevel.tsx` |
| M11 | RallyCryLevel uncovered objectives keyed by title string, not ID. | `RallyCryLevel.tsx` |
| M12 | RallyCryLevel watch list unlinked filter requires 100% unlinked — partially-unlinked members omitted. | `RallyCryLevel.tsx` |
| M13 | PersonDetailLevel RC coverage groups by title string, not ID. | `PersonDetailLevel.tsx` |
| M14 | PersonDetailLevel "Strategic" count uses exact string match — casing mismatch possible. | `PersonDetailLevel.tsx` |
| M15 | RallyCryDetailLevel DO-level count ≠ sum of outcome counts when commitments stop at DO level. | `RallyCryDetailLevel.tsx` |
| M16 | AlignmentTrendChart doesn't include "Not Categorized" segment — inconsistent with ExecutionTrendChart. | `AlignmentTrendChart.tsx` |
| M17 | DashboardService 4x independent loadDashboardData calls — performance, slight consistency risk. | `DashboardController.java` |
| M18 | OrgUnitHealth.headcount counts direct reports only, not full subtree. | `ExecutiveHealthComposer.java` |
| M19 | ExecutiveHealthPage gradeFromAlignment thresholds hardcoded (50/30) vs backend configurable. | `ExecutiveHealthPage.tsx` |

## STUBS (known, still hardcoded)

| # | What | Where |
|---|------|-------|
| S1 | Entire portfolio page is fake data — 3 fictional companies. | `portfolio.api.ts` |
| S2 | Chat sidebar is client-side keyword matching. | `useAIChat.ts` |
| S3 | Portfolio seed chat messages. | `PortfolioPage.tsx` |
| S4 | ProgramSummary placeholder text. | `ProgramSummary.tsx` |
