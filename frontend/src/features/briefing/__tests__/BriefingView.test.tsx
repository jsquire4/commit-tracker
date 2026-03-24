import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { BriefingView } from '../BriefingView';

// ── MSW handlers for endpoints BriefingView (and its children) use ────────────

const mockExecutiveHealth = {
  orgId: 'org-1',
  orgName: 'Acme Corp',
  overallGrade: 'GREEN',
  strategicAlignmentPct: 50,
  completionRate: 75,
  carryForwardRate: 10,
  activeDriftSignals: 0,
  integrityFlags: 0,
  units: [
    {
      managerId: 'user-1',
      managerName: 'Alice Smith',
      role: 'MANAGER',
      headcount: 2,
      costBandWeightedHeadcount: 2,
      grade: 'GREEN',
      strategicAlignmentPct: 50,
      operationalPct: 30,
      defensivePct: 10,
      capabilityBuildingPct: 10,
      rallyCoveragePct: 60,
      completionRate: 75,
      trendDirection: 'FLAT',
      weeksTrending: 1,
    },
  ],
  computedAt: '2026-03-16T00:00:00Z',
};

const mockBriefing = {
  generatedAt: '2026-03-16T00:00:00Z',
  headline: 'Strong execution week',
  narrative: 'The team delivered well against key objectives this week.',
  suggestions: [],
  citations: [],
  metrics: [
    { key: 'completion', label: 'Completion', value: 75, suffix: '%', trend: 'up' as const },
    { key: 'alignment', label: 'Alignment', value: 50, suffix: '%', trend: 'flat' as const },
    { key: 'carry_forward', label: 'Carry Forward', value: 10, suffix: '%', trend: 'down' as const },
    { key: 'unlinked', label: 'Unlinked', value: 5, suffix: '%', trend: 'flat' as const },
  ],
};

const mockCycleList = {
  items: [],
  page: 0,
  size: 0,
  totalElements: 0,
  totalPages: 0,
};

function addBriefingHandlers() {
  server.use(
    http.get('/api/v1/observatory/health', () =>
      HttpResponse.json({ data: mockExecutiveHealth }),
    ),
    http.get('/api/v1/briefing', () =>
      HttpResponse.json({ data: mockBriefing }),
    ),
    // RallyCryLevel fetches the full cycle list for historical comparisons
    http.get('/api/v1/cycles', () =>
      HttpResponse.json({ data: mockCycleList }),
    ),
    // RallyCryLevel fetches carry chains for the current cycle
    http.get('/api/v1/observatory/carry-chains', () =>
      HttpResponse.json({ data: [] }),
    ),
    // BriefingNarrativeCard loads AI feedback for the current cycle
    http.get('/api/v1/feedback', () =>
      HttpResponse.json({ data: [] }),
    ),
    // BriefingView also loads org tree for StrategyPage when mode='strategy'
    http.get('/api/v1/users/tree', () =>
      HttpResponse.json({ data: [] }),
    ),
    // ExecutiveHealthPage (lazy-loaded on Health Map tab) hits these observatory endpoints
    http.get('/api/v1/observatory/config', () =>
      HttpResponse.json({ data: { weekCount: 8, managerId: null } }),
    ),
    http.get('/api/v1/observatory/alignment-trend', () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get('/api/v1/observatory/drift', () =>
      HttpResponse.json({ data: { signals: [], computedAt: '2026-03-16T00:00:00Z' } }),
    ),
    http.get('/api/v1/observatory/dashboard', () =>
      HttpResponse.json({ data: { units: [], computedAt: '2026-03-16T00:00:00Z' } }),
    ),
    http.get('/api/v1/observatory/signals-summary', () =>
      HttpResponse.json({ data: { items: [] } }),
    ),
    http.get('/api/v1/observatory/completion-trend', () =>
      HttpResponse.json({ data: [] }),
    ),
  );
}

// ── Access guard ──────────────────────────────────────────────────────────────

describe('BriefingView — access guard', () => {
  beforeEach(() => {
    addBriefingHandlers();
  });

  it('renders without crashing for DIRECTOR role', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });
    expect(document.body).toBeTruthy();
  });

  it('shows access-denied message for MANAGER role', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'MANAGER' } });

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(
      screen.getByText(/Directors, VPs, and Executives/i),
    ).toBeInTheDocument();
  });

  it('shows access-denied message for EMPLOYEE role', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'EMPLOYEE' } });

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });
});

// ── Tab rendering ─────────────────────────────────────────────────────────────

describe('BriefingView — tabs for DIRECTOR+', () => {
  beforeEach(() => {
    addBriefingHandlers();
  });

  it('renders all four mode tabs', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });

    expect(screen.getByRole('button', { name: 'Briefing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Health Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strategy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Config' })).toBeInTheDocument();
  });

  it('VP role also sees all four tabs', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'VP' } });

    expect(screen.getByRole('button', { name: 'Briefing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Health Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strategy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Config' })).toBeInTheDocument();
  });

  it('EXECUTIVE role also sees all four tabs', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'EXECUTIVE' } });

    expect(screen.getByRole('button', { name: 'Briefing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Health Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strategy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Config' })).toBeInTheDocument();
  });
});

// ── Default tab is Briefing ───────────────────────────────────────────────────

describe('BriefingView — default tab state', () => {
  beforeEach(() => {
    addBriefingHandlers();
  });

  it('Briefing tab is active by default (has active CSS class)', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });

    const briefingTab = screen.getByRole('button', { name: 'Briefing' });
    // Active tabs get bg-surface-container
    expect(briefingTab).toHaveClass('bg-surface-container');
  });

  it('non-Briefing tabs are not active on initial render', () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });

    const healthTab = screen.getByRole('button', { name: 'Health Map' });
    // Inactive tabs do NOT have bg-surface-container
    expect(healthTab).not.toHaveClass('bg-surface-container');
  });

  it('briefing home content (two-column layout) is visible at depth 0', async () => {
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });

    // The briefing narrative loads asynchronously — wait for it
    await waitFor(() => {
      expect(screen.getByText('Strong execution week')).toBeInTheDocument();
    });
  });
});

// ── Tab switching ─────────────────────────────────────────────────────────────

describe('BriefingView — tab switching', () => {
  beforeEach(() => {
    addBriefingHandlers();
  });

  it('clicking Health Map tab activates it and deactivates Briefing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });

    const healthTab = screen.getByRole('button', { name: 'Health Map' });
    await user.click(healthTab);

    // After click: Health Map gains the active class
    expect(healthTab).toHaveClass('bg-surface-container');
    // Briefing tab loses the active class
    expect(screen.getByRole('button', { name: 'Briefing' })).not.toHaveClass('bg-surface-container');
  });

  it('clicking Strategy tab activates it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BriefingView />, { auth: { role: 'VP' } });

    const strategyTab = screen.getByRole('button', { name: 'Strategy' });
    await user.click(strategyTab);

    expect(strategyTab).toHaveClass('bg-surface-container');
  });

  it('clicking Config tab activates it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BriefingView />, { auth: { role: 'VP' } });

    const configTab = screen.getByRole('button', { name: 'Config' });
    await user.click(configTab);

    expect(configTab).toHaveClass('bg-surface-container');
  });

  it('clicking back to Briefing tab restores briefing content', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BriefingView />, { auth: { role: 'DIRECTOR' } });

    // Switch away then back
    await user.click(screen.getByRole('button', { name: 'Health Map' }));
    await user.click(screen.getByRole('button', { name: 'Briefing' }));

    const briefingTab = screen.getByRole('button', { name: 'Briefing' });
    expect(briefingTab).toHaveClass('bg-surface-container');
  });
});
