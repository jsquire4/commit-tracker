# Compass Execution Observatory — Scenario Bible

> This document defines the narratives that the seed data must encode.
> Each story is written first, then validated against the application's data model.
> The seed generator is the *last* step — it encodes these stories, not random data.

---

## The Portfolio: Apex Capital Partners

Apex is a mid-market PE firm specializing in industrial and services roll-ups. They acquired four companies over the last 18 months as part of an "operational excellence" thesis — the bet is that these companies have strong market positions but are poorly managed, and that installing disciplined execution practices will unlock 3-5x returns.

Apex uses Compass as their execution observatory across the entire portfolio. Every portfolio company runs weekly commitment cycles. The Apex operating partners watch the portfolio-level dashboard to answer one question: **"Are our companies executing against the transformation thesis, or are we burning cash?"**

The story plays out over **26 weeks** (half a year, Jan–June 2026), long enough to show drift, recovery, seasonal patterns, and leadership changes.

---

## Portfolio Company #1: Meridian Advanced Manufacturing

**The thesis:** Meridian makes precision components for aerospace and automotive. Apex acquired them because they have strong customer relationships but terrible operational discipline — scrap rates are high, delivery is unreliable, and the engineering team spends all its time firefighting instead of innovating. The transformation plan: consolidate ERP systems, implement quality automation, and shift engineering capacity from defensive to strategic work.

**Headcount:** ~160 people across 3 divisions
**Arc:** Starts strong, slowly drifts as the ERP migration hits problems, enters crisis around week 16, partial recovery after intervention.

### Organizational Structure

**CEO: Sarah Chen** (EXECUTIVE, L5)
Former Apex operating partner, installed 6 months before our story begins. Sharp, data-driven, trusts the observatory. She's the one who will notice the drift before anyone else.

**VP of Operations: Marcus Wright** (VP, L5)
Old-guard Meridian. Loyal, experienced, but resistant to change. His divisions will show the tension between the transformation plan and "how we've always done things."

**VP of Engineering & Innovation: Priya Sharma** (VP, L5)
Hired by Sarah to drive the technical transformation. Ambitious, strategic, but her teams keep getting pulled into production support.

---

#### Division: Production Operations (under Marcus)

**Rally Cry: "Zero-Defect Manufacturing by Q3"**

**Director: James Okafor** (DIRECTOR, L4)
Solid operator. His teams execute consistently but are entirely focused on operational and defensive work. James doesn't resist strategy — he just never has capacity for it because production emergencies consume everything.

**Manager: Elena Rodriguez** (MANAGER, L3) — THE FORCE MULTIPLIER
Elena runs the quality team. She is the best manager in the company. Her team's commitments are tightly aligned to the Zero-Defect rally cry. Reconciliation rates are 85%+. Carry-forward is rare. Her CHESS distribution is 60% Strategic, 25% Operational, 15% Capability Building. She develops her people — you can see her team members' commitment sophistication grow over the 26 weeks (more RCDO linkage, better completion horizons, less carry-forward).

Elena's team (5 employees):
- **Carlos Vega** — Star performer. Every commitment links to an outcome. Completes 90%+ on time. His estimated hours are accurate. He's the person you'd point to and say "this is what good looks like."
- **Maria Santos** — Rising contributor. Starts week 1 with simple commitments (no RCDO links, EOW horizon on everything). By week 12, she's linking to outcomes and mixing EOW/EOM horizons. Elena is developing her.
- **Ryan Park** — Steady performer. Not flashy, but reliable. 80% completion, always linked to at least a rally cry, never carries forward more than 1 item.
- **Kenji Watanabe** — New hire starting week 8. First few weeks are all Capability Building (training, onboarding). Gradually transitions to Strategic work by week 14. Visible ramp-up curve.
- **Aisha Johnson** — Good performer who becomes a firefighter. Weeks 1-10 she's aligned and executing. Then a production line crisis hits and she becomes 80% Defensive/unplanned work for weeks 11-16. Her strategic work gets displaced with `PRODUCTION_EMERGENCY` displacement notes. She recovers partially by week 20 but never fully gets back to her pre-crisis strategic allocation.

**Manager: Tom Jackson** (MANAGER, L3) — THE ABSENT MANAGER
Tom runs the assembly floor team. He barely engages with the system. His team is 95% self-directed (almost no `assigned_by` from Tom). Their CHESS distribution is whatever each individual feels like doing. No consistency across the team. Some people are strategic, some are operational, with no pattern. Carry-forward rates are moderate because people figure it out themselves, but RCDO linkage is poor — Tom never steers anyone toward the rally cries.

Tom's team (4 employees):
- **Derek Chen** — Self-starter who happens to be strategic. Links his own work to rally cries. High completion. Would thrive under any manager, succeeds despite Tom.
- **Jackie Liu** — Average performer with no direction. Commitments are generic ("Continue assembly line improvements"), rarely linked to any RCDO. Not failing, just drifting.
- **Miguel Fernandez** — Struggling. High carry-forward rate (40%+). Completion horizons are always EOW but he misses them. Not getting coaching from Tom. His trajectory is flat.
- **Lisa Park** — ANALYST scoped to Production Operations. Compiles reports, has visibility into both Elena's and Tom's teams. Her scope demonstrates the analyst access model.

