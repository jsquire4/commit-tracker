# Simulation Harness Architecture

## What It Is

A standalone TypeScript CLI app (`st6-sim/`) that orchestrates the scenario
generation. It reads the pre-written scaffolding, dispatches Haiku agents
in parallel rounds, validates their output, updates persona files, and
produces database-ready JSON.

It is NOT:
- Part of the Spring Boot backend
- A Claude Code skill or agent
- A one-shot script — it's designed for repeated runs

## Directory Structure

```
st6-sim/
  package.json
  tsconfig.json
  src/
    index.ts                 # CLI entry point
    orchestrator.ts          # Main simulation loop
    rounds/
      round0-events.ts       # Event lookup (no agent, just file read)
      round1-leadership.ts   # Leadership cascade generation
      round2-direction.ts    # Manager direction generation
      round3-commitments.ts  # Individual commitment generation
      round4-reconciliation.ts # Reconciliation generation
      round5-update.ts       # Persona file update (no agent, just file write)
    agents/
      haiku-client.ts        # Anthropic SDK wrapper with retry, rate limiting
      prompt-builder.ts      # Assembles context for each agent call
      response-parser.ts     # Parses + validates agent JSON output
    schema/
      commitment.schema.json # JSON Schema for commitment output
      reconciliation.schema.json
      direction.schema.json
      leadership.schema.json
    validation/
      metrics-checker.ts     # Validates output against persona metrics targets
      rcdo-checker.ts        # Validates RCDO links against definitions
      continuity-checker.ts  # Validates carry-forwards, open threads
    state/
      persona-manager.ts     # Read/write/append persona files
      week-state.ts          # Track which weeks are generated for each company
    output/
      seed-extractor.ts      # Walk persona files → seed-ready JSON
      sql-generator.ts       # Optional: generate INSERT statements directly
  scaffolding/               # Symlink to docs/scenario-scripts/
```

## How It Runs

```bash
# Full simulation — one company
npm run simulate -- --company meridian

# Full simulation — all companies sequentially
npm run simulate -- --all

# Re-run a specific week (clears and regenerates)
npm run simulate -- --company meridian --week 14

# Re-run weeks 10-16 (crisis arc)
npm run simulate -- --company meridian --weeks 10-16

# Validate existing output without regenerating
npm run validate -- --company meridian

# Extract seed data from completed simulation
npm run extract -- --company meridian --format json
npm run extract -- --all --format sql

# Dry run — show what would be generated without calling API
npm run simulate -- --company meridian --dry-run

# Cost estimate for a run
npm run simulate -- --company meridian --estimate
```

## The Simulation Loop

```
for each week (1-26):
  Round 0: Load events + strategic pulse (file read, no agent)
      ↓
  Round 1: Leadership cascade (1-5 Haiku calls, sequential within chain)
      ↓ outputs: leadership messages per director
      ↓
  Round 2: Manager direction (N managers in parallel, up to 20 concurrent)
      ↓ outputs: direction summaries + manager's own commitments
      ↓
  Round 3: Individual commitments (N teams in parallel, up to 20 concurrent)
      ↓ outputs: structured commitment JSON per person
      ↓
  ── Validation gate: check metrics targets, RCDO validity ──
      ↓
  Round 4: Reconciliation (coordinated — cross-team effects first, then parallel)
      ↓ outputs: reconciliation JSON per person
      ↓
  ── Validation gate: check status distribution, displacement consistency ──
      ↓
  Round 5: Update persona files (file writes, no agent)
      ↓
  advance to next week
```

## Parallelism Model

Within each round, parallelism is controlled by a semaphore:

```typescript
const CONCURRENCY = 20; // max concurrent Haiku calls

// Round 2: all managers in parallel (up to 20)
const managerPromises = managers.map(manager =>
  semaphore.acquire().then(async () => {
    try {
      return await generateManagerDirection(manager, weekContext);
    } finally {
      semaphore.release();
    }
  })
);
const directions = await Promise.all(managerPromises);
```

**Within a week, rounds are sequential.** Round 3 can't start until Round 2
finishes (commitments depend on direction). But within a round, teams run
in parallel up to the concurrency limit.

**Across weeks, strictly sequential.** Week 2 can't start until Week 1 is
fully complete, because Week 2's persona files need Week 1's history.

