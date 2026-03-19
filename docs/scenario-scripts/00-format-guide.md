# Scenario Scripts — Format Guide

## How Conversations Become Data

Each scripted week follows this structure:

```
SCENE → CONVERSATION → COMMITMENT DATA → RECONCILIATION DATA
```

1. **Scene context** — what's happening this week in the narrative
2. **Direction conversations** — manager→employee (or team standup) that sets priorities
3. **Commitment output** — the structured data those conversations produce
4. **Reconciliation conversations** — end-of-week check-ins explaining outcomes
5. **Reconciliation output** — status, notes, displacement data

## Conversation Format

Scripts are short — 2-3 exchanges. They capture the decision point, not small talk.

```
[Elena → Carlos, Monday 1:1]
Elena: "The scrap rate on Line 3 spiked again last week. I need you to do a
       full vibration analysis on the bearing assemblies before we lose another batch."
Carlos: "I saw that. I've been watching the MES data — I think it's three specific
        assemblies. I can have the analysis done by Thursday if I can get floor access
        Wednesday morning."
Elena: "Done. I'll clear it with James. Link this to the scrap audit outcome —
       this is exactly what that outcome is measuring."
```

**Mapping logic:** This conversation produces:
- title: derives from Elena's ask ("full vibration analysis on bearing assemblies")
- RCDO: Elena explicitly says "link this to the scrap audit outcome"
- chess: Strategic (proactive quality improvement, not firefighting)
- horizon: EOW (Carlos says "by Thursday" → within the week)
- estimated_hours: ~10 (vibration analysis + floor time + report)
- assigned_by: null — Elena directed it, but Carlos already saw the problem and had a plan. This is collaborative, not top-down assignment. (assigned_by is reserved for "do this thing you wouldn't have chosen yourself")
- bullets: derive from Carlos's plan ("pull MES data", "cross-reference", "flag threshold")

## assigned_by Rules

The `assigned_by` field encodes WHO chose the work, not who discussed it:
- **null (self-directed)**: The employee chose the work, even if the manager approved it
- **manager ID**: The manager told the employee to do something the employee wouldn't have chosen
- **Collaborative direction** (like Elena/Carlos above): null — the employee was already going there

This matters because the observatory uses `assigned_by` to compute assignment attribution.
Micromanagers have 90%+ assigned. Absent managers have 5%. Good managers are 30-50%.

## Reconciliation Conversation Format

```
[Carlos → Elena, Friday check-in]
Carlos: "Bearing analysis is done. Found three assemblies on stations 7, 12, and 15
        with vibration above threshold. Replacements are on the schedule for Monday."
Elena: "Perfect. That's exactly what we needed. Mark it complete."
```

**Mapping logic:**
- status: COMPLETED
- notes: "Identified 3 assemblies on stations 7/12/15 exceeding vibration threshold, replacements scheduled"
- displacement: none
- displacing_commitment: null

## Displacement Conversation Format

When work doesn't get done, the reconciliation conversation captures WHY:

```
[Aisha → Elena, Friday check-in]
Aisha: "I couldn't get to the calibration audit. Line 4 went down Tuesday and I spent
       the rest of the week on the floor diagnosing the servo controller failure."
Elena: "I know — that was all hands. Carry the calibration audit to next week.
       What specifically pulled you off?"
Aisha: "The servo failure on the pick-and-place unit. Tom's team needed someone who
       understood the control logic."
```

**Mapping logic:**
- status: CARRIED_FORWARD
- displacement_category: PRODUCTION_EMERGENCY
- displacement_detail: "Line 4 servo controller failure on pick-and-place unit — assisted Tom's assembly team with diagnosis"
- displacing_commitment: [reference to the actual unplanned commitment Aisha created for the emergency work]
- notes: "Carried to next week — displaced by Line 4 production emergency"

## Week Types

### Pivotal Weeks (fully scripted)
Every conversation is written out. These are the narrative turning points.
- Week 1-2: Baseline establishment
- Week 6: First cracks
- Week 10: Crisis
- Week 14: Mid-story shifts
- Week 16: Leadership changes / interventions
- Week 20: Recovery begins
- Week 24-26: End state

### Rhythm Weeks (template + specifics)
Follow the established pattern with specific commitment titles and reconciliation outcomes,
but conversations are summarized rather than scripted:

```
## Week 7 — Rhythm (Elena's Team)

Context: Continuation of quality improvement push. No major disruptions.

Carlos Vega:
  direction: [continues scrap reduction work per established pattern]
  commitments: [specific titles listed]
  reconciliation: [outcomes listed]

Maria Santos:
  direction: [Elena assigns next learning milestone]
  commitments: [specific titles listed]
  reconciliation: [outcomes listed]
```

### Event Weeks (scripted conversations + ripple effects)
An event happens that affects multiple people/teams. The event gets a scene,
then we trace how it ripples through individual commitments:

```
## Week 10 — EVENT: Production Line Crisis

### The Trigger
[Scene: James Okafor's morning call with Marcus Wright]
James: "Line 3 quality reject rate hit 12% overnight. We've got a customer
       shipment due Thursday and the defect pattern doesn't match anything
       we've seen before."
Marcus: "Pull whoever you need. This is priority one."

### Ripple: Elena's Team
[Elena to her team, emergency standup]
Elena: "James needs Aisha on the floor starting today..."

### Ripple: Grace's Team
[Raj to Grace, phone call]
Raj: "I know this is terrible timing, but they need Daniel to look at the
     vision system. The defect pattern might be optical..."
```

## Conversation-to-Data Translation Checklist

For every conversation, extract:
- [ ] Who initiated the work? → assigned_by (null or manager ID)
- [ ] What specifically are they doing? → title, description
- [ ] What strategic objective does it serve? → rally_cry, defining_objective, outcome
- [ ] What type of work is it? → chess_category
- [ ] When will it be done? → completion_horizon
- [ ] How much effort? → estimated_hours
- [ ] What are the concrete steps? → task bullets (2-5)
- [ ] What happened at end of week? → reconciliation status
- [ ] If not completed, why? → displacement_category, displacement_detail, notes
- [ ] Was something else the cause? → displacing_commitment reference
- [ ] Does it carry forward? → carried_from_id in next week's commitment
