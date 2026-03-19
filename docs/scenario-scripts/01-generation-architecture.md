# Scenario Generation Architecture

## The Problem

178 people × 26 weeks = ~4,600 person-weeks of content. Each person-week includes
direction conversations, 3-5 commitments with full structured data, reconciliation
conversations, and reconciliation records. The content must be:

- **Locally authentic:** each entry sounds like that specific person
- **Temporally coherent:** week 14 reflects what happened in weeks 1-13
- **Cross-team consistent:** one team's crisis shows up as another team's displacement
- **Narratively meaningful:** the aggregate data tells the stories we designed
- **Strategy-coherent:** each person's work reflects their understanding of the
  strategic priorities, as filtered through the leadership chain above them

## Core Principles

### Rounds, Not Batches
A single week is generated in **rounds** because teams affect each other. You can't
generate Carlos's reconciliation until you know whether the production crisis pulled
Aisha away. You can't generate Grace's displacement until Tom's team has established
what emergency they need help with.

### Strategy Cascades Down, Reality Cascades Up
Every week, strategic priorities flow downward through the org chart:
```
Executive (sets direction)
  → VP (interprets for their divisions)
    → Director (translates to operational priorities)
      → Manager (converts to team-level work)
        → IC (executes, interprets through their own lens)
```
And outcomes flow back up: reconciliation data surfaces what actually happened,
which informs next week's direction from leadership.

The **fidelity of the cascade** varies by manager quality:
- Elena: faithful translation. Carlos hears strategy clearly.
- Tom: message gets lost. His team barely knows the rally cries.
- Anna: message gets reframed. "Strategic" becomes "safe operational."
- Victor: message gets hollowed out. Words are right, substance is gone.

### One Company at a Time
We build and run one company fully (26 weeks) before starting the next.
This keeps context manageable and lets earlier companies inform later ones.

**Order:** Meridian (most complex) → Atlas (turnaround) → Pinnacle (subtle) → Vanguard (false positive)

---

## Persona Files: The Central Artifact

Each person has one file that serves as both character bible and running record.

```
docs/scenario-scripts/personas/
  meridian/
    sarah-chen-ceo.md
    marcus-wright-vp.md
    ...
    carlos-vega.md
    maria-santos.md
    ...
  atlas/
    ...
```

### Persona File Sections

```markdown
# [Name]

## Identity
Table: role, division, manager, director, company, cost band, capacity, archetype

## Personality (static)
2-3 paragraphs: temperament, speech patterns, motivations, competence

## Commitment Signature (static)
Volume, CHESS mix, RCDO depth, title style, bullet style, hour accuracy, completion rate

## Metrics Arc (static)
Table: week ranges → target metrics (commitments, strategic %, completion %, carry-forward)

## Chain of Command & Relationships (static)

### Upward
How this person receives direction from their manager. What gets passed along,
what gets filtered, what gets distorted. The quality of the communication channel.

### Lateral
Peer relationships that affect work (collaboration, mentoring, tension).

### Downward (managers/directors/VPs/execs only)
How this person passes strategy to their reports. What they emphasize,
what they omit, what they reframe.

## Strategic Understanding (static baseline + updated at pivotal weeks)

### How [Name] Understands the Strategy
What do they think the company is trying to accomplish? How accurately does
this reflect the actual rally cries and objectives? Where are the gaps or
distortions in their understanding?

### The Telephone Chain
How strategy reaches this person, hop by hop. Where does signal get
amplified, dampened, or distorted?

### What [Name] Would Say If Asked
A 2-3 sentence quote in their voice answering: "What are we trying to
accomplish and how does your work fit?"

### How Understanding Evolves
Key moments where their strategic understanding shifts — new information,
disillusionment, clarity, confusion.

## Weekly 15-5 Log (living — appended each round)

### Week N (date)

**Strategic context this week:** What's the message from above? How does this
person interpret it? Has anything shifted from last week?

**Direction received:** What their manager told them / what they decided on
their own. 1-3 sentences.

**Direction given (managers only):** What they told their reports. How did they
translate the message they received?

**Commitments:**
1. "Title" — CHESS — STATUS
   → Outcome note
2. ...

**End-of-week status:** 2-3 sentences. What happened, how they feel about it.

**Open threads:** Bullets of work carrying into next week.
```

