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
      rallyCryTitle: 'Accelerate Growth',
      definingObjectiveId: 'do-1',
      definingObjectiveTitle: 'Improve Developer Velocity',
      outcomeId: null,
      outcomeTitle: null,
    },
    chessCategoryId: 'cat-strategic',
    chessCategoryName: 'Strategic',
    completionHorizon: 'EOD',
    completionDay: null,
    completionTimeBlock: null,
    priorityRank: 1,
    estimatedHours: null,
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
      rallyCryTitle: null,
      definingObjectiveId: null,
      definingObjectiveTitle: null,
      outcomeId: null,
      outcomeTitle: null,
    },
    chessCategoryId: 'cat-operational',
    chessCategoryName: 'Operational',
    completionHorizon: 'EOW',
    completionDay: null,
    completionTimeBlock: null,
    priorityRank: 2,
    estimatedHours: null,
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
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  role: 'MANAGER',
  reportsTo: null,
  reportsToDisplayName: null,
  isActive: true,
  costBandId: null,
  costBandName: null,
  costBandTier: null,
  weeklyCapacityHours: null,
};

const mockTeam = [
  {
    id: 'user-2',
    email: 'bob@example.com',
    displayName: 'Bob Jones',
    role: 'EMPLOYEE',
    reportsTo: 'user-1',
    reportsToDisplayName: 'Alice Smith',
    isActive: true,
    costBandId: null,
    costBandName: null,
    costBandTier: null,
    weeklyCapacityHours: null,
  },
  {
    id: 'user-3',
    email: 'carol@example.com',
    displayName: 'Carol Lee',
    role: 'EMPLOYEE',
    reportsTo: 'user-1',
    reportsToDisplayName: 'Alice Smith',
    isActive: true,
    costBandId: null,
    costBandName: null,
    costBandTier: null,
    weeklyCapacityHours: null,
  },
];

const mockTeamMemberSummaries = [
  {
    userId: 'user-2',
    displayName: 'Bob Jones',
    role: 'EMPLOYEE',
    totalCommitments: 3,
    cycleState: 'DRAFT',
    reconciledCount: 0,
    completedCount: 0,
    categoryBreakdown: { STRATEGIC: 2, OPERATIONAL: 1 },
  },
  {
    userId: 'user-3',
    displayName: 'Carol Lee',
    role: 'EMPLOYEE',
    totalCommitments: 4,
    cycleState: 'DRAFT',
    reconciledCount: 0,
    completedCount: 0,
    categoryBreakdown: { OPERATIONAL: 3, DEFENSIVE: 1 },
  },
];

const mockDashboard = {
  teamRollup: {
    members: mockTeamMemberSummaries,
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
  allReconciled: false,
};

export const handlers = [
  http.get('/api/v1/cycles/current', () => {
    return apiResponse(mockCycle);
  }),

  http.get('/api/v1/commitments', () => {
    return apiResponse({
      items: mockCommitments,
      page: 0,
      size: mockCommitments.length,
      totalElements: mockCommitments.length,
      totalPages: 1,
    });
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
    return apiResponse({
      id: 'rec-1',
      commitmentId: id as string,
      cycleId: 'cycle-1',
      status: 'COMPLETED',
      notes: null,
      plannedHorizon: 'EOD',
      reconciledAt: '2026-03-20T17:00:00Z',
      reconciledByUserId: 'user-1',
      displacementCategory: null,
      displacementDetail: null,
      displacingCommitmentId: null,
      displacingCommitmentTitle: null,
    });
  }),

  http.get('/api/v1/reconciliation/cycles/:id', () => {
    return apiResponse(mockReconciliationView);
  }),

  http.post('/api/v1/reconciliation/cycles/:id/complete', ({ params }) => {
    const { id } = params;
    return apiResponse({
      ...mockCycle,
      id: id as string,
      state: 'RECONCILED',
    });
  }),

  http.get('/api/v1/chess-categories', () => {
    return apiResponse([
      {
        id: 'cat-strategic',
        orgId: 'org-1',
        name: 'Strategic',
        description: null,
        colorHex: null,
        sortOrder: 1,
        isActive: true,
      },
      {
        id: 'cat-operational',
        orgId: 'org-1',
        name: 'Operational',
        description: null,
        colorHex: null,
        sortOrder: 2,
        isActive: true,
      },
      {
        id: 'cat-defensive',
        orgId: 'org-1',
        name: 'Defensive',
        description: null,
        colorHex: null,
        sortOrder: 3,
        isActive: true,
      },
      {
        id: 'cat-capability',
        orgId: 'org-1',
        name: 'Capability Building',
        description: null,
        colorHex: null,
        sortOrder: 4,
        isActive: true,
      },
    ]);
  }),
];