---

#### Division: Supply Chain & Logistics (under Marcus)

**Rally Cry: "Supplier Consolidation — 30% Fewer Vendors by Q2"**

**Director: David Kim** (DIRECTOR, L4)
Competent but overwhelmed. He has too many direct reports and can't give any of them enough attention. His division will show what happens when span of control is too wide.

**Manager: Anna Mueller** (MANAGER, L3) — THE MICROMANAGER
Anna assigns everything. Her `assigned_by` rate is 90%+. Her team has high completion rates (because she only assigns what she knows can be done), but CHESS distribution is 70% Operational, 20% Defensive, 10% Strategic. She keeps her team "safe" by avoiding strategic risk, which means the Supplier Consolidation rally cry has almost no coverage from her team. Her defining objectives are uncovered — a visible RCDO coverage gap.

Anna's team (4 employees):
- **Robert Chang** — THE SANDBAGGED STAR. This is one of the most important narratives. Robert is Meridian's most talented supply chain analyst. He could be leading the vendor consolidation effort. Instead, Anna assigns him purchase order processing and inventory reconciliation — important but purely operational work. His execution is flawless (95%+ completion), but every commitment is `chess_category = Operational` with `assigned_by = Anna`. The observatory should make it visible that Robert is being wasted. Cost analysis makes it worse: Robert is L3 (Senior, $80/hr) doing L1 work.
- **Sarah Kim** — Average performer doing what Anna tells her. Fine.
- **Jennifer Wu** — Struggles with Anna's pace. Carry-forward rate is high, but it's because Anna assigns too much, not because Jennifer is slow. The overload is visible in commitment count (6-7 per week when everyone else does 3-4).
- **Ben Torres** — Concentration risk showcase. Anna assigns 60% of all her team's work to Ben because she trusts him. He's a single point of failure.

**Manager: Wei Zhang** (MANAGER, L3) — THE DRIFTER
Wei starts the story well-aligned. Weeks 1-8, his team's CHESS distribution matches strategy targets (55% Strategic, 25% Operational). Then the ERP migration starts causing problems with his procurement systems, and he starts redirecting his team to workarounds. By week 16, he's 20% Strategic, 50% Operational, 30% Defensive. The drift is gradual — 3-5% shift per week — which is exactly what the drift detection algorithm should catch as it crosses emerging (3 weeks), confirmed (6 weeks), and critical (12 weeks) thresholds.

Wei's team (3 employees):
- **Patricia Nguyen** — Good performer caught in Wei's drift. Her individual execution is strong but her strategic alignment degrades in lockstep with Wei's direction.
- **Alex Petrov** — Notices the drift and tries to self-correct. His commitments start splitting: he does what Wei assigns (operational) but also adds self-directed strategic commitments. His `assigned_by` commits are operational, his self-directed ones are strategic. The contrast should be visible in the data.
- **Mark Thompson** — The overcommitter. Takes on everything. 6-7 commitments per week, carries forward 2-3 every time. Completion horizon is always EOW even for multi-week work. He's enthusiastic but ineffective.

---

#### Division: Engineering & Innovation (under Priya)

**Rally Cry: "Next-Gen Quality Automation — AI Inspection Live by Q4"**

**Director: Raj Patel** (DIRECTOR, L4)
Priya's right hand. Technical visionary. His division should be the strategic engine of the company, but keeps getting pulled into production support because Production Operations can't handle their own problems. This creates a visible cross-division dependency pattern.

**Manager: Grace Lee** (MANAGER, L3) — THE STRATEGIC LEADER
Grace runs the automation R&D team. Her commitments are almost entirely Strategic and Capability Building, tightly linked to the AI Inspection rally cry all the way down to specific outcomes. Her team's estimated hours on strategic work are the highest in the company. She's doing exactly what Apex wants.

But here's the twist: starting week 10, production emergencies start pulling her team members away. The displacement records show `PRODUCTION_EMERGENCY` and the `displacing_commitment` FK points to actual commitments from Tom Jackson's assembly team — Tom's team can't handle something, so Grace's people get drafted. Grace's strategic alignment drops from 75% to 45% over 6 weeks, not because she's drifting but because external displacement is eating her capacity. The observatory should distinguish between "this team chose to drift" and "this team was forced off course."

Grace's team (4 employees):
- **Daniel Park** — AI/ML specialist. His commitments are highly technical, linked to the AI Inspection outcome. When he gets displaced, his displacement notes all cluster around "pulled to production floor for vision system troubleshooting" — he's being used as a firefighter for his specialty instead of building the strategic capability.
- **Rachel Torres** — The quiet achiever. 3 commitments per week max, but 95% completion. Everything lands. Her estimated hours are always accurate. She doesn't overcommit.
- **Kevin Wright** — Mid-performer who gets better over time. Weeks 1-10 he's doing 50% Capability Building (learning the new tech stack). By week 15 he's transitioned to 70% Strategic. Growth trajectory.
- **Amy Chen** — Gets completely derailed by production support. From week 12 onward, 80% of her work is unplanned (`is_unplanned = true`) with displacement category `PRODUCTION_EMERGENCY`. She has a carry-forward chain 8 weeks long on a strategic commitment she can never get back to. This is the most extreme example of the firefighter archetype.