**Across companies, could parallelize** but we've decided to run one company
at a time for sanity. The harness supports it if we change our mind.

## Agent Prompt Structure

Every agent call follows the same template:

```typescript
interface AgentPrompt {
  system: string;     // Role, output format rules, constraints
  context: string;    // Assembled from scaffolding + persona history
  task: string;       // Specific instruction for this round
  outputSchema: object; // JSON Schema the response must conform to
}
```

### Example: Round 3 (Commitment Generation)

```
SYSTEM:
You are generating weekly commitments for a character in a workplace
simulation. You must output valid JSON matching the provided schema.
Every commitment must be consistent with the character's personality,
their manager's direction this week, and their metrics targets.

CONTEXT:
[Company arc — week 7 section]
[Division arc — week 7 section]
[Strategic pulse: "Sarah reaffirms Q1 scrap target of 3%"]
[Manager direction this week: Elena's message to team]

CHARACTER: Carlos Vega
[Full static persona: personality, speech, commitment signature,
 strategic understanding, chain of command]

HISTORY (weeks 1-6):
[Carlos's 15-5 log entries for weeks 1-6]

METRICS TARGETS (week 7):
- Commitments: 3-4
- Strategic %: 60-70%
- CHESS: ~65% Strategic, ~20% Operational, ~15% Cap Building
- Completion likelihood: 95% (will be determined in Round 4)
- Carry-forwards from week 6: none

OPEN THREADS FROM WEEK 6:
- Consolidated Metals supplier audit follow-up
- Maria's SPC training progression

TASK:
Generate Carlos's commitments for Week 7. Return JSON matching the schema.
Each commitment must:
- Have a title that sounds like Carlos (specific, technical, data-driven)
- Link to RCDO entities from the provided definitions where applicable
- Include 2-5 task bullets that are concrete action steps
- Have an estimated_hours value that reflects Carlos's accuracy (within 15%)
- Tag as self-directed (assigned_by: null) or manager-assigned based on
  whether Elena directed it or Carlos chose it

OUTPUT SCHEMA:
{
  "commitments": [
    {
      "title": "string",
      "description": "string | null",
      "rally_cry": "string | null (must match defined rally cry title)",
      "defining_objective": "string | null (must match defined DO title)",
      "outcome": "string | null (must match defined outcome title)",
      "chess_category": "Strategic | Operational | Defensive | Capability Building",
      "completion_horizon": "MORNING | MIDDAY | AFTERNOON | EOD | EOW",
      "estimated_hours": "number",
      "assigned_by": "string | null (manager name if assigned)",
      "is_unplanned": "boolean",
      "bullets": ["string"]
    }
  ]
}
```

### Example: Round 4 (Reconciliation)

```
SYSTEM:
You are generating end-of-week reconciliation data for a team in a
workplace simulation. For each commitment, determine what happened
and output structured JSON. Be consistent with the character's
competence level, the week's events, and the metrics targets.

CONTEXT:
[Week events, cross-team displacement effects]

TEAM: Elena Rodriguez's quality team
[Elena's persona + this week's direction]
[All team member personas + this week's commitments]

CROSS-TEAM EFFECTS THIS WEEK:
- No displacement events affecting this team in week 7

METRICS TARGETS:
- Carlos: 95% completion, 0 carry-forward
- Maria: 75% completion (she's still learning), 0-1 carry-forward
- Ryan: 85% completion, 0-1 carry-forward
- Aisha: 90% completion, 0 carry-forward

TASK:
For each person's commitments this week, determine:
1. Status (COMPLETED, PARTIALLY_COMPLETED, NOT_STARTED, CARRIED_FORWARD)
2. Reconciliation notes (in the character's voice — what they'd actually say)
3. Displacement data if applicable
4. A 2-3 line reconciliation conversation between the employee and Elena

Ensure the overall completion rate per person roughly matches their
metrics targets. Displacement must reference valid displacement categories.

OUTPUT SCHEMA:
{
  "team_reconciliation": [
    {
      "person": "string",
      "reconciliation_conversation": "string (2-3 exchange dialogue)",
      "commitments": [
        {
          "title": "string (must match commitment from Round 3)",
          "status": "COMPLETED | PARTIALLY_COMPLETED | NOT_STARTED | CARRIED_FORWARD",
          "notes": "string",
          "displacement_category": "string | null",
          "displacement_detail": "string | null",
          "displacing_commitment_title": "string | null",
          "carries_forward": "boolean"
        }
      ]
    }
  ]
}
```

