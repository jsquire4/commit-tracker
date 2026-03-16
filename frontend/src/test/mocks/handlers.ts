import { http, HttpResponse } from 'msw';

/** Wraps payload in the { data: ... } envelope the API client expects. */
function apiResponse<T>(payload: T, status = 200) {
  return HttpResponse.json({ data: payload }, { status });
}

const mockCycle = {
  id: 'cycle-1',
  orgId: 'org-1',
  label: 'Week of Mar 16, 2026',
  state: 'DRAFT',
  startsAt: '2026-03-16T00:00:00Z',
  endsAt: '2026-03-20T23:59:59Z',
  isActive: true,
  commitmentCount: 2,
  createdAt: '2026-03-16T00:00:00Z',
  updatedAt: '2026-03-16T00:00:00Z',
};

const mockCommitments = [
  {
    id: 'commit-1',
    cycleId: 'cycle-1',
    userId: 'user-1',
    userDisplayName: 'Alice Smith',
    title: 'Ship new auth feature',
    description: null,
    rcdoLink: {
      rallyCryId: 'rc-1',
      definingObjectiveId: 'do-1',
      outcomeId: null,
    },
    chessCategoryId: 'cat-strategic',
    chessCategoryName: 'Strategic',
    completionHorizon: 'EOD',
    priorityRank: 1,
    bullets: [
      { id: 'b-1', body: 'Write unit tests', sortOrder: 1, isCompleted: false },
      { id: 'b-2', body: 'Code review', sortOrder: 2, isCompleted: false },
    ],
    attribution: { kind: 'SELF_DIRECTED' },
    carriedFromCommitmentId: null,
    isUnplanned: false,
    reconciliationStatus: null,
    reconciliationNote: null,
    createdAt: '2026-03-16T00:00:00Z',
    updatedAt: '2026-03-16T00:00:00Z',
  },
  {
    id: 'commit-2',
    cycleId: 'cycle-1',
    userId: 'user-1',
    userDisplayName: 'Alice Smith',
    title: 'Refactor database layer',
    description: 'Clean up legacy code',
    rcdoLink: {
      rallyCryId: null,
      definingObjectiveId: null,
      outcomeId: null,
    },
    chessCategoryId: 'cat-operational',
    chessCategoryName: 'Operational',
    completionHorizon: 'EOW',
    priorityRank: 2,
    bullets: [
      { id: 'b-3', body: 'Identify bottlenecks', sortOrder: 1, isCompleted: false },
      { id: 'b-4', body: 'Write migration scripts', sortOrder: 2, isCompleted: false },
    ],
    attribution: { kind: 'SELF_DIRECTED' },
    carriedFromCommitmentId: null,
    isUnplanned: false,
    reconciliationStatus: null,
    reconciliationNote: null,
    createdAt: '2026-03-16T00:00:00Z',
    updatedAt: '2026-03-16T00:00:00Z',
  },
];

const mockRcdoTree = {
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

const mockUser = {
  id: 'user-1',
  orgId: 'org-1',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  role: 'MANAGER',
  reportsToId: null,
  isActive: true,
};

const mockTeam = [
  {
    userId: 'user-2',
    displayName: 'Bob Jones',
    role: 'EMPLOYEE',
    totalCommitments: 3,
    cycleState: 'DRAFT',
    reconciledCount: 0,
    categoryBreakdown: { STRATEGIC: 2, OPERATIONAL: 1 },
  },
  {
    userId: 'user-3',
    displayName: 'Carol Lee',
    role: 'EMPLOYEE',
    totalCommitments: 4,
    cycleState: 'DRAFT',
    reconciledCount: 0,
    categoryBreakdown: { OPERATIONAL: 3, DEFENSIVE: 1 },
  },
];

const mockDashboard = {
  teamRollup: {
    members: mockTeam,
  },
  alignmentSignal: {
    teamSize: 2,
    distribution: {
      STRATEGIC: { count: 2, percentage: 28.6 },
      OPERATIONAL: { count: 4, percentage: 57.1 },
      DEFENSIVE: { count: 1, percentage: 14.3 },
      CAPABILITY_BUILDING: { count: 0, percentage: 0 },
    },
    unlinkedCount: 0,
    byTeamMember: [
      {
        userId: 'user-2',
        displayName: 'Bob Jones',
        distribution: {
          STRATEGIC: { count: 2, percentage: 66.7 },
          OPERATIONAL: { count: 1, percentage: 33.3 },
        },
        unlinkedCount: 0,
      },
      {
        userId: 'user-3',
        displayName: 'Carol Lee',
        distribution: {
          OPERATIONAL: { count: 3, percentage: 75 },
          DEFENSIVE: { count: 1, percentage: 25 },
        },
        unlinkedCount: 0,
      },
    ],
  },
  assignmentAttribution: {
    totalCommitments: 7,
    selfDirectedCount: 6,
    selfDirectedPercentage: 85.7,
    managerAssignedCount: 1,
    managerAssignedPercentage: 14.3,
    concentrationRisks: [],
  },
  rcdoCoverage: {
    totalCommitments: 7,
    linkedCount: 2,
    unlinkedCount: 5,
    linkedPercentage: 28.6,
    byRallyCry: [
      {
        rallyCryId: 'rc-1',
        title: 'Accelerate Growth',
        commitmentCount: 2,
        percentage: 28.6,
      },
    ],
    uncoveredObjectives: [],
  },
};

const mockReconciliationView = {
  cycle: { ...mockCycle, state: 'RECONCILING' },
  commitments: mockCommitments.map((c) => ({
    commitment: c,
    reconciliation: null,
  })),
  summary: {
    totalCommitments: 2,
    reconciledCount: 0,
    completedCount: 0,
    partiallyCompletedCount: 0,
    notStartedCount: 0,
    carriedForwardCount: 0,
    completionRate: 0,
    bulletCompletionRate: 0,
  },
};

export const handlers = [
  http.get('/api/v1/cycles/current', () => {
    return apiResponse(mockCycle);
  }),

  http.get('/api/v1/commitments', () => {
    return apiResponse(mockCommitments);
  }),

  http.post('/api/v1/commitments', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return apiResponse(
      {
        ...mockCommitments[0],
        id: 'commit-new',
        title: (body as { title?: string }).title ?? 'New Commitment',
      },
      201
    );
  }),

  http.get('/api/v1/rcdo/tree', () => {
    return apiResponse(mockRcdoTree);
  }),

  // RcdoAutocomplete searches this endpoint
  http.get('/api/v1/rcdo/rally-cries', () => {
    return apiResponse(mockRcdoTree.rallyCries);
  }),

  http.get('/api/v1/dashboard', () => {
    return apiResponse(mockDashboard);
  }),

  http.get('/api/v1/users/me', () => {
    return apiResponse(mockUser);
  }),

  http.get('/api/v1/users/team', () => {
    return apiResponse(mockTeam);
  }),

  http.put('/api/v1/reconciliation/commitments/:id', ({ params }) => {
    const { id } = params;
    const commitment = mockCommitments.find((c) => c.id === id) ?? mockCommitments[0];
    return apiResponse({
      commitment: { ...commitment, reconciliationStatus: 'COMPLETED' },
      reconciliation: {
        id: 'rec-1',
        commitmentId: id as string,
        cycleId: 'cycle-1',
        status: 'COMPLETED',
        notes: null,
        plannedHorizon: 'EOD',
        reconciledAt: '2026-03-20T17:00:00Z',
        reconciledByUserId: 'user-1',
      },
    });
  }),

  http.get('/api/v1/reconciliation/cycles/:id', () => {
    return apiResponse(mockReconciliationView);
  }),
];