**Manager: Victor Solis** (MANAGER, L3) — THE PLAYER WHO GAMES THE SYSTEM
Victor looks good on paper. His reconciliation rate is 90%+. Completion is high. But something's off: his commitment titles are vague ("Continue platform work", "Ongoing system improvements"), descriptions are empty, task bullets are generic, estimated hours are always exactly 8.0 (suspiciously round), and RCDO links are to the broadest possible rally cry without drilling down to DOs or outcomes. He's technically "aligned" but providing no real visibility. This pattern should be detectable — high completion + low specificity + shallow RCDO linkage = gaming.

Victor's team (3 employees):
- **Chris Martinez** — Mirrors Victor's behavior. Vague commitments, high completion, no real substance.
- **Diana Flores** — Actually does good work but her commitments look like Victor's because that's the team culture. The observatory can't distinguish her from Chris based on structure alone — this is a limitation that's worth knowing about.
- **Sam Wilson** — New to the team, coming from Elena's team (transferred week 14). His commitment quality visibly drops after the transfer — was writing specific, outcome-linked commitments under Elena, now writes vague ones under Victor. The contrast demonstrates how manager culture propagates.

---

### Meridian — Key Temporal Events

| Week | Event | Observable Effect |
|------|-------|-------------------|
| 1-8 | Stable execution, transformation underway | Strategic alignment ~55%, healthy CHESS mix |
| 6 | Wei's team starts seeing ERP issues | Subtle drift begins in Supply Chain — operational % ticks up |
| 10 | Production line crisis (defect outbreak) | Displacement spike across Production Ops, Engineering teams start getting pulled |
| 12 | Crisis deepens, Grace's team heavily displaced | Engineering strategic alignment drops sharply, displacement notes cluster around "production emergency" |
| 14 | Sam Wilson transfers from Elena's team to Victor's | Visible commitment quality drop for Sam, Elena backfills with Kenji (now ramped) |
| 16 | ERP migration hits critical failure | Wei's drift reaches "confirmed" threshold (6 weeks), company-wide strategic alignment drops below 40% |
| 18 | Sarah Chen (CEO) intervenes based on observatory data | She sees the drift, the displacement patterns, the cost of misalignment |
| 20 | New process: production issues stay in Production Ops | Grace's displacement starts declining, Wei gets a dedicated ERP support person |
| 22-26 | Partial recovery | Strategic alignment climbs back toward 50%, but not to original 55% — permanent scars from lost momentum |

---

## Portfolio Company #2: Pinnacle Health Systems

**The thesis:** Pinnacle operates 3 regional hospitals and a network of clinics. The acquisition thesis is operational consolidation — standardize clinical workflows, centralize procurement, and reduce administrative overhead by 25%. The company is well-run but siloed; each hospital operates as its own fiefdom.

**Headcount:** ~180 people across 3 divisions (one per hospital/region)
**Arc:** The steady performer with a hidden problem. Surface metrics look good for 26 weeks. But cost-weighted analysis reveals that the most expensive people (senior physicians turned administrators, L5 cost band) are doing defensive work while the actual consolidation work falls to junior staff. "The numbers look fine until you ask who's doing the work."

### Organizational Structure

**CEO: Margaret Foster** (EXECUTIVE, L5)
Healthcare veteran. Cautious, consensus-driven. Doesn't rock the boat. Pinnacle's metrics stay "fine" under her leadership but never great — because she doesn't force the silos to break.

**VP of Clinical Operations: Dr. James Wright** (VP, L5)
Brilliant physician, reluctant administrator. Spends most of his time on defensive work (compliance, audit prep, incident response) when he should be driving clinical workflow standardization. His cost band ($160/hr) makes this expensive. This is the cost-weighted misalignment story.

**VP of Shared Services: Linda Chen** (VP, L5)
The real operator. Her shared services team does the consolidation work. She's frustrated that the hospital directors won't cooperate. Her teams show high strategic alignment but mounting displacement from "hospital directors requesting exceptions."

---

#### Division: Metro General Hospital (under Dr. Wright)

**Rally Cry: "Unified Clinical Protocols — One Standard of Care"**

**Director: Dr. Karen Mitchell** (DIRECTOR, L4)
Protects her hospital's autonomy. Nominally supports the rally cry but her teams barely contribute to it. Her RCDO coverage shows the rally cry's defining objectives getting zero commitments from Metro General. The coverage gap is the story.

**Manager: Susan Park** (MANAGER, L3) — THE FORTRESS
Susan runs nursing operations at Metro General. Her team is high-performing within their bubble — 80%+ completion, good reconciliation — but 90% Operational/Defensive. Almost zero strategic work. She actively resists the standardization effort. Displacement notes from her team reference "local protocol requirements" and "Metro General specific workflow" — defensive language that, when clustered, reveals a pattern of active resistance to consolidation.

Susan's team (5 employees):
- **Mary Johnson** — Senior nurse manager. L3 cost band doing L1-level scheduling work. Cost-weighted misalignment.
- **Thomas Brown** — Strong performer, loyal to Susan, executes whatever she assigns. All operational.
- **Linda Williams** — Quietly strategic. Self-directs a few commitments toward the clinical protocol rally cry even though Susan doesn't assign any. Her self-directed vs assigned split tells the story.
- **James Davis** — Average. Does his job, nothing more.
- **Patricia Garcia** — Overworked. High commitment count, high carry-forward. Susan piles on too much.

