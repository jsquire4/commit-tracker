import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { RallyCrySidebar } from '../RallyCrySidebar';
import { commitmentFactory } from '@/test/factories';

describe('RallyCrySidebar', () => {
  it('renders loading skeleton while tree is fetching', () => {
    // Stall the RCDO tree request so isLoading stays true
    server.use(
      http.get('/api/v1/rcdo/tree', () => new Promise(() => {}))
    );

    renderWithProviders(<RallyCrySidebar commitments={[]} />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('returns null when the tree has no rally cries', async () => {
    server.use(
      http.get('/api/v1/rcdo/tree', () =>
        HttpResponse.json({ data: { rallyCries: [] } })
      )
    );

    const { container } = renderWithProviders(<RallyCrySidebar commitments={[]} />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders the rally cry title from the tree', async () => {
    renderWithProviders(<RallyCrySidebar commitments={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Accelerate Growth')).toBeInTheDocument();
    });
  });

  it('counts linked commitments per defining objective', async () => {
    const linkedCommitment = commitmentFactory({
      rcdoLink: {
        rallyCryId: 'rc-1',
        rallyCryTitle: 'Accelerate Growth',
        definingObjectiveId: 'do-1',
        definingObjectiveTitle: 'Improve Developer Velocity',
        outcomeId: null,
        outcomeTitle: null,
      },
    });
    const anotherLinked = commitmentFactory({
      rcdoLink: {
        rallyCryId: 'rc-1',
        rallyCryTitle: 'Accelerate Growth',
        definingObjectiveId: 'do-1',
        definingObjectiveTitle: 'Improve Developer Velocity',
        outcomeId: null,
        outcomeTitle: null,
      },
    });
    const unlinked = commitmentFactory(); // definingObjectiveId: null

    renderWithProviders(
      <RallyCrySidebar commitments={[linkedCommitment, anotherLinked, unlinked]} />
    );

    await waitFor(() => {
      // Text is split across adjacent text nodes: "2" + " linked"
      expect(screen.getByText((_, el) =>
        el?.textContent?.trim() === '2 linked'
      )).toBeInTheDocument();
    });
  });

  it('shows 0 linked for an objective that has no matching commitments', async () => {
    renderWithProviders(<RallyCrySidebar commitments={[]} />);

    await waitFor(() => {
      // Text is split across adjacent text nodes: "0" + " linked"
      expect(screen.getByText((_, el) =>
        el?.textContent?.trim() === '0 linked'
      )).toBeInTheDocument();
    });
  });

  it('renders coverage indicator text for each defining objective', async () => {
    const linked = commitmentFactory({
      rcdoLink: {
        rallyCryId: 'rc-1',
        rallyCryTitle: 'Accelerate Growth',
        definingObjectiveId: 'do-1',
        definingObjectiveTitle: 'Improve Developer Velocity',
        outcomeId: null,
        outcomeTitle: null,
      },
    });

    renderWithProviders(<RallyCrySidebar commitments={[linked]} />);

    await waitFor(() => {
      expect(screen.getByText('Improve Developer Velocity')).toBeInTheDocument();
      // Text is split across adjacent text nodes: "1" + " linked"
      expect(screen.getByText((_, el) =>
        el?.textContent?.trim() === '1 linked'
      )).toBeInTheDocument();
    });
  });

  it('renders the section heading when rally cries are present', async () => {
    renderWithProviders(<RallyCrySidebar commitments={[]} />);

    await waitFor(() => {
      // The heading uses a typographic right-single-quote (\u2019)
      expect(screen.getByText(/this week/i)).toBeInTheDocument();
      expect(screen.getByText(/active rally cries/i)).toBeInTheDocument();
    });
  });
});