## Validation Gates

After Rounds 3 and 4, the harness validates output before proceeding:

### Post-Round 3 Validation (Commitments)

```typescript
interface CommitmentValidation {
  // Hard failures (retry the agent call)
  schemaValid: boolean;          // JSON matches schema
  commitmentCount: boolean;      // Within persona's target range
  rcdoLinksValid: boolean;       // All referenced entities exist in RCDO definitions
  chessValid: boolean;           // Valid CHESS category names

  // Soft warnings (log but proceed)
  chessMixClose: boolean;        // Within 15% of target distribution
  hoursReasonable: boolean;      // estimated_hours between 1-20
  titleStyleMatch: boolean;      // Rough check: length, specificity level
  carryForwardsContinued: boolean; // Open threads from last week are addressed
}
```

### Post-Round 4 Validation (Reconciliation)

```typescript
interface ReconciliationValidation {
  // Hard failures
  schemaValid: boolean;
  allCommitmentsReconciled: boolean;  // Every commitment has a status
  statusesValid: boolean;             // Valid ReconciliationStatus values
  displacementValid: boolean;         // Category matches enum

  // Soft warnings
  completionRateClose: boolean;       // Within 15% of persona target
  carryForwardReasonable: boolean;    // Not exceeding target range
  notesNotEmpty: boolean;             // Completed items should have notes
  displacementDetailPresent: boolean; // If displaced, detail shouldn't be empty
}
```

**On hard failure:** Retry the agent call (up to 3 times) with the validation
error included in the prompt ("Your previous output had this issue: ...").

**On soft warning:** Log it. If warnings accumulate (>30% of calls for a
persona have warnings), flag for human review.

## State Management

### What's on Disk

```
st6-sim/
  state/
    meridian/
      simulation.json          # Which weeks are complete, run metadata
      week-outputs/
        week-01/
          round1-leadership.json
          round2-direction.json
          round3-commitments.json
          round4-reconciliation.json
        week-02/
          ...
      seed-data/
        commitments.json       # Extracted, database-ready
        reconciliations.json
        users.json
        ...
```

### Incremental / Partial Re-runs

The harness tracks state per week:

```json
// simulation.json
{
  "company": "meridian",
  "startedAt": "2026-03-18T...",
  "weeks": {
    "1": { "status": "complete", "completedAt": "...", "tokensUsed": 45000 },
    "2": { "status": "complete", "completedAt": "...", "tokensUsed": 48000 },
    "3": { "status": "in_progress", "currentRound": 3 },
    "4": { "status": "pending" }
  },
  "totalTokensUsed": 93000,
  "estimatedCost": "$0.87"
}
```

**Re-running a week:**
1. Clear that week's round outputs from `week-outputs/`
2. Remove that week's log entries from all affected persona files
3. Re-generate from Round 0
4. Cascade: if week 14 is re-run, weeks 15-26 must also be re-run
   (their persona history changed). The harness warns about this.

**Re-running a single round within a week:**
Possible if later rounds haven't run yet. E.g., re-run Round 3 for
week 7 if Round 4 hasn't started yet.

## Output: Database-Ready JSON

The extraction step walks all persona files and round outputs to produce
files that map directly to the database schema:

```json
// seed-data/commitments.json
[
  {
    "person_ref": "carlos-vega",
    "week": 1,
    "title": "Conduct root cause analysis on Line 3 scrap rate increase",
    "description": null,
    "rally_cry_ref": "zero-defect-manufacturing",
    "defining_objective_ref": "reduce-scrap-rate",
    "outcome_ref": "line-3-scrap-audit",
    "chess_category": "Strategic",
    "completion_horizon": "EOW",
    "estimated_hours": 14,
    "assigned_by_ref": null,
    "is_unplanned": false,
    "priority_rank": 1,
    "bullets": [
      "Pull vibration data from MES for bearing assemblies (stations 1-20)",
      "Analyze material lot traceability for December high-reject runs",
      "Take floor vibration readings on Wednesday (Line 3 bearing stations)",
      "Draft preliminary root cause report with findings"
    ]
  }
]
```