**Manager: Dr. Michael Torres** (MANAGER, L3) — THE EXPENSIVE FIREFIGHTER
Michael is a physician-manager. L4 cost band ($110/hr). He spends 70% of his time on defensive work — compliance reviews, incident reports, audit preparation. He should be driving clinical innovation. His cost-weighted data is alarming: $110/hr x 30 hrs/week on defensive work = the most expensive defensive worker in the portfolio.

Michael's team (3 employees):
- **Jennifer Lee** — Compliance analyst. Her work is legitimately defensive. Fine.
- **David Hernandez** — Clinical coordinator who could be strategic but follows Michael's defensive lead.
- **Karen White** — New hire, all Capability Building for the first 6 weeks. But what she's "building capability" in is compliance processes, not strategic skills.

---

#### Division: Riverside Community Hospital (under Dr. Wright)

**Rally Cry: "Unified Clinical Protocols — One Standard of Care"** (same company-wide rally cry)

**Director: Dr. Alan Brooks** (DIRECTOR, L4)
The best hospital director. Genuinely supports consolidation. His division shows what "good" looks like in healthcare — balanced CHESS distribution, solid RCDO coverage, teams contributing to the defining objectives.

**Manager: Nancy Kim** (MANAGER, L3) — THE COLLABORATIVE LEADER
Nancy runs patient services. Her team's assignment attribution is balanced (50% self-directed, 50% manager-assigned). She assigns strategic work and lets people self-direct on operational needs. Her team's carry-forward rate is the lowest in Pinnacle. She represents the "what if every manager did this?" benchmark.

Nancy's team (4 employees):
- **Brian Adams** — Star. Links everything to outcomes. High completion.
- **Emily Watson** — Consistent performer. Nothing dramatic, just reliable.
- **Jason Miller** — The person who got better after a manager change. Was under Susan Park at Metro General, transferred to Nancy at week 10. His before/after data tells a story: same person, different manager, different outcomes.
- **Rachel Green** — Part-time. Lower commitment count but 100% completion. Shows that hours ≠ effectiveness.

**Manager: Paul Chen** (MANAGER, L3) — THE MIDDLE GROUND
Average manager, average team. Exists to provide a baseline. CHESS distribution is roughly what you'd expect (40% Strategic, 35% Operational, 15% Defensive, 10% Capability Building). Completion around 70%. Some carry-forward. Nothing exceptional, nothing alarming.

Paul's team (3 employees):
- **Sandra Lopez** — Average.
- **Mike Turner** — Slightly below average. Occasional carry-forward.
- **Christine Park** — Slightly above average. Self-directs some strategic work.

---

#### Division: Shared Services (under Linda Chen)

**Rally Cry: "Centralized Procurement — $10M Savings Target"**

**Director: Angela Martinez** (DIRECTOR, L4)
Linda's best director. Her team is doing the actual consolidation work that the hospitals resist. Her displacement data tells the story: high displacement from `EXTERNAL_DEPENDENCY` and `SCOPE_CHANGE`, with displacement detail notes that cluster around "hospital director requested exception" and "Metro General refused standard template." The displacement is external — coming from the other divisions' resistance.

**Manager: Kevin O'Brien** (MANAGER, L3) — THE FRUSTRATED STRATEGIST
Kevin's team is 70% Strategic — they're trying to do the consolidation work. But their carry-forward rate is high (35%) because they keep getting blocked by the hospitals. The carry-forward isn't because they're failing; it's because their dependencies won't cooperate. Displacement notes are specific and clusterable: "waiting on Metro General formulary data," "Riverside IT integration delayed," "procurement approval stuck in Dr. Mitchell's queue."

Kevin's team (4 employees):
- **Amanda Foster** — Procurement specialist. Her carry-forward chain on "Finalize group purchasing agreement" runs 8 weeks, with displacement notes pointing to a different hospital blocking progress each time. This single chain tells the whole story of organizational resistance.
- **Tyler Brooks** — Systems integrator. High strategic alignment but constantly scope-changed. His `SCOPE_CHANGE` displacement count is the highest in the company.
- **Diana Patel** — Cost analyst. Her commitments involve the actual savings calculations. She's the one who could prove the $10M target is achievable if the hospitals cooperated. Low carry-forward because her work doesn't depend on others as much.
- **Marcus Webb** — Junior analyst. Rising contributor, learning the ropes. His growth trajectory mirrors Maria Santos at Meridian.

---

### Pinnacle — Key Temporal Events

| Week | Event | Observable Effect |
|------|-------|-------------------|
| 1-26 | Surface metrics stay "fine" the whole time | Completion ~70%, no dramatic drops |
| 1-26 | Cost-weighted view tells a different story | $160/hr VP + $110/hr physician-manager spending majority on defensive = massive hidden cost |
| 6 | Kevin's team starts getting blocked by Metro General | Carry-forward chains begin, displacement notes start clustering |
| 10 | Jason Miller transfers from Susan's team to Nancy's | Before/after performance contrast |
| 14 | Metro General has a compliance audit scare | Michael Torres' team goes 100% defensive for 3 weeks, spreading to Susan's team |
| 18 | Angela presents displacement data to Margaret (CEO) | Shows systemic pattern of hospital directors blocking consolidation |
| 20 | Margaret mandates quarterly cross-hospital reviews | Small improvement in collaboration, Kevin's carry-forward starts declining |
| 24 | Metro General's resistance begins softening | Susan's team shows first strategic commitments in months |

