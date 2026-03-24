/**
 * Central definitions for all platform metrics.
 * Used by MetricInfo tooltips and the Methodology page.
 */
export const METRIC_DEFINITIONS: Record<string, { label: string; formula: string; description: string }> = {
  teamSize: {
    label: 'Team Size',
    formula: 'Count of all team members reporting to you (direct + subtree if enabled)',
    description: 'The number of people in your reporting chain. When "Include full org subtree" is checked, this includes indirect reports at all levels.',
  },
  rallyCryCoverage: {
    label: 'Rally Cry Coverage',
    formula: 'Commitments linked to any rally cry ÷ total commitments × 100',
    description: 'Measures what percentage of the team\'s commitments are linked to a strategic rally cry. Higher coverage means more work is visibly connected to organizational priorities.',
  },
  carriedForward: {
    label: 'Carried Forward',
    formula: 'Commitments with a carriedFromCommitmentId (cloned from a prior cycle)',
    description: 'The number of commitments that were not completed in a previous week and were carried into the current cycle. High carry-forward may indicate overcommitment or blockers.',
  },
  unlinkedCommitments: {
    label: 'Unlinked Commitments',
    formula: 'Commitments not linked to any rally cry or defining objective',
    description: 'Work that exists but is not connected to any strategic priority. This isn\'t inherently bad (operational work is valid), but high numbers may indicate a visibility gap.',
  },
  strategicAlignment: {
    label: 'Work Type Distribution',
    formula: 'Commitment count per CHESS category (Strategic, Operational, Defensive, Capability Building, Unlinked Work) ÷ total commitments × 100',
    description: 'Shows how commitments break down across the four CHESS categories plus unlinked work. This is a distribution metric — not rally cry coverage. Rally cry coverage is tracked separately as the % of commitments linked to any rally cry.',
  },
  completionRate: {
    label: 'Completion Rate',
    formula: 'Commitments reconciled as COMPLETED ÷ total commitments × 100',
    description: 'Of all commitments made for a cycle, what percentage were marked as fully completed during reconciliation.',
  },
  carryForwardRate: {
    label: 'Carry-Forward Rate',
    formula: 'Commitments reconciled as CARRIED_FORWARD ÷ total commitments × 100',
    description: 'Of all commitments in a cycle, what percentage were carried forward to the next week instead of being completed or dropped.',
  },
  alignmentGap: {
    label: 'Alignment Distribution',
    formula: 'Commitment count per CHESS category (Strategic, Operational, Defensive, Capability Building, Unlinked)',
    description: 'Shows how a team lead\'s group distributes their work across the four CHESS categories plus unlinked work. Helps identify if teams are over-indexed on one category.',
  },
  driftSignal: {
    label: 'Drift Signal',
    formula: 'Detected when the Strategic category share drops ≥5 percentage points week-over-week',
    description: 'An early warning that a team is shifting away from strategic work. Triggered by a significant drop in the Strategic category percentage compared to the prior week.',
  },
  headcount: {
    label: 'Headcount',
    formula: 'Count of direct reports under a team lead',
    description: 'The number of people directly reporting to a given manager or team lead.',
  },
};