### Why "Strategic Understanding" Matters

This is the telephone game made visible. Compare:

**Carlos Vega's understanding (through Elena, a faithful translator):**
> "We're trying to get to zero-defect manufacturing by Q3. For my piece, that
> means eliminating root causes of scrap on Line 3. It's part of the Apex
> thesis about operational excellence."

**Miguel Fernandez's understanding (through Tom, an absent manager):**
> "I think we're supposed to be reducing defects? There's some rally cry
> about it. I just keep doing my assembly work."

**Robert Chang's understanding (through Anna, a reframer):**
> "The strategic priority is supplier consolidation, but Anna says we need
> to 'build the foundation' first, which means processing POs and doing
> inventory counts. I know there's more to it than that."

The same rally cry, three different levels of understanding, driven entirely
by the management chain. The observatory surfaces this through RCDO linkage
depth: Carlos links to outcomes, Miguel links to nothing, Robert links to
the rally cry but not the specific objectives he could be working on.

---

## Generation Rounds (Per Week, Per Company)

### Round 0: Event Check + Strategic Pulse
**Input:** Company arc timeline, division arc timelines
**Output:** This week's events, scope of impact, and the strategic message
flowing from the top

Every week has a strategic message, even if it's "stay the course." At pivotal
weeks, the message is explicit and scripted. At rhythm weeks, it's implicit:

```
Week 3 (rhythm):
  Strategic pulse: "No change from Sarah. Steady execution against rally cries."
  Events: None.
  Division effects: None.

Week 10 (pivotal):
  Strategic pulse: "Sarah acknowledges crisis but reaffirms: 'We fix the floor
  AND keep strategic work alive. Don't abandon the thesis for firefighting.'"
  Events: Production line crisis — Line 3 reject rate 12%.
  Division effects:
    - Production Ops: primary impact, all hands
    - Engineering: secondary, Daniel Park + possibly Amy Chen pulled
    - Supply Chain: no direct impact
```

### Round 1: Leadership Cascade
**Input:** Strategic pulse from Round 0, exec/VP/director personas + history
**Output:** Leadership conversations and their downstream interpretation

This round generates the **message at each level** of the hierarchy.
Not just pivotal weeks — every week, each leader has a posture:

**Pivotal weeks:** Full scripted conversations.
**Rhythm weeks:** A 1-2 sentence summary of each leader's message to their reports.

```
Week 3 (rhythm):
  Sarah → Marcus: [no direct conversation — standing direction holds]
  Sarah → Priya: [no direct conversation — standing direction holds]
  Marcus → James: "Keep pushing on the zero-defect work. Numbers look good."
  Marcus → David: "How's the vendor consolidation tracking?"
  Priya → Raj: "Engineering sprint goals unchanged. Stay on the automation roadmap."
```

```
Week 10 (pivotal):
  [Sarah → Marcus, emergency call]
  Sarah: "What happened on Line 3?"
  Marcus: "Reject rate hit 12%. Unknown root cause. Customer shipment at risk."
  Sarah: "Handle it. But Marcus — I don't want to see every team pulled into this.
         Fix the floor, don't sacrifice the quarter."
  Marcus: (interprets this as "pull whoever I need" — Sarah said don't sacrifice
          the quarter, Marcus hears "the floor comes first")

  [Marcus → James]
  Marcus: "All hands on Line 3. Pull from engineering if you need to."
  (Note: Marcus has already filtered Sarah's nuance — she said "don't sacrifice
  the quarter," he said "pull from engineering." The telephone game begins.)

  [Marcus → Priya]
  Marcus: "I need Daniel Park from Grace's team. Maybe more."
  Priya: "Sarah specifically said don't sacrifice strategic work."
  Marcus: "The customer shipment is Thursday. We don't have a choice."
  (Priya pushes back but loses. This is the cross-division tension.)
```

