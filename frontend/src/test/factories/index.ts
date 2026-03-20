import type {
  Commitment,
  Cycle,
  RcdoTree,
  TeamMemberSummary,
  User,
} from '@/types';

let _idCounter = 1;
function uid(prefix: string): string {
  return `${prefix}-${String(_idCounter++)}`;
}

export function commitmentFactory(overrides: Partial<Commitment> = {}): Commitment {
  const id = uid('commit');
  return {
    id,
    cycleId: 'cycle-1',
    userId: 'user-1',
    userDisplayName: 'Alice Smith',
    title: `Test Commitment ${id}`,
    description: null,
    rcdoLink: {
      rallyCryId: null,
      rallyCryTitle: null,
      definingObjectiveId: null,
      definingObjectiveTitle: null,
      outcomeId: null,
      outcomeTitle: null,
    },
    chessCategoryId: null,
    chessCategoryName: null,
    completionHorizon: 'EOD',
    completionDay: null,
    completionTimeBlock: null,
    priorityRank: 1,
    bullets: [
      { id: uid('b'), body: 'First task', sortOrder: 1, isCompleted: false },
      { id: uid('b'), body: 'Second task', sortOrder: 2, isCompleted: false },
    ],
    attribution: { kind: 'SELF_DIRECTED' },
    carriedFromCommitmentId: null,
    isUnplanned: false,
    estimatedHours: null,
    reconciliationStatus: null,
    reconciliationNote: null,
    createdAt: '2026-03-16T00:00:00Z',
    updatedAt: '2026-03-16T00:00:00Z',
    ...overrides,
  };
}

export function cycleFactory(overrides: Partial<Cycle> = {}): Cycle {
  const id = uid('cycle');
  return {
    id,
    orgId: 'org-1',
    label: 'Week of Mar 16, 2026',
    state: 'DRAFT',
    startsAt: '2026-03-16T00:00:00Z',
    endsAt: '2026-03-20T23:59:59Z',
    isActive: true,
    commitmentCount: 0,
    createdAt: '2026-03-16T00:00:00Z',
    updatedAt: '2026-03-16T00:00:00Z',
    ...overrides,
  };
}

export function rcdoTreeFactory(): RcdoTree {
  return {
    rallyCries: [
      {
        id: 'rc-1',
        title: 'Accelerate Growth',
        description: null,
        sortOrder: 1,
        definingObjectives: [
          {
            id: 'do-1',
            title: 'Improve Developer Velocity',
            description: null,
            ownerUserId: 'user-1',
            ownerDisplayName: 'Alice Smith',
            sortOrder: 1,
            outcomes: [
              {
                id: 'oc-1',
                title: 'Ship CI improvements',
                description: null,
                ownerUserId: null,
                ownerDisplayName: null,
                sortOrder: 1,
              },
            ],
          },
        ],
      },
    ],
  };
}

export function teamMemberFactory(overrides: Partial<TeamMemberSummary> = {}): TeamMemberSummary {
  const id = uid('user');
  return {
    userId: id,
    displayName: `Team Member ${id}`,
    role: 'EMPLOYEE',
    totalCommitments: 3,
    cycleState: 'DRAFT',
    reconciledCount: 0,
    categoryBreakdown: { STRATEGIC: 1, OPERATIONAL: 2 },
    ...overrides,
  };
}

export function userFactory(overrides: Partial<User> = {}): User {
  const id = uid('user');
  return {
    id,
    email: `user-${id}@example.com`,
    displayName: `User ${id}`,
    role: 'EMPLOYEE',
    reportsTo: null,
    reportsToDisplayName: null,
    isActive: true,
    costBandId: null,
    costBandName: null,
    costBandTier: null,
    weeklyCapacityHours: null,
    ...overrides,
  };
}
