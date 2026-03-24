import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { PortfolioPage } from '../PortfolioPage';

// ─── MSW helpers ─────────────────────────────────────────────────────────────

const mockPortfolioHealth = {
  portfolioId: 'portfolio-1',
  portfolioName: 'ST6 Portfolio',
  portcos: [
    {
      orgId: 'org-1',
      orgName: 'Meridian Corp',
      overallGrade: 'GREEN',
      strategicAlignmentPct: 65,
      rallyCoveragePct: 72,
      completionRate: 85,
      carryForwardRate: 12,
      activeDriftSignals: 0,
      headcount: 24,
    },
  ],
  computedAt: '2026-03-24T12:00:00Z',
};

const mockCycleList = {
  items: [
    {
      id: 'cycle-1',
      orgId: 'org-1',
      label: 'Week of Mar 16, 2026',
      state: 'DRAFT',
      startsAt: '2026-03-16T00:00:00Z',
      endsAt: '2026-03-20T23:59:59Z',
      isActive: true,
      commitmentCount: 0,
      createdAt: '2026-03-16T00:00:00Z',
      updatedAt: '2026-03-16T00:00:00Z',
    },
  ],
  page: 0,
  size: 1,
  totalElements: 1,
  totalPages: 1,
};

const mockPortfolioComparison = {
  portfolioId: 'portfolio-1',
  portfolioName: 'ST6 Portfolio',
  trends: [
    {
      orgId: 'org-1',
      orgName: 'Meridian Corp',
      dataPoints: [
        {
          cycleId: 'cycle-1',
          cycleLabel: 'Week of Mar 16, 2026',
          startsAt: '2026-03-16T00:00:00Z',
          strategicPct: 60,
          operationalPct: 30,
          defensivePct: 5,
          capabilityBuildingPct: 5,
          rallyCoveragePct: 70,
          totalCommitments: 20,
        },
      ],
    },
  ],
};

function addPortfolioHandlers() {
  server.use(
    http.get('/api/v1/observatory/portfolio', () =>
      HttpResponse.json({ data: mockPortfolioHealth }),
    ),
    http.get('/api/v1/observatory/portfolio/comparison', () =>
      HttpResponse.json({ data: mockPortfolioComparison }),
    ),
    // CycleHistorySelector calls listCycles() which hits the base /api/v1/cycles path
    http.get('/api/v1/cycles', () =>
      HttpResponse.json({ data: mockCycleList }),
    ),
  );
}

// ─── Access guard ─────────────────────────────────────────────────────────────

describe('PortfolioPage — access guard', () => {
  it('EMPLOYEE role renders "Access Restricted" message', () => {
    renderWithProviders(<PortfolioPage />, { auth: { role: 'EMPLOYEE' } });

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(
      screen.getByText(/only accessible to VPs and Executives/i),
    ).toBeInTheDocument();
  });

  it('MANAGER role renders "Access Restricted" message', () => {
    renderWithProviders(<PortfolioPage />, { auth: { role: 'MANAGER' } });

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(
      screen.getByText(/only accessible to VPs and Executives/i),
    ).toBeInTheDocument();
  });

  it('DIRECTOR role renders "Access Restricted" message', () => {
    renderWithProviders(<PortfolioPage />, { auth: { role: 'DIRECTOR' } });

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });
});

// ─── Authorized access ────────────────────────────────────────────────────────

describe('PortfolioPage — authorized access (VP and above)', () => {
  beforeEach(() => {
    addPortfolioHandlers();
  });

  it('VP role renders portfolio content after data loads', async () => {
    renderWithProviders(<PortfolioPage />, { auth: { role: 'VP' } });

    // Should not show access restricted
    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();

    // Waits for data — Portfolio Overview heading appears once loaded
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
    });
  });

  it('EXECUTIVE role renders portfolio content after data loads', async () => {
    renderWithProviders(<PortfolioPage />, { auth: { role: 'EXECUTIVE' } });

    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
    });
  });

  it('VP role renders company name from portfolio data', async () => {
    renderWithProviders(<PortfolioPage />, { auth: { role: 'VP' } });

    // The company name appears in both CompanyCard and ComparisonTable
    await waitFor(() => {
      expect(screen.getAllByText('Meridian Corp').length).toBeGreaterThan(0);
    });
  });

  it('shows loading skeleton initially before data arrives', () => {
    // Delay the MSW response so loading state is observable synchronously
    server.use(
      http.get('/api/v1/observatory/portfolio', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        return HttpResponse.json({ data: mockPortfolioHealth });
      }),
    );

    renderWithProviders(<PortfolioPage />, { auth: { role: 'VP' } });

    // The loading skeleton uses animate-pulse divs; Portfolio Overview is not yet rendered
    expect(screen.queryByText('Portfolio Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
  });

  it('shows error state when portfolio endpoint fails', async () => {
    server.use(
      http.get('/api/v1/observatory/portfolio', () =>
        HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<PortfolioPage />, { auth: { role: 'VP' } });

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Portfolio')).toBeInTheDocument();
    });
  });
});