```json
// seed-data/reconciliations.json
[
  {
    "commitment_ref": "carlos-vega/week-01/conduct-root-cause-analysis",
    "status": "COMPLETED",
    "notes": "Identified bearing assemblies on stations 7/12/15...",
    "displacement_category": null,
    "displacement_detail": null,
    "displacing_commitment_ref": null
  }
]
```

These use **string references** (person names, rally cry slugs) rather than
UUIDs. The seed generator (the Kotlin app that loads data into Postgres)
resolves references to actual UUIDs at insertion time.

## The Seed Generator (Separate from the Harness)

The harness produces JSON. A separate **Kotlin module** in the backend
reads that JSON and inserts it into Postgres:

```
st6-sim/              → produces seed-data/*.json
backend/seed-loader/  → reads JSON, inserts via JPA entities
```

The seed loader:
1. Creates portfolio, orgs, cost bands, users (from personas + identity data)
2. Creates RCDO hierarchy (from definitions files)
3. Creates cycles (26 weeks per org)
4. Creates commitments (from commitments.json, resolving refs to UUIDs)
5. Creates reconciliation records (from reconciliations.json)
6. Creates task bullets (from commitment bullet arrays)
7. Creates observatory config per org

This separation means:
- The harness is pure content generation (TypeScript + Haiku)
- The seed loader is pure database insertion (Kotlin + JPA)
- They communicate through a well-defined JSON interface

## Cost Model

### Per Agent Call (Haiku)
| Metric | Value |
|--------|-------|
| Avg input tokens | ~6,000 (early weeks) to ~15,000 (late weeks) |
| Avg output tokens | ~1,500 |
| Input cost | $0.25 / MTok |
| Output cost | $1.25 / MTok |
| Avg cost per call | ~$0.003 (early) to ~$0.006 (late) |

### Per Company (26 weeks)
| Round | Calls/week | Total calls | Est. cost |
|-------|-----------|-------------|-----------|
| R1: Leadership | 3-5 | ~100 | $0.40 |
| R2: Direction | 6 | 156 | $0.70 |
| R3: Commitments | 6 | 156 | $0.70 |
| R4: Reconciliation | 6 | 156 | $0.85 |
| **Total** | | **~568** | **~$2.65** |

### Full Portfolio (4 companies)
| | |
|---|---|
| Total calls | ~2,300 |
| Total cost | ~$10-12 |
| Time (20 concurrent, ~2s/call) | ~25 minutes |

**Re-running is cheap.** Regenerating one company's crisis arc (weeks 10-16)
costs ~$0.70. We can iterate freely.

## Concurrency & Rate Limiting

```typescript
const CONFIG = {
  maxConcurrent: 20,        // Haiku rate limit allows much more, but 20 is plenty
  retryAttempts: 3,
  retryDelayMs: 1000,
  callTimeoutMs: 30000,
  rateLimit: {
    requestsPerMinute: 1000, // Haiku tier allows this
    tokensPerMinute: 400000
  }
};
```

The semaphore ensures we never exceed 20 concurrent calls. The rate limiter
handles token throughput. At 20 concurrent × ~2s latency per call, we get
~10 calls/second = ~600 calls/minute, which is within Haiku limits.

## Human Review Points

The harness pauses for optional human review at:
1. **After Week 1** — verify the baseline feels right
2. **After each pivotal week** — these are the narrative turning points
3. **After Week 26** — full review before extraction

```bash
# Run with review pauses
npm run simulate -- --company meridian --review-pivotal

# Run without pauses (trust the scaffolding)
npm run simulate -- --company meridian --no-review
```

Review mode shows a summary:
```
=== Week 10 Complete (PIVOTAL: Production Crisis) ===

Metrics Summary:
  Elena's team: 46% strategic (target: 45-50%), 77% completion (target: 75-80%)
  Tom's team: 28% strategic (target: 25-30%), 65% completion (target: 60-70%)

Displacement events: 3 (Aisha, Daniel Park, Amy Chen)
Carry-forwards created: 4
Cross-team effects: Engineering → Production (2 people displaced)

Validation: 0 hard failures, 2 soft warnings
  ⚠ Maria Santos completion at 90% (target: 70-80%) — unusually good week
  ⚠ Tom's team CHESS mix 15% Strategic (target: 25-30%) — slightly low

[Review persona files? Press Enter to continue, 'r' to re-run week 10]
```