**Key:** The Round 1 output includes not just the conversations but a
**"message received" annotation** for each leader — what they now believe
this week's priority is, which may differ from what was said.

### Round 2: Manager Direction
**Input:** Leadership messages from Round 1, manager personas + history,
          team member personas (for awareness of team state)
**Output:** Manager → team direction (conversations or summaries)

Each manager translates the message they received through their personality:

- **Elena** (heard from James: "keep pushing quality work, crisis is contained"):
  Gives her team specific, RCDO-linked direction. "Carlos, continue the material
  investigation. Maria, I want you to try running the SPC analysis independently
  this week." She also shares strategic context: "Leadership is happy with our
  trajectory. The scrap audit outcome is getting visibility at the VP level."

- **Tom** (heard from James: same message):
  Sends a Slack message: "Hey team, same as last week. Let me know if you need
  anything." No RCDO context. No strategic framing. His team gets no signal.

- **Anna** (heard from David: "how's vendor consolidation tracking?"):
  Interprets this as pressure. Assigns her team more operational work to show
  "progress" on metrics. Tells Robert: "I need you to process the Q1 PO backlog
  before we can think about vendor consolidation." She reframes strategic
  inaction as operational necessity.

**For managers, Round 2 also generates their own commitments.** Managers have
their own 15-5 entries too — they're not just directing others.

**Parallelism:** All managers within a division can generate in parallel (they
share the same director message). Cross-division managers can also parallelize.

### Round 3: Individual Commitments
**Input:** Manager direction from Round 2, employee personas + history,
          metrics targets for this week
**Output:** Full commitment data for every person (managers + employees)

Each person's commitments are generated from:
1. **Their manager's direction** — what were they told to do?
2. **Their personality** — how do they interpret that direction?
3. **Their strategic understanding** — how do they frame their work?
4. **Their metrics targets** — what should the CHESS/completion shape be?
5. **Their open threads** — what carries from last week?

The **strategic understanding** drives RCDO linkage depth:
- Carlos (clear understanding) → links to specific outcomes
- Maria (developing understanding) → links to DOs, occasionally outcomes
- Miguel (poor understanding) → links to rally cry vaguely, or nothing
- Robert (accurate understanding, wrong work) → could link deeply but
  Anna's assignments don't map to strategic objectives

**Parallelism:** All teams within a company generate in parallel.

### Round 4: Reconciliation
**Input:** All commitments from Round 3, company events, cross-team effects,
          employee personas + history
**Output:** Reconciliation conversations + structured reconciliation data

This round determines **what actually happened** and generates the end-of-week
data. Cross-team effects materialize here:

1. **Determine outcomes** — based on events + competence + metrics targets
2. **Identify cross-team displacement** — who got pulled and by what
3. **Generate reconciliation conversations** — by team
4. **Generate structured data** — status, notes, displacement, carry-forward

**Parallelism:** Requires coordination within a company for cross-team effects.

### Round 5: Update Persona Files
**Input:** All outputs from Rounds 1-4
**Output:** Updated persona files with this week's log entry appended

Each persona file gets a new weekly log entry with:
- **Strategic context this week** — what's the current message from above?
  Has this person's understanding shifted?
- **Direction received** (ICs) / **Direction given** (managers)
- **Commitments with outcomes**
- **End-of-week status**
- **Open threads**

For managers and above, also update:
- **Direction given** — what they told their reports
- **Strategic interpretation** — how they translated the message

**When strategic understanding shifts** (pivotal weeks, leadership changes,
crisis moments), also update the **Strategic Understanding** section in the
static part of the persona file — or add an annotation in the log noting
the shift.

