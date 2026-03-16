import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { ReconciliationPage } from '../ReconciliationPage';

/** Build the { data: T } wrapper the API client expects. */
function apiResponse<T>(payload: T) {
  return HttpResponse.json({ data: payload });
}

const reconcilingCycle = {
  id: 'cycle-1',
  orgId: 'org-1',
  label: 'Week of Mar 16, 2026',
  state: 'RECONCILING',
  startsAt: '2026-03-16T00:00:00Z',
  endsAt: '2026-03-20T23:59:59Z',
  isActive: true,
  commitmentCount: 1,
  createdAt: '2026-03-16T00:00:00Z',
  updatedAt: '2026-03-16T00:00:00Z',
};

const emptyReconView = {
  cycle: reconcilingCycle,
  commitments: [],
  summary: {
    totalCommitments: 0,
    reconciledCount: 0,
    completedCount: 0,
    partiallyCompletedCount: 0,
    notStartedCount: 0,
    carriedForwardCount: 0,
    completionRate: 0,
    bulletCompletionRate: 0,
  },
};

const reconViewWithCommitment = {
  cycle: reconcilingCycle,
  commitments: [
    {
      commitment: {
        id: 'commit-1',
        cycleId: 'cycle-1',
        userId: 'user-1',
        userDisplayName: 'Alice Smith',
        title: 'Ship new auth feature',
        description: null,
        rcdoLink: { rallyCryId: null, definingObjectiveId: null, outcomeId: null },
        chessCategoryId: null,
        chessCategoryName: null,
        completionHorizon: 'EOD',
        priorityRank: 1,
        bullets: [
          { id: 'b-1', body: 'Write tests', sortOrder: 1, isCompleted: false },
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
      reconciliation: null,
    },
  ],
  summary: {
    totalCommitments: 1,
    reconciledCount: 0,
    completedCount: 0,
    partiallyCompletedCount: 0,
    notStartedCount: 0,
    carriedForwardCount: 0,
    completionRate: 0,
    bulletCompletionRate: 0,
  },
};

describe('ReconciliationPage', () => {
  it('shows loading state initially', () => {
    renderWithProviders(<ReconciliationPage />);
    expect(screen.getByText(/loading cycle/i)).toBeInTheDocument();
  });

  it('renders planned vs actual layout when cycle is RECONCILING', async () => {
    server.use(
      http.get('/api/v1/cycles/current', () => apiResponse(reconcilingCycle)),
      http.get('/api/v1/reconciliation/cycles/:id', () => apiResponse(reconViewWithCommitment))
    );

    renderWithProviders(<ReconciliationPage />);

    await waitFor(() => {
      expect(screen.getByText('Reconciliation')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Reconciliation count is rendered as separate text nodes; verify the container
    expect(screen.getByText(/reconciled/i)).toBeInTheDocument();
  });

  it('shows Submit Reconciliation button after data loads', async () => {
    server.use(
      http.get('/api/v1/cycles/current', () => apiResponse(reconcilingCycle)),
      http.get('/api/v1/reconciliation/cycles/:id', () => apiResponse(emptyReconView))
    );

    renderWithProviders(<ReconciliationPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit reconciliation/i })).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
