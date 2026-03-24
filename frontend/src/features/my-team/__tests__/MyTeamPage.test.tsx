import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { MyTeamPage } from '../MyTeamPage';

// GET /api/v1/cycles is called by CycleHistorySelector.
// Return a single cycle so the selector renders null (no pill noise in tests).
const baseCycle = {
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

beforeEach(() => {
  server.use(
    // CycleHistorySelector — single cycle suppresses the pill row
    http.get('/api/v1/cycles', () =>
      HttpResponse.json({
        data: {
          items: [baseCycle],
          page: 0,
          size: 1,
          totalElements: 1,
          totalPages: 1,
        },
      })
    ),
    // TeamSummaryCard LLM endpoint — return 204 to suppress AI content in tests
    http.get('/api/v1/dashboard/team-summary', () =>
      new HttpResponse(null, { status: 204 })
    ),
    // AIAttribution feedback vote endpoint
    http.get('/api/v1/feedback', () =>
      HttpResponse.json({ data: { vote: '' } })
    )
  );
});

describe('MyTeamPage', () => {
  describe('MANAGER role', () => {
    it('renders the team view without crashing', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      // Loading spinner is shown while dashboard fetches
      // Then confirm the page heading appears
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my team/i })).toBeInTheDocument();
      });
    });

    it('shows team member cards after data loads', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      // The default mockDashboard includes Bob Jones and Carol Lee.
      // Their names appear in both the DashboardFilters select options and the PersonCard
      // headers, so use getAllByText to confirm at least one instance of each.
      await waitFor(() => {
        expect(screen.getAllByText('Bob Jones').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Carol Lee').length).toBeGreaterThan(0);
      });
    });

    it('renders the Team Members section header', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /team members/i })).toBeInTheDocument();
      });
    });

    it('renders the metrics strip with expected metric labels', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      await waitFor(() => {
        // Use getAllByText since metric labels may appear in multiple places
        // (e.g. the MetricsStrip and RallyCryCoverageCards both reference rally cry)
        expect(screen.getByText(/team size/i)).toBeInTheDocument();
        expect(screen.getAllByText(/rally cry coverage/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/carried forward/i)).toBeInTheDocument();
        expect(screen.getByText(/unlinked commitments/i)).toBeInTheDocument();
      });
    });

    it('shows Assign Work button', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      await waitFor(() => {
        // The header "Assign Work" button is rendered once in the Team Members section.
        // PersonCard also has per-member "Assign work" links, so use getAllByRole and
        // confirm at least one is present.
        expect(screen.getAllByRole('button', { name: /assign work/i }).length).toBeGreaterThan(0);
      });
    });

    it('shows "No team members found" when dashboard returns an empty member list', async () => {
      server.use(
        http.get('/api/v1/dashboard', () =>
          HttpResponse.json({
            data: {
              teamRollup: { members: [] },
              alignmentSignal: {
                teamSize: 0,
                distribution: {
                  STRATEGIC: { count: 0, percentage: 0 },
                  OPERATIONAL: { count: 0, percentage: 0 },
                  DEFENSIVE: { count: 0, percentage: 0 },
                  CAPABILITY_BUILDING: { count: 0, percentage: 0 },
                },
                unlinkedCount: 0,
                byTeamMember: [],
              },
              assignmentAttribution: {
                totalCommitments: 0,
                selfDirectedCount: 0,
                selfDirectedPercentage: 0,
                managerAssignedCount: 0,
                managerAssignedPercentage: 0,
                concentrationRisks: [],
              },
              rcdoCoverage: {
                totalCommitments: 0,
                linkedCount: 0,
                unlinkedCount: 0,
                linkedPercentage: 0,
                byRallyCry: [],
                uncoveredObjectives: [],
              },
            },
          })
        )
      );

      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      await waitFor(() => {
        expect(screen.getByText(/no team members found/i)).toBeInTheDocument();
      });
    });

    it('shows error state when dashboard fetch fails', async () => {
      server.use(
        http.get('/api/v1/dashboard', () =>
          HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
        )
      );

      renderWithProviders(<MyTeamPage />, { auth: { role: 'MANAGER' } });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /failed to load team data/i })).toBeInTheDocument();
      });
    });
  });

  describe('EMPLOYEE role', () => {
    it('shows access-restricted message for EMPLOYEE role', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'EMPLOYEE' } });

      // The role guard renders immediately (no async needed), but waitFor is safe here
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /access restricted/i })).toBeInTheDocument();
        expect(screen.getByText(/my team is only accessible to managers and above/i)).toBeInTheDocument();
      });
    });

    it('does not render team member cards for EMPLOYEE role', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'EMPLOYEE' } });

      await waitFor(() => {
        expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol Lee')).not.toBeInTheDocument();
      });
    });
  });

  describe('DIRECTOR and above', () => {
    it('renders the team view for DIRECTOR role', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'DIRECTOR' } });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my team/i })).toBeInTheDocument();
      });
    });

    it('renders the team view for EXECUTIVE role', async () => {
      renderWithProviders(<MyTeamPage />, { auth: { role: 'EXECUTIVE' } });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my team/i })).toBeInTheDocument();
      });
    });
  });
});