### Pinnacle — The Observatory Demo Moment
When you look at Pinnacle's executive health, everything looks "yellow" — not red, not green. The insight is in the drill-down: sort by cost-weighted alignment and suddenly Dr. Wright's $160/hr defensive time and Dr. Torres' $110/hr compliance work jump out. The company is spending $500K+/year in senior leadership time on work that should be delegated. That's the number that makes the PE partner sit up.

---

## Portfolio Company #3: Atlas Logistics Group

**The thesis:** Atlas handles warehousing, freight forwarding, and last-mile delivery. Apex acquired them because the logistics market is consolidating and Atlas has a strong regional footprint. The transformation plan: automate warehouse operations, build a technology platform for route optimization, and grow last-mile capacity by 40%.

**Headcount:** ~140 people across 3 divisions
**Arc:** The crisis and turnaround. Atlas is struggling badly for the first 15 weeks — legacy leadership, no strategic discipline, high displacement, carry-forward everywhere. At week 16, Apex installs a new COO. Over weeks 16-26, metrics dramatically improve — the most visible turnaround arc in the portfolio.

### Organizational Structure

**CEO: Frank Morrison** (EXECUTIVE, L5)
Original Atlas founder. Keeps the CEO title but has stepped back. Doesn't engage with Compass much — low commitment count, vague entries. He's a placeholder who represents legacy leadership that hasn't been replaced yet.

**VP of Warehouse Operations: Greg Sullivan** (VP, L5) — weeks 1-15
Old guard. Resistant to automation. His divisions show the worst strategic alignment in the portfolio. Replaced at week 16.

**VP of Warehouse Operations: Diana Chen** (VP, L5) — weeks 16-26 (NEW)
Apex installs Diana as the new VP. Former Amazon operations leader. Her arrival is the inflection point. She restructures teams, realigns to rally cries, and drives a dramatic improvement in strategic alignment. The before/after contrast in the data should be stark.

**VP of Technology & Last-Mile: Raj Kumar** (VP, L5)
The bright spot. His technology division has been strategic from the start, but he's been unable to influence warehouse operations because Greg blocked him. After Diana arrives, Raj's team finally gets traction — their displacement from "resource blocked" drops to near zero.

---

#### Division: Warehouse Operations (under Greg → Diana)

**Rally Cry: "Smart Warehouse — Full Automation by Year-End"**

**Director: Bill Harrison** (DIRECTOR, L4)
Greg's guy. Under Greg (weeks 1-15), Bill's division is 80% Operational/Defensive. Strategic alignment is the lowest in the entire portfolio. Carry-forward rates are 45%+. After Diana arrives (week 16), Bill either adapts or leaves — let's say he adapts slowly, showing a gradual improvement that never quite reaches the targets. This shows that leadership change doesn't fix everything overnight.

**Manager: Steve Cooper** (MANAGER, L3) — THE BEFORE/AFTER SHOWCASE
Steve is the manager whose transformation under Diana is most visible. Weeks 1-15: 85% Operational, no RCDO linkage, high carry-forward, team is demoralized. Weeks 16-26: Diana coaches him, his CHESS distribution shifts to 50% Strategic, RCDO linkage improves, carry-forward drops. His team's trajectory is the strongest "leadership matters" data point in the portfolio.

Steve's team (5 employees):
- **Tony Russo** — Warehouse team lead. Under old regime: all operational, high carry-forward. Under Diana: starts doing strategic automation work, completion improves. Classic turnaround employee.
- **Maria Gonzalez** — Was barely functional under Greg (50%+ carry-forward, displacement everywhere). Under Diana, stabilizes to 75% completion. Not a star, but the improvement is real.
- **Jake Williams** — THE LOW PERFORMER who doesn't turn around. Even after Diana arrives, Jake's metrics barely move. Carry-forward stays at 40%+, RCDO linkage remains poor, displacement notes shift from "production emergency" to "unclear requirements" — he's running out of excuses. This is the person the observatory identifies as a genuine performance problem, not a management problem.
- **Linda Park** — Strong performer who was hidden. Under Greg, her work was invisible (unlinked, operational). Under Diana, she links to outcomes and her true capability becomes visible. She was always good — she just had bad leadership.
- **Omar Hassan** — Hired by Diana at week 18. All Capability Building for weeks 18-22, then rapid transition to Strategic. His onboarding curve demonstrates what a well-managed new hire looks like vs. Kenji Watanabe's slower ramp at Meridian.

**Manager: Karen Turner** (MANAGER, L3) — THE RESISTOR
Karen actively fights Diana's changes. Her CHESS distribution barely shifts after the leadership change. Her team's displacement notes shift from legitimate operational reasons to defensive language: "existing process adequate," "automation not applicable to our workflow," "training not yet available." When clustered, these notes reveal active resistance. Her team's strategic alignment stays below 20% even at week 26. She's the person who will eventually need to be managed out, and the observatory data builds the case.

