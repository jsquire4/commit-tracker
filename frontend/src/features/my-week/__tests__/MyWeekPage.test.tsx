import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { MyWeekPage } from '../MyWeekPage';

// Baseline cycle returned by every test unless overridden via server.use()
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

// GET /api/v1/cycles is called by CycleHistorySelector.
// Return only one cycle so the selector renders null (avoids multi-pill noise in tests).
beforeEach(() => {
  server.use(
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
    )
  );
});

describe('MyWeekPage', () => {
  it('renders without crashing and transitions from loading to content', async () => {
    renderWithProviders(<MyWeekPage />);

    // Skeleton is shown immediately while cycle data is in-flight
    // (SkeletonLoader renders multiple placeholder divs; we just confirm no crash)
    // Then wait for the cycle state indicator to appear
    await waitFor(() => {
      expect(screen.getByText(/draft/i)).toBeInTheDocument();
    });
  });

  it('displays the cycle label after data loads', async () => {
    // Override to return two cycles so CycleHistorySelector renders its pills
    server.use(
      http.get('/api/v1/cycles', () =>
        HttpResponse.json({
          data: {
            items: [
              baseCycle,
              {
                ...baseCycle,
                id: 'cycle-0',
                label: 'Week of Mar 9, 2026',
                startsAt: '2026-03-09T00:00:00Z',
                endsAt: '2026-03-13T23:59:59Z',
                isActive: false,
              },
            ],
            page: 0,
            size: 2,
            totalElements: 2,
            totalPages: 1,
          },
        })
      )
    );

    renderWithProviders(<MyWeekPage />);

    await waitFor(() => {
      expect(screen.getByText('Week of Mar 16, 2026')).toBeInTheDocument();
    });
  });

  it('shows the commitment list after data loads', async () => {
    renderWithProviders(<MyWeekPage />);

    // Both commitments from the default handler are for user-1 (matching defaultAuth.userId)
    await waitFor(() => {
      expect(screen.getByText('Ship new auth feature')).toBeInTheDocument();
      expect(screen.getByText('Refactor database layer')).toBeInTheDocument();
    });
  });

  it('displays cycle state controls (CycleStateIndicator + TransitionActions) for a DRAFT cycle', async () => {
    renderWithProviders(<MyWeekPage />);

    await waitFor(() => {
      // CycleStateIndicator renders "Draft — ready to plan"
      expect(screen.getByText(/ready to plan/i)).toBeInTheDocument();
      // TransitionActions renders "Lock Commitments" when state is DRAFT and commitments exist
      expect(screen.getByRole('button', { name: /lock commitments/i })).toBeInTheDocument();
    });
  });

  it('shows "No commitments yet" empty state when there are no commitments for the user', async () => {
    server.use(
      http.get('/api/v1/commitments', () =>
        HttpResponse.json({
          data: {
            items: [],
            page: 0,
            size: 0,
            totalElements: 0,
            totalPages: 0,
          },
        })
      )
    );

    renderWithProviders(<MyWeekPage />);

    await waitFor(() => {
      expect(screen.getByText('No commitments yet')).toBeInTheDocument();
    });
  });

  it('shows cycle error state when current cycle fetch fails', async () => {
    server.use(
      http.get('/api/v1/cycles/current', () =>
        HttpResponse.json({ error: 'Service unavailable' }, { status: 503 })
      )
    );

    renderWithProviders(<MyWeekPage />);

    // The page renders the API error message from axios on failure.
    // Either the axios error or the fallback message is acceptable — just
    // confirm we are no longer showing the loading state or the cycle content.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /lock commitments/i })).not.toBeInTheDocument();
      // An error paragraph is rendered (either the axios message or fallback)
      expect(
        screen.getByText(/request failed|could not load the current cycle/i)
      ).toBeInTheDocument();
    });
  });

  it('renders LOCKED state controls when cycle is locked', async () => {
    server.use(
      http.get('/api/v1/cycles/current', () =>
        HttpResponse.json({
          data: { ...baseCycle, state: 'LOCKED', commitmentCount: 2 },
        })
      )
    );

    renderWithProviders(<MyWeekPage />);

    await waitFor(() => {
      expect(screen.getByText(/commitments locked/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /begin reconciliation/i })).toBeInTheDocument();
    });
  });
});
