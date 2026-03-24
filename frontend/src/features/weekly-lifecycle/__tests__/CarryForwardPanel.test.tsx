import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { CarryForwardPanel } from '../CarryForwardPanel';
import { commitmentFactory } from '@/test/factories';
import { server } from '@/test/mocks/server';
import type { Commitment } from '@/types';

function makeCarriedCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return commitmentFactory({
    reconciliationStatus: 'NOT_STARTED',
    carriedFromCommitmentId: 'prev-commit-1',
    ...overrides,
  });
}

describe('CarryForwardPanel', () => {
  describe('rendering carried items', () => {
    it('renders a row for each carried commitment', () => {
      const items = [
        makeCarriedCommitment({ title: 'Finish API docs' }),
        makeCarriedCommitment({ title: 'Deploy hotfix' }),
      ];

      renderWithProviders(
        <CarryForwardPanel carriedItems={items} cycleId="cycle-1" />
      );

      expect(screen.getByText('Finish API docs')).toBeInTheDocument();
      expect(screen.getByText('Deploy hotfix')).toBeInTheDocument();
    });

    it('shows the count of carried items in the header', () => {
      const items = [
        makeCarriedCommitment({ title: 'Task A' }),
        makeCarriedCommitment({ title: 'Task B' }),
      ];

      renderWithProviders(
        <CarryForwardPanel carriedItems={items} cycleId="cycle-1" />
      );

      expect(screen.getByText(/2 items carried from last week/i)).toBeInTheDocument();
    });

    it('renders Accept and Decline buttons for each item', () => {
      const items = [makeCarriedCommitment({ title: 'Carry task' })];

      renderWithProviders(
        <CarryForwardPanel carriedItems={items} cycleId="cycle-1" />
      );

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    it('displays status pill with PARTIALLY_COMPLETED label', () => {
      const item = makeCarriedCommitment({
        reconciliationStatus: 'PARTIALLY_COMPLETED',
        title: 'Half done task',
      });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      expect(screen.getByText('Partially Completed')).toBeInTheDocument();
    });

    it('displays status pill with Not Started label', () => {
      const item = makeCarriedCommitment({
        reconciliationStatus: 'NOT_STARTED',
        title: 'Untouched task',
      });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });

    it('renders reconciliation note when present', () => {
      const item = makeCarriedCommitment({
        reconciliationNote: 'Blocked by external dependency',
      });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      expect(screen.getByText(/blocked by external dependency/i)).toBeInTheDocument();
      expect(screen.getByText(/why carried/i)).toBeInTheDocument();
    });

    it('renders bullet tasks with completion state', () => {
      const item = makeCarriedCommitment({
        bullets: [
          { id: 'b-1', body: 'Write tests', sortOrder: 1, isCompleted: true },
          { id: 'b-2', body: 'Review PR', sortOrder: 2, isCompleted: false },
        ],
      });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      expect(screen.getByText('Write tests')).toBeInTheDocument();
      expect(screen.getByText('Review PR')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  describe('empty state', () => {
    it('renders nothing when carriedItems is empty', () => {
      const { container } = renderWithProviders(
        <CarryForwardPanel carriedItems={[]} cycleId="cycle-1" />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('accept interaction', () => {
    it('marks an item as accepted when Accept is clicked', async () => {
      const user = userEvent.setup();
      // Use two items so the panel stays visible after the first is accepted
      const items = [
        makeCarriedCommitment({ title: 'Carry task' }),
        makeCarriedCommitment({ title: 'Other task' }),
      ];

      renderWithProviders(
        <CarryForwardPanel carriedItems={items} cycleId="cycle-1" />
      );

      const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
      await user.click(acceptButtons[0]);

      // After accept: accepted row shows "Accepted" badge; panel remains visible for other item
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });

    it('shows success toast after accepting an item', async () => {
      const user = userEvent.setup();
      const item = makeCarriedCommitment({ title: 'Carry task' });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      await user.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(screen.getByText(/commitment accepted/i)).toBeInTheDocument();
      });
    });

    it('decrements the carried count header after accepting an item', async () => {
      const user = userEvent.setup();
      const items = [
        makeCarriedCommitment({ title: 'Task A' }),
        makeCarriedCommitment({ title: 'Task B' }),
      ];

      renderWithProviders(
        <CarryForwardPanel carriedItems={items} cycleId="cycle-1" />
      );

      expect(screen.getByText(/2 items carried from last week/i)).toBeInTheDocument();

      const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
      await user.click(acceptButtons[0]);

      expect(screen.getByText(/1 item carried from last week/i)).toBeInTheDocument();
    });

    it('hides the panel entirely when all items are accepted', async () => {
      const user = userEvent.setup();
      const item = makeCarriedCommitment({ title: 'Only task' });

      const { container } = renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      await user.click(screen.getByRole('button', { name: /accept/i }));

      // Card content should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText(/carried from last week/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('decline interaction', () => {
    it('shows confirmation UI when Decline is clicked', async () => {
      const user = userEvent.setup();
      const item = makeCarriedCommitment({ title: 'To be declined' });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      await user.click(screen.getByRole('button', { name: /decline/i }));

      expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm decline/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('cancels decline and restores Accept/Decline buttons when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const item = makeCarriedCommitment({ title: 'To be cancelled' });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      await user.click(screen.getByRole('button', { name: /decline/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    it('calls DELETE endpoint when Confirm Decline is clicked', async () => {
      const user = userEvent.setup();
      const deleteSpy = vi.fn();

      server.use(
        http.delete('/api/v1/commitments/:id', ({ params }) => {
          deleteSpy(params.id);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const item = makeCarriedCommitment({ title: 'To confirm delete' });

      renderWithProviders(
        <CarryForwardPanel carriedItems={[item]} cycleId="cycle-1" />
      );

      await user.click(screen.getByRole('button', { name: /decline/i }));
      await user.click(screen.getByRole('button', { name: /confirm decline/i }));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith(item.id);
      });
    });
  });
});