Karen's team (3 employees):
- **Paul Wright** — Follows Karen's lead. Resistant.
- **Nancy Martinez** — Caught between Karen and Diana. Shows split behavior: assigned work from Karen is operational, self-directed work tries to be strategic. The assignment attribution analysis reveals the tension.
- **Tom Baker** — Checked out. Lowest commitment count in the company. Everything is EOW horizon, most carries forward. The ghost.

---

#### Division: Freight & Transportation (under Greg → Diana)

**Rally Cry: "Route Optimization — 20% Fuel Cost Reduction"**

**Director: Michelle Wu** (DIRECTOR, L4)
Competent but timid under Greg. She knew what needed to be done but didn't have the cover to do it. Under Diana, she flourishes — her division shows the fastest turnaround because she was ready and waiting for the green light.

**Manager: Robert Kim** (MANAGER, L3) — THE LEADER IN WAITING
Robert's team was 40% Strategic even under Greg (the highest in warehouse ops) because Robert quietly pursued the route optimization work despite a lack of leadership support. After Diana arrives, he goes to 65% Strategic. His existing carry-forward chains on route optimization work finally resolve after week 16 because the blockers (Greg's resistance) are removed.

Robert's team (4 employees):
- **Sarah Chen** — Data analyst working on route optimization models. Her work was displaced by `MANAGER_REASSIGNED` from Greg's directives weeks 1-15. After week 16, displacement drops to zero. Dramatic contrast.
- **David Brown** — Fleet coordinator. Operational by nature of his role, but starts contributing to route optimization data collection under Diana. Shift from 100% Operational to 60% Operational / 30% Strategic.
- **Jessica Taylor** — Average performer. Steady, no drama, shows what normal looks like.
- **Andrew Kim** — Underperformer who improves under Diana but remains below average. Shows that turnaround helps everyone but doesn't make everyone a star.

---

#### Division: Technology & Last-Mile (under Raj)

**Rally Cry: "Digital Logistics Platform — Customer Portal Live by Q3"**

**Director: Sophia Patel** (DIRECTOR, L4)
Strong technical leader. Her division has been strategic from day 1 — she and Raj were always aligned. But her team's displacement data tells an interesting story: weeks 1-15, heavy `RESOURCE_BLOCKED` displacement because Greg's warehouse teams wouldn't integrate with their systems. After Diana arrives (week 16), the blockage clears and Sophia's team's velocity doubles.

**Manager: Chris Johnson** (MANAGER, L3) — TECHNICAL EXCELLENCE
Chris runs the platform development team. Highest strategic alignment of any team in Atlas. His team looks like Grace Lee's team at Meridian — the technical engine. But unlike Grace, Chris doesn't get displaced by production emergencies because Raj protects his team.

Chris's team (4 employees):
- **Emily Zhang** — Senior developer. Star performer. Links to outcomes, accurate estimated hours, clean reconciliation.
- **Michael Brown** — Junior developer, classic rising contributor arc. Starts with Capability Building, transitions to Strategic.
- **Lauren Kim** — DevOps specialist. Unique CHESS distribution: 50% Capability Building (infrastructure), 40% Strategic (platform features), 10% Operational. Her "Capability Building" IS strategic in context — building the automation infrastructure.
- **Ryan Park** — QA engineer. Steady performer. His work is downstream of Emily's — when Emily's displaced, Ryan's carries forward too. Visible dependency chain.

**Manager: Andrea Lopez** (MANAGER, L3) — LAST-MILE OPERATIONS
Andrea manages the last-mile delivery expansion. Her work is a mix of Strategic (expansion planning) and Operational (daily delivery operations). She represents the healthy operational/strategic balance — not every manager should be 70% Strategic.

Andrea's team (3 employees):
- **Carlos Rodriguez** — Delivery network planner. Strategic focus.
- **Tina Chen** — Operations coordinator. Operational focus. This is fine — someone has to run the routes.
- **Mike Sullivan** — Driver trainer. Capability Building focus. He's building the workforce that will scale last-mile.

---

### Atlas — Key Temporal Events

| Week | Event | Observable Effect |
|------|-------|-------------------|
| 1-15 | Greg Sullivan's old guard leadership | Portfolio-worst strategic alignment (25%), highest carry-forward (40%+), most displacement |
| 1-15 | Raj's tech division is the bright spot | Technology division is 60% Strategic while warehouse is 15% Strategic |
| 8 | Warehouse automation pilot fails | Displacement spike: "resource blocked" across warehouse ops, Greg blames tech team |
| 12 | Apex reviews portfolio data, sees Atlas red | Sarah Chen at Meridian is yellow, Pinnacle is yellow, Atlas is deep red |
| 16 | Diana Chen installed as new VP | The inflection point. Immediate restructuring begins. |
| 17-20 | Transition chaos | Short-term metrics actually dip further as teams reorganize — realistic, not magic |
| 20-22 | New rhythm established | Steve's team starts improving, Robert's blockers clear, Sophia's velocity doubles |
| 23-26 | Recovery trajectory clear | Strategic alignment climbs from 25% to 42%, carry-forward drops from 40% to 25%, displacement normalizes |
| 26 | Karen Turner's team still red | Her resistance is now clearly visible against the backdrop of everyone else improving |

