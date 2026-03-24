import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { DashboardFilters } from '../DashboardFilters';
import { useUIStore } from '@/stores/ui.store';
import type { DashboardFilters as DashboardFiltersType } from '@/types';

function emptyFilters(): DashboardFiltersType {
  return {};
}

describe('DashboardFilters', () => {
  beforeEach(() => {
    // Reset zustand store between tests
    useUIStore.setState({ dashboardFilters: {} });
  });

  describe('render', () => {
    it('renders team member select with default "All members" option', () => {
      renderWithProviders(
        <DashboardFilters filters={emptyFilters()} onChange={vi.fn()} />
      );

      const select = screen.getByLabelText(/team member/i);
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /all members/i })).toBeInTheDocument();
    });

    it('renders week starting date input', () => {
      renderWithProviders(
        <DashboardFilters filters={emptyFilters()} onChange={vi.fn()} />
      );

      const dateInput = screen.getByLabelText(/week starting/i);
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('renders reset button', () => {
      renderWithProviders(
        <DashboardFilters filters={emptyFilters()} onChange={vi.fn()} />
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('populates member select with provided options', () => {
      const members = [
        { id: 'user-2', displayName: 'Bob Jones' },
        { id: 'user-3', displayName: 'Carol Lee' },
      ];

      renderWithProviders(
        <DashboardFilters
          filters={emptyFilters()}
          onChange={vi.fn()}
          teamMemberOptions={members}
        />
      );

      expect(screen.getByRole('option', { name: 'Bob Jones' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Carol Lee' })).toBeInTheDocument();
    });

    it('does not render subtree toggle for MANAGER role', () => {
      renderWithProviders(
        <DashboardFilters
          filters={emptyFilters()}
          onChange={vi.fn()}
          role="MANAGER"
        />
      );

      expect(screen.queryByText(/include subtree/i)).not.toBeInTheDocument();
    });

    it('renders subtree toggle for DIRECTOR role', () => {
      renderWithProviders(
        <DashboardFilters
          filters={emptyFilters()}
          onChange={vi.fn()}
          role="DIRECTOR"
        />
      );

      expect(screen.getByText(/include full org subtree/i)).toBeInTheDocument();
    });

    it('renders subtree toggle checked when includeSubtree filter is set', () => {
      renderWithProviders(
        <DashboardFilters
          filters={{ includeSubtree: true }}
          onChange={vi.fn()}
          role="DIRECTOR"
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('reflects current teamMemberId filter as selected value', () => {
      const members = [
        { id: 'user-2', displayName: 'Bob Jones' },
        { id: 'user-3', displayName: 'Carol Lee' },
      ];

      renderWithProviders(
        <DashboardFilters
          filters={{ teamMemberId: 'user-2' }}
          onChange={vi.fn()}
          teamMemberOptions={members}
        />
      );

      const select = screen.getByLabelText(/team member/i) as HTMLSelectElement;
      expect(select.value).toBe('user-2');
    });
  });

  describe('member selection', () => {
    it('calls onChange with teamMemberId when a member is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const members = [
        { id: 'user-2', displayName: 'Bob Jones' },
        { id: 'user-3', displayName: 'Carol Lee' },
      ];

      renderWithProviders(
        <DashboardFilters
          filters={emptyFilters()}
          onChange={onChange}
          teamMemberOptions={members}
        />
      );

      await user.selectOptions(screen.getByLabelText(/team member/i), 'user-2');

      expect(onChange).toHaveBeenCalledWith({ teamMemberId: 'user-2' });
    });

    it('calls onChange with empty object when member selection is cleared', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const members = [{ id: 'user-2', displayName: 'Bob Jones' }];

      renderWithProviders(
        <DashboardFilters
          filters={{ teamMemberId: 'user-2' }}
          onChange={onChange}
          teamMemberOptions={members}
        />
      );

      await user.selectOptions(screen.getByLabelText(/team member/i), '');

      expect(onChange).toHaveBeenCalledWith({});
    });
  });

  describe('reset', () => {
    it('calls onChange with empty object when Reset is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      renderWithProviders(
        <DashboardFilters
          filters={{ teamMemberId: 'user-2', includeSubtree: true }}
          onChange={onChange}
          role="DIRECTOR"
        />
      );

      await user.click(screen.getByRole('button', { name: /reset/i }));

      expect(onChange).toHaveBeenCalledWith({});
    });

    it('resets zustand store dashboardFilters to empty when Reset is clicked', async () => {
      const user = userEvent.setup();

      // Pre-populate store
      useUIStore.setState({ dashboardFilters: { teamMemberId: 'user-2' } });

      renderWithProviders(
        <DashboardFilters
          filters={{ teamMemberId: 'user-2' }}
          onChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /reset/i }));

      expect(useUIStore.getState().dashboardFilters).toEqual({});
    });
  });

  describe('subtree toggle', () => {
    it('calls onChange with includeSubtree true when checked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      renderWithProviders(
        <DashboardFilters
          filters={emptyFilters()}
          onChange={onChange}
          role="VP"
        />
      );

      await user.click(screen.getByRole('checkbox'));

      expect(onChange).toHaveBeenCalledWith({ includeSubtree: true });
    });

    it('calls onChange with empty object when subtree is unchecked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      renderWithProviders(
        <DashboardFilters
          filters={{ includeSubtree: true }}
          onChange={onChange}
          role="EXECUTIVE"
        />
      );

      await user.click(screen.getByRole('checkbox'));

      expect(onChange).toHaveBeenCalledWith({});
    });
  });

  describe('week filter', () => {
    it('calls onChange with ISO-8601 timestamp when date is entered', () => {
      const onChange = vi.fn();

      renderWithProviders(
        <DashboardFilters filters={emptyFilters()} onChange={onChange} />
      );

      const dateInput = screen.getByLabelText(/week starting/i);
      fireEvent.change(dateInput, { target: { value: '2026-03-16' } });

      // onChange should have been called with an ISO timestamp for the entered date
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty('cycleWeekStart');
      expect((lastCall as DashboardFiltersType).cycleWeekStart).toMatch(/^2026-03-16T00:00:00Z$/);
    });

    it('reflects current cycleWeekStart filter as date input value', () => {
      renderWithProviders(
        <DashboardFilters
          filters={{ cycleWeekStart: '2026-03-16T00:00:00Z' }}
          onChange={vi.fn()}
        />
      );

      const dateInput = screen.getByLabelText(/week starting/i) as HTMLInputElement;
      expect(dateInput.value).toBe('2026-03-16');
    });
  });
});
