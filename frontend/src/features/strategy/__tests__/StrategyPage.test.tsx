import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { StrategyPage } from '../StrategyPage';

// ── Additional handlers for endpoints StrategyPage uses beyond defaults ────────

function addStrategyHandlers() {
  server.use(
    // getOrgTree — used for the owner user selector in the modal
    http.get('/api/v1/users/tree', () =>
      HttpResponse.json({ data: [] }),
    ),
  );
}

// ── Access guard ──────────────────────────────────────────────────────────────

describe('StrategyPage — access guard', () => {
  beforeEach(() => {
    addStrategyHandlers();
  });

  it('renders without crashing for VP role', () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'VP' } });
    // VP passes the access guard — the denied message must not appear
    expect(
      screen.queryByText(/VP or Executive role required/i),
    ).not.toBeInTheDocument();
  });

  it('shows access-denied message for MANAGER role', () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'MANAGER' } });

    expect(
      screen.getByText(/VP or Executive role required/i),
    ).toBeInTheDocument();
  });

  it('shows access-denied message for EMPLOYEE role', () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'EMPLOYEE' } });

    expect(
      screen.getByText(/VP or Executive role required/i),
    ).toBeInTheDocument();
  });

  it('shows access-denied message for DIRECTOR role', () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'DIRECTOR' } });

    expect(
      screen.getByText(/VP or Executive role required/i),
    ).toBeInTheDocument();
  });
});

// ── Loading then content ──────────────────────────────────────────────────────

describe('StrategyPage — VP+ loading and content', () => {
  beforeEach(() => {
    addStrategyHandlers();
  });

  it('shows loading state then renders RCDO tree content', async () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'VP' } });

    // Loading state is briefly visible before data resolves
    // (it may resolve very fast in test, so we check content after)
    await waitFor(() => {
      expect(screen.getByText('Strategic Framework')).toBeInTheDocument();
    });
  });

  it('renders rally cry titles from mock data', async () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'VP' } });

    await waitFor(() => {
      expect(screen.getByText('Accelerate Growth')).toBeInTheDocument();
    });
  });

  it('renders the Add Rally Cry button', async () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'VP' } });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Add Rally Cry/i }),
      ).toBeInTheDocument();
    });
  });

  it('renders summary counts after data loads', async () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'VP' } });

    await waitFor(() => {
      // "1 rally cry" from mock data (1 rally cry, 1 objective, 1 outcome)
      expect(screen.getByText(/1 rally cry/i)).toBeInTheDocument();
    });
  });

  it('shows error state when the API fails', async () => {
    server.use(
      http.get('/api/v1/rcdo/tree', () =>
        HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<StrategyPage />, { auth: { role: 'VP' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load strategy tree/i),
      ).toBeInTheDocument();
    });
  });

  it('EXECUTIVE role also passes the access guard', async () => {
    renderWithProviders(<StrategyPage />, { auth: { role: 'EXECUTIVE' } });

    await waitFor(() => {
      expect(screen.getByText('Strategic Framework')).toBeInTheDocument();
    });
  });
});