### Atlas — The Observatory Demo Moment
Pull up the portfolio view at week 26. Atlas was red, now trending toward yellow. Drill into the turnaround: Diana Chen's arrival correlates with every metric improving — except Karen Turner's team. Drill into Karen: displacement notes cluster around resistance language. This is the observatory answering "the turnaround is working, except in one team, and here's why" — the exact kind of insight a PE operating partner needs.

---

## Portfolio Company #4: Vanguard Digital Services

**The thesis:** Vanguard is a tech-enabled services company — IT managed services plus a growing SaaS platform. The PE thesis is to shift the revenue mix from low-margin services to high-margin SaaS. The transformation plan: invest in product development, standardize service delivery, and migrate enterprise clients to the platform.

**Headcount:** ~100 people across 2 divisions
**Arc:** The false positive. Vanguard's headline metrics look great for all 26 weeks — high strategic alignment, low carry-forward, strong completion rates. But deeper analysis reveals problems: concentration risk (all strategic work depends on 3 people), one rally cry is overcrowded while another is abandoned, and the "high alignment" is actually gaming — the services division learned to tag everything as "strategic" without changing what they actually do.

### Organizational Structure

**CEO: Jason Park** (EXECUTIVE, L5)
SaaS evangelist. Talks a big strategic game but doesn't scrutinize the data underneath. He sees green metrics and assumes everything is fine.

**VP of Product & Platform: Natalie Wong** (VP, L5)
Runs the SaaS platform team. Genuinely strategic, genuinely effective. But she's built a team that's too dependent on a few key people.

**VP of Managed Services: Brian Miller** (VP, L5)
Old services mentality. Teaches his division to "speak strategy" (tag things as strategic) without actually doing strategic work. His division is the gaming story.

---

#### Division: Product & Platform (under Natalie)

**Rally Cry: "Platform-First — 60% Revenue from SaaS by Year-End"**

**Director: Lisa Huang** (DIRECTOR, L4)
Strong technical leader but has a blind spot: she lets her best people accumulate too much scope.

**Manager: Peter Chen** (MANAGER, L3) — HIGH PERFORMER, HIDDEN RISK
Peter's team has the best metrics in the entire portfolio. 90% completion, 80% strategic, linked all the way to outcomes. But the concentration analysis reveals that 3 of his 5 team members do 85% of the strategic work. If any of them leave, the platform roadmap collapses. This is the concentration risk story — great metrics hiding fragility.

Peter's team (5 employees):
- **Alice Zhang** — The 10x engineer. Carries 40% of the team's strategic output. Her leaving would be catastrophic. `assigned_by = Peter` for everything because he depends on her. The observatory should flag this concentration.
- **Ryan Foster** — Second critical node. Between Alice and Ryan, they cover 70% of strategic output.
- **Michelle Davis** — Third critical node. These three form a fragile core.
- **Tom Lee** — Junior developer. All Capability Building but not ramping fast enough — he's been "learning" for 20 weeks with minimal transition to Strategic. Is Peter investing in developing him, or just using Alice/Ryan/Michelle?
- **Jennifer Park** — Similar to Tom. Junior, slow ramp. The juniors exist but aren't developing — a leadership failure masked by the seniors' output.

**Manager: Helen Wu** (MANAGER, L3) — THE OVERCROWDED OBJECTIVE
Helen's team is entirely focused on one specific defining objective under the SaaS rally cry: "Enterprise client migration." All 4 of her team members, every week, for 26 weeks. The RCDO coverage map shows this objective with 6+ people (Helen's team + some of Peter's) while other defining objectives ("API marketplace," "self-service onboarding") have zero coverage. The rally cry looks healthy at the aggregate but the distribution is critically unbalanced.

Helen's team (4 employees):
- **David Yang** — Client migration lead. Strong performer, narrow focus.
- **Sophie Kim** — Data migration specialist. Same narrow focus.
- **James Wu** — Integration engineer. Same.
- **Amy Chen** — Project coordinator. Same.
(All competent, all executing, all on the same thing. The problem isn't the people, it's the resource allocation.)

---

#### Division: Managed Services (under Brian)