---

## The Strategy Cascade in Practice

Here's how one strategic message flows through Meridian in a rhythm week:

```
Sarah (CEO):
  Sends: "Q1 target is 3% scrap rate. We're at 3.8%. Push harder."

Marcus (VP Ops):
  Receives: Sarah's target
  Interprets: "We need to show progress on the numbers"
  Sends to James: "Scrap rate needs to come down. Are your teams on it?"
  Sends to David: "Make sure supply chain quality isn't contributing to scrap"

Priya (VP Engineering):
  Receives: Sarah's target
  Interprets: "The automation work needs to show measurable quality impact"
  Sends to Raj: "Can we accelerate the AI inspection timeline? Sarah needs results."

James (Director, Prod Ops):
  Receives: Marcus's message
  Interprets: "More pressure on defect reduction"
  Sends to Elena: "Sarah wants scrap below 3%. Where are we on the Line 3 fixes?"
  Sends to Tom: "Make sure your assembly teams are following the quality standards"

Elena (Manager):
  Receives: James's message
  Interprets: "Confirm we're on track, communicate the target to the team"
  Sends to team: "Sarah's watching the scrap rate — our target is 3% by end of Q1.
  Carlos, your bearing fix is key. Maria, the inspection improvements matter here too.
  Keep linking your work to the scrap audit outcome — that's what's getting visibility."

Tom (Manager):
  Receives: James's message
  Interprets: "James mentioned quality again. Whatever."
  Sends to team: (nothing specific — mentions it in passing at standup)

David (Director, Supply Chain):
  Receives: Marcus's message about supply chain quality
  Interprets: "We need to show we're contributing to quality, not causing it"
  Sends to Anna: "Make sure incoming material inspections are current"
  Sends to Wei: "Any vendor quality issues I should know about?"

Anna (Manager):
  Receives: David's message
  Interprets: "More inspection work. Assign it to Robert — he's good at that."
  Sends to Robert: "I need you to do an extra inspection pass on the aluminum
  extrusion lots this week. Top priority."
  (Robert could be doing strategic vendor consolidation work. Instead, more inspections.)
```

**What the observatory sees:**
- Elena's team: commitments linked to "Reduce Scrap Rate" → "Line 3 scrap audit."
  CHESS: Strategic. The message arrived intact.
- Tom's team: commitments vaguely tagged. Some mention quality, most don't link
  to anything. CHESS: mixed/Operational. The message got lost.
- Anna's team: Robert has a new operational commitment for material inspection.
  It's linked to "Reduce Scrap Rate" at the rally cry level (Anna's not stupid,
  she knows to tag it) but NOT to a specific objective or outcome. CHESS: Operational.
  The message was reframed.

---

## Persona Template for Strategy Cascade

### For Executives / VPs

```markdown
## Strategic Understanding

### Strategic Posture
What is this leader's overall approach to the transformation? What do they
emphasize, what do they downplay?

### How They Communicate Down
Style of direction: frequency, specificity, framing. Do they share context
(the "why") or just directives (the "what")? Do they adapt their message
per recipient?

### Message Fidelity
When they receive direction from above, how faithfully do they pass it along?
What gets amplified? What gets filtered? What gets distorted?
```

### For Directors

```markdown
## Strategic Understanding

### How [Name] Receives Strategy
What does their VP actually tell them? How complete is the picture?

### How [Name] Translates for Managers
Do they add context or just relay? Do they tailor the message per manager
(knowing Elena needs less steering than Tom)?

### Understanding Accuracy
On a scale from "fully aligned with CEO's intent" to "operating on a
different interpretation entirely" — where is this person?
```

### For Managers

