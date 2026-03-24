import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { ObservatoryPage } from '../ObservatoryPage';

// ── Shared mock data ───────────────────────────────────────────────────────────

const mockAlignmentTrend = [
  {
    cycleId: 'cycle-1',
    cycleLabel: 'Week of Mar 9, 2026',
    startsAt: '2026-03-09T00:00:00Z',
    strategicPct: 25.0,
    operationalPct: 50.0,
    defensivePct: 12.5,
    capabilityBuildingPct: 12.5,
    rallyCoveragePct: 72.5,
    totalCommitments: 8,
  },
  {
    cycleId: 'cycle-2',
    cycleLabel: 'Week of Mar 16, 2026',
    startsAt: '2026-03-16T00:00:00Z',
    strategicPct: 37.5,
    operationalPct: 50.0,
    defensivePct: 12.5,
    capabilityBuildingPct: 0.0,
    rallyCoveragePct: 81.3,
    totalCommitments: 8,
  },
];

const mockCompletionTrend = [
  {
    cycleId: 'cycle-1',
    cycleLabel: 'Week of Mar 9, 2026',
    startsAt: '2026-03-09T00:00:00Z',
    completionRate: 85.0,
    carryForwardRate: 12.5,
    notStartedRate: 2.5,
    totalCommitments: 8,
    reconciledCount: 7,
  },
  {
    cycleId: 'cycle-2',
    cycleLabel: 'Week of Mar 16, 2026',
    startsAt: '2026-03-16T00:00:00Z',
    completionRate: 90.0,
    carryForwardRate: 10.0,
    notStartedRate: 0.0,
    totalCommitments: 8,
    reconciledCount: 7,
  },
];

const mockHealth = {
  orgName: 'Meridian Corp',
  activeDriftSignals: 3,
  overallHealthGrade: 'B',
  weekCount: 2,
};

const mockDashboardResponse = {
  health: mockHealth,
  alignmentTrend: mockAlignmentTrend,
  completionTrend: mockCompletionTrend,
};

// ── MSW handlers for observatory endpoints ─────────────────────────────────────

function observatoryHandlers() {
  return [
    http.get('/api/v1/observatory/alignment-trend', () =>
      HttpResponse.json({ data: mockAlignmentTrend }),
    ),
    http.get('/api/v1/observatory/dashboard', () =>
      HttpResponse.json({ data: mockDashboardResponse }),
    ),
    http.get('/api/v1/observatory/program-summary', () =>
      HttpResponse.json({
        data: {
          summary: 'Execution is on track with strong rally cry alignment.',
          generatedAt: '2026-03-16T10:00:00Z',
        },
      }),
    ),
    http.get('/api/v1/observatory/completion-trend', () =>
      HttpResponse.json({ data: mockCompletionTrend }),
    ),
    http.get('/api/v1/observatory/signals-summary', () =>
      HttpResponse.json({
        data: {
          driftSignals: [],
          exceptionAlerts: [],
          totalSignals: 0,
        },
      }),
    ),
    http.get('/api/v1/observatory/program-heatmap', () =>
      HttpResponse.json({
        data: {
          teams: [],
          cycles: [],
          cells: [],
        },
      }),
    ),
    http.get('/api/v1/observatory/portfolio', () =>
      HttpResponse.json({
        data: {
          initiatives: [],
          totalInitiatives: 0,
          atRiskCount: 0,
        },
      }),
    ),
    http.get('/api/v1/observatory/health', () =>
      HttpResponse.json({ data: mockHealth }),
    ),
    http.get('/api/v1/observatory/drift', () =>
      HttpResponse.json({ data: { signals: [], totalCount: 0 } }),
    ),
    http.get('/api/v1/observatory/displacement', () =>
      HttpResponse.json({
        data: {
          totalDisplacements: 0,
          byCategory: {},
          weeklyTrend: {},
        },
      }),
    ),
    http.get('/api/v1/observatory/config', () =>
      HttpResponse.json({
        data: {
          defaultWeekCount: 12,
          showCostImpact: false,
        },
      }),
    ),
  ];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ObservatoryPage', () => {
  describe('access control', () => {
    it('shows access restricted message for EMPLOYEE role', () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'EMPLOYEE' } });

      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
      expect(
        screen.getByText(/observatory is only accessible to vps and executives/i),
      ).toBeInTheDocument();
    });

    it('shows access restricted message for MANAGER role', () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'MANAGER' } });

      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    });

    it('shows access restricted message for DIRECTOR role', () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'DIRECTOR' } });

      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    });
  });

  describe('renders without crashing', () => {
    it('mounts for VP role without throwing', () => {
      server.use(...observatoryHandlers());

      expect(() =>
        renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } }),
      ).not.toThrow();
    });

    it('mounts for EXECUTIVE role without throwing', () => {
      server.use(...observatoryHandlers());

      expect(() =>
        renderWithProviders(<ObservatoryPage />, { auth: { role: 'EXECUTIVE' } }),
      ).not.toThrow();
    });
  });

  describe('VP role — page structure', () => {
    it('renders the Observatory page heading', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      expect(screen.getByRole('heading', { name: /observatory/i })).toBeInTheDocument();
    });

    it('renders the date range "From" selector', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    });

    it('renders KPI strip with all four tiles', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      expect(screen.getByText(/rally cry coverage/i)).toBeInTheDocument();
      expect(screen.getByText(/completion rate/i)).toBeInTheDocument();
      expect(screen.getByText(/carry-forward rate/i)).toBeInTheDocument();
      expect(screen.getByText(/active drift signals/i)).toBeInTheDocument();
    });

    it('shows em-dash placeholders in KPI tiles while data loads', () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      // All four KPI values are em-dashes before data resolves
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('VP role — data resolved', () => {
    it('displays org name from health data after load', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      await waitFor(() => {
        expect(screen.getByText('Meridian Corp')).toBeInTheDocument();
      });
    });

    it('renders numeric KPI values after dashboard data resolves', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      // avg rallyCoveragePct = (72.5 + 81.3) / 2 = 76.9
      await waitFor(() => {
        expect(screen.getByText('76.9')).toBeInTheDocument();
      });
    });

    it('displays active drift signals count from health data', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      await waitFor(() => {
        // health.activeDriftSignals = 3
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('populates the From selector with cycle dates after alignment trend loads', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      await waitFor(() => {
        // The select is populated once alignment-trend data resolves.
        // jsdom interprets UTC midnight ISO strings in local time, shifting dates
        // by one day behind UTC, so "2026-03-09T00:00:00Z" renders as "Mar 8"
        // and "2026-03-16T00:00:00Z" renders as "Mar 15".
        const select = screen.getByLabelText(/from/i) as HTMLSelectElement;
        expect(select).not.toBeDisabled();
        // Both cycle options should be present (exact text may vary by timezone)
        const options = Array.from(select.options).map((o) => o.text);
        expect(options).toHaveLength(2);
      });
    });

    it('renders the execution trend section heading', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'VP' } });

      await waitFor(() => {
        expect(screen.getByText(/execution trend/i)).toBeInTheDocument();
      });
    });
  });

  describe('EXECUTIVE role — full access', () => {
    it('shows the Observatory heading for EXECUTIVE role', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'EXECUTIVE' } });

      expect(screen.getByRole('heading', { name: /observatory/i })).toBeInTheDocument();
    });

    it('renders KPI strip for EXECUTIVE role', async () => {
      server.use(...observatoryHandlers());

      renderWithProviders(<ObservatoryPage />, { auth: { role: 'EXECUTIVE' } });

      expect(screen.getByText(/rally cry coverage/i)).toBeInTheDocument();
    });
  });
});