**Rally Cry: "Service Excellence — NPS 80+ and 95% SLA"**
(This rally cry sounds strategic but is essentially "keep doing what we're doing" — Brian's framing trick.)

**Director: Richard Park** (DIRECTOR, L4)
Brian's lieutenant in the gaming strategy. Teaches his managers to use strategic-sounding language for operational work.

**Manager: Laura Martinez** (MANAGER, L3) — THE GAMER
Laura's team has 65% "Strategic" CHESS categorization. Looks great. But her commitments are things like "Strategically optimize ticket routing workflow" and "Execute strategic client retention initiative" — these are operational work with strategic keywords bolted on. The titles are strategic, the RCDO links exist (to the broad rally cry, rarely to specific DOs or outcomes), but the substance is operational. The observatory should surface this through the shallow RCDO linkage pattern: high rally cry coverage but low defining objective and outcome coverage.

Laura's team (4 employees):
- **Andrew Kim** — Mirrors Laura's patterns. "Strategic" tagging on operational work.
- **Michelle Torres** — Same.
- **Steve Wilson** — An actual strategic thinker trapped in Laura's team. His self-directed commitments are genuinely different from his assigned ones. His self-directed work links to specific outcomes under the SaaS rally cry (not the services rally cry). He knows where the company should be going.
- **Lisa Brown** — Average performer, plays along with the tagging game.

**Manager: Jack Thompson** (MANAGER, L3) — THE HONEST OPERATOR
Jack doesn't play Brian's game. His CHESS distribution is 80% Operational, 15% Defensive, 5% Strategic — and that's accurate. His team runs the service desk. It IS operational work. He refuses to relabel it. His metrics look "bad" compared to Laura's, but he's the honest one. The observatory should reward honesty, or at least not punish it — this is a design principle test.

Jack's team (3 employees):
- **Robert Taylor** — Service desk lead. Operational and proud of it. High completion, clean reconciliation, but 0% Strategic and he's fine with that.
- **Karen Lee** — Tier 2 support. Same profile.
- **Daniel Kim** — New hire, ramps quickly into operational competence. Classic onboarding curve but into operational work.

---

### Vanguard — Key Temporal Events

| Week | Event | Observable Effect |
|------|-------|-------------------|
| 1-26 | Headline metrics look green | High strategic alignment (65%+), good completion, low carry-forward |
| 1-26 | Concentration risk slowly builds | Alice Zhang's share of strategic output grows from 35% to 45% as scope increases |
| 8 | Enterprise migration project scope expands | Helen's entire team + 2 from Peter's team now on same objective. Other objectives neglected. |
| 12 | Apex reviews portfolio — Vanguard looks best | But nobody drills into the concentration or RCDO distribution data |
| 16 | Alice Zhang takes 2 weeks PTO | Peter's team strategic output drops 50%. Carry-forward spikes. The fragility becomes visible. |
| 18 | Alice returns, output normalizes | But the 2-week gap should have raised an alarm. It didn't because nobody was looking at concentration risk. |
| 20 | Brian's team wins "highest strategic alignment" in company review | The gaming has been rewarded. Jack Thompson's honest team looks like the worst performer. |
| 24 | New analyst runs cross-company comparison | Notices that Brian's division has high strategic alignment but zero outcome-level coverage. Flags it. |
| 26 | End state | The observatory data is there to surface all these problems — concentration, gaming, overcrowding — but only if someone knows to look |

### Vanguard — The Observatory Demo Moment
Show the portfolio dashboard: Vanguard is green. Now drill into RCDO coverage: one defining objective has 8 people, two have zero. Drill into concentration risk: three employees carry 85% of strategic output. Drill into Brian's division: sort by RCDO depth — everything links to rally cries but almost nothing links to specific outcomes. "This company has a house of cards strategic posture." That's the insight.

---

## Cross-Portfolio Patterns

These should be visible at the Apex Capital Partners portfolio level:

1. **ERP/vendor dependency is systemic.** Displacement notes mentioning "ERP," "vendor," or "system migration" appear at Meridian (Wei's team), Pinnacle (Kevin's team), and Atlas (Sophia's team). When clustered, this surfaces as a portfolio-level insight: "ERP-related displacement is the #2 cause of strategic work loss across the portfolio."

2. **Best manager archetype is consistent.** Elena (Meridian), Nancy (Pinnacle), Robert (Atlas), Peter (Vanguard — with the concentration caveat) all share patterns: balanced assignment attribution, strong RCDO linkage, low carry-forward, team members who develop over time. The observatory could benchmark "what does a good manager's data signature look like?"

3. **Leadership change works — eventually.** Diana at Atlas shows immediate restructuring, a short-term dip, then recovery. Compare to Margaret at Pinnacle, who makes incremental changes with incremental results. The data supports the aggressive intervention model.

4. **Gaming is detectable.** Compare Brian's division at Vanguard (high strategic %, shallow RCDO depth) to Jack's division (honest operational tagging). Compare Elena's team at Meridian (specific, outcome-linked) to Victor's team (vague, rally-cry-only). The depth-of-linkage signal distinguishes real alignment from performative alignment.

5. **Cost of misalignment varies by company.** Meridian's misalignment is in engineering capacity (mid-level cost). Pinnacle's is in senior medical leadership (high cost). Atlas's was across the board (volume). Vanguard's is concentrated in 3 people (fragility). Same problem, different signatures.

---

## Data Scale Summary

| Company | People | Divisions | Managers | Weeks | Commitments (est.) |
|---------|--------|-----------|----------|-------|-------------------|
| Meridian | ~50 | 3 | 6 | 26 | ~5,200 |
| Pinnacle | ~48 | 3 | 6 | 26 | ~5,000 |
| Atlas | ~46 | 3 | 6 | 26 | ~4,800 |
| Vanguard | ~34 | 2 | 5 | 26 | ~3,500 |
| **Total** | **~178** | **11** | **23** | **26** | **~18,500** |

Plus reconciliation records, task bullets, displacement records, carry-forward chains, and audit entries.

---

## Next Step

With these narratives defined, the gap analysis asks: **can the Compass data model encode every specific moment described above?** For each event and pattern, verify that the necessary fields, relationships, and enum values exist.