```markdown
## Strategic Understanding

### How [Name] Receives Strategy
What does their director tell them? What context do they get vs. miss?

### How [Name] Translates for Their Team
The most critical hop in the chain. This is where strategy either reaches
the people doing the work, or doesn't.
- What strategic context do they share?
- Do they connect individual work to rally cries / objectives / outcomes?
- Do they explain WHY or just assign WHAT?

### What Gets Lost
Specifically: what parts of the strategic message does this manager fail
to pass along, and why?
- Elena: nothing gets lost. She adds context.
- Tom: most of it gets lost. He doesn't translate at all.
- Anna: the message gets reframed into operational safety.
- Victor: the words get passed along but the substance is hollowed out.
```

### For Individual Contributors

```markdown
## Strategic Understanding

### How [Name] Understands the Strategy
What do they think the company is trying to accomplish? How accurately does
this reflect the actual rally cries?

### The Telephone Chain
How strategy reaches this person. Where does signal degrade?

### What [Name] Would Say If Asked
2-3 sentence quote: "What are we trying to accomplish and how does your work fit?"

### How Understanding Evolves
Key moments where understanding shifts.
```

---

## What Gets Pre-Written vs. Generated

### Pre-Written (by us, before generation begins)

| Artifact | Count | Size | Purpose |
|----------|-------|------|---------|
| Portfolio arc | 1 | 1 page | Portfolio-level timeline |
| Company arcs | 4 | 2 pages each | Timelines, events, strategic pulse per week |
| Division arcs | 11 | 1 page each | Division events, cross-team patterns |
| RCDO definitions | 4 | 1 page each | Rally cries, DOs, outcomes per company |
| Persona static sections | ~178 | 0.5-1 page each | Personality, strategy understanding, cascade behavior |
| Pivotal week scripts | ~35 | 2-3 pages each | Full conversations at turning points |

**Total pre-written:** ~250 pages of structured content

### Generated (by agents, round by round)

| Artifact | Count | Purpose |
|----------|-------|---------|
| Leadership cascade summaries | ~26 per company | Strategic pulse per week |
| Manager direction | ~550 manager-weeks | Team-level conversations/summaries |
| Commitment data | ~18,500 entries | Structured YAML for seed generator |
| Reconciliation data | ~16,000 entries | Structured YAML for seed generator |
| Persona log updates | ~4,600 entries | Running 15-5 history |

---

## Practical Workflow — One Company at a Time

### Phase 1: Meridian Scaffold
1. Write Meridian company arc (timeline, events, strategic pulse by week)
2. Write 3 division arcs
3. Write RCDO definitions (rally cries, DOs, outcomes)
4. Write ~50 persona static sections (agents draft, we refine)
5. Identify ~10 pivotal weeks, fully script them

### Phase 2: Meridian Generation
Run the 26-week generation loop:
- Week 1: Rounds 0-5 → all persona files updated
- Week 2: Rounds 0-5 → all persona files updated
- ...
- Week 26: Rounds 0-5 → complete

Spot-check output at each pivotal week. Full review at end.

### Phase 3: Meridian Extraction
Walk through all persona files, extract structured YAML for seed generator.

### Phase 4: Repeat for Atlas, Pinnacle, Vanguard

---

## Context Budget Per Agent Call (Updated)

| Input | Size (est.) |
|-------|------------|
| Company arc (relevant week) | ~200 words |
| Division arc (relevant week) | ~150 words |
| Strategic pulse + events | ~200 words |
| Leadership cascade for this week | ~300 words |
| Manager persona (static + strategic understanding) | ~500 words |
| Manager's 15-5 log (up to 25 weeks) | ~2,500 words max |
| Team member personas (static, 3-5 people) | ~2,500 words |
| Team member 15-5 logs (up to 25 weeks) | ~10,000 words max |
| This week's commitments (from Round 3) | ~1,500 words |
| Cross-team displacement context | ~500 words |
| **Total** | **~18,000 words max** |

Still well within Sonnet context at week 26. The strategic understanding
sections add ~200 words per persona but replace the need for agents to
infer strategic context — net efficiency gain.
