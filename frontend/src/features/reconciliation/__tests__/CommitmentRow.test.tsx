import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { CommitmentRow } from '../CommitmentRow';
import { commitmentFactory } from '@/test/factories';
import type { CommitmentReconciliationDetail } from '@/types/reconciliation.types';
import type { Commitment } from '@/types/commitment.types';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function makeDetail(overrides: Partial<Commitment> = {}): CommitmentReconciliationDetail {
  return {
    commitment: commitmentFactory(overrides),
    reconciliation: null,
  };
}

interface RenderRowOptions {
  expanded?: boolean;
  onToggle?: () => void;
  commitmentOverrides?: Partial<Commitment>;
}

function renderRow({
  expanded = false,
  onToggle = vi.fn(),
  commitmentOverrides = {},
}: RenderRowOptions = {}) {
  const detail = makeDetail(commitmentOverrides);
  return renderWithProviders(
    <CommitmentRow
      detail={detail}
      cycleId="cycle-1"
      allCommitments={[detail.commitment]}
      expanded={expanded}
      onToggle={onToggle}
      staggerIndex={1}
    />,
  );
}

/* ─── Tests ───────────────────────────────────────────────────────────────── */

describe('CommitmentRow', () => {
  describe('rendering', () => {
    it('renders the commitment title in the header', () => {
      renderRow({ commitmentOverrides: { title: 'Ship analytics dashboard' } });
      expect(screen.getByText('Ship analytics dashboard')).toBeInTheDocument();
    });

    it('renders the priority rank in the header', () => {
      renderRow({ commitmentOverrides: { priorityRank: 3 } });
      expect(screen.getByText(/#3/i)).toBeInTheDocument();
    });

    it('renders the completion horizon pill', () => {
      renderRow({ commitmentOverrides: { completionHorizon: 'EOW' } });
      // HORIZON_LABELS maps 'EOW' → 'End of Week'
      expect(screen.getByText(/end of week/i)).toBeInTheDocument();
    });

    it('renders CHESS category name when present', () => {
      renderRow({ commitmentOverrides: { chessCategoryName: 'Strategic' } });
      expect(screen.getByText(/strategic/i)).toBeInTheDocument();
    });

    it('shows Unlinked label when no rally cry is linked', () => {
      renderRow({
        commitmentOverrides: {
          rcdoLink: {
            rallyCryId: null,
            rallyCryTitle: null,
            definingObjectiveId: null,
            definingObjectiveTitle: null,
            outcomeId: null,
            outcomeTitle: null,
          },
        },
      });
      expect(screen.getByText(/unlinked/i)).toBeInTheDocument();
    });

    it('shows rally cry title when linked', () => {
      renderRow({
        commitmentOverrides: {
          rcdoLink: {
            rallyCryId: 'rc-1',
            rallyCryTitle: 'Accelerate Growth',
            definingObjectiveId: null,
            definingObjectiveTitle: null,
            outcomeId: null,
            outcomeTitle: null,
          },
        },
      });
      expect(screen.getByText(/Accelerate Growth/)).toBeInTheDocument();
    });
  });

  describe('collapse/expand behaviour', () => {
    it('header toggle button has aria-expanded=false when collapsed', () => {
      renderRow({ expanded: false });
      const toggleBtn = screen.getByRole('button', { expanded: false });
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('header toggle button has aria-expanded=true when expanded', () => {
      renderRow({ expanded: true });
      const toggleBtn = screen.getByRole('button', { expanded: true });
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    });

    it('calls onToggle when the header button is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      renderRow({ expanded: false, onToggle });

      const toggleBtn = screen.getByRole('button');
      await user.click(toggleBtn);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('does not render the status selector as visually accessible when collapsed', () => {
      renderRow({ expanded: false });
      // The component uses CSS max-height: 0 to hide the body — the DOM node exists but
      // the containing div has max-height 0px. Verify the toggle button is aria-expanded=false.
      const toggleBtn = screen.getByRole('button', { expanded: false });
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders the status selector when expanded', () => {
      renderRow({ expanded: true });
      expect(screen.getByText(/what happened/i)).toBeInTheDocument();
    });
  });

  describe('status selection', () => {
    it('renders all three status options when expanded', () => {
      renderRow({ expanded: true });
      expect(screen.getByRole('radio', { name: /completed/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /partial/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /not started/i })).toBeInTheDocument();
    });

    it('status buttons are inside a radiogroup', () => {
      renderRow({ expanded: true });
      expect(
        screen.getByRole('radiogroup', { name: /reconciliation status/i }),
      ).toBeInTheDocument();
    });

    it('selecting Completed marks that radio as checked', async () => {
      const user = userEvent.setup();
      renderRow({ expanded: true });

      const completedBtn = screen.getByRole('radio', { name: /completed/i });
      await user.click(completedBtn);

      await waitFor(() => {
        expect(completedBtn.getAttribute('aria-checked')).toBe('true');
      });
    });

    it('selecting a non-COMPLETED status without notes does not show save error immediately', async () => {
      const user = userEvent.setup();
      renderRow({ expanded: true });

      const notStartedBtn = screen.getByRole('radio', { name: /not started/i });
      await user.click(notStartedBtn);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('shows success message after selecting Completed', async () => {
      const user = userEvent.setup();
      renderRow({ expanded: true });

      const completedBtn = screen.getByRole('radio', { name: /completed/i });
      await user.click(completedBtn);

      await waitFor(() => {
        expect(screen.getByText(/all bullets complete/i)).toBeInTheDocument();
      });
    });
  });

  describe('expanded content', () => {
    it('renders PLANNED section label when expanded', () => {
      renderRow({ expanded: true });
      // Use getAllByText because 'Unplanned' may also match /planned/i in other contexts
      const matches = screen.getAllByText(/^planned$/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('renders ACTUAL section label when expanded', () => {
      renderRow({ expanded: true });
      expect(screen.getByText(/actual/i)).toBeInTheDocument();
    });

    it('renders bullet items in the PLANNED pane', () => {
      renderRow({
        expanded: true,
        commitmentOverrides: {
          bullets: [
            { id: 'b-1', body: 'Write the tests', sortOrder: 1, isCompleted: false },
            { id: 'b-2', body: 'Open a PR', sortOrder: 2, isCompleted: false },
          ],
        },
      });
      // Bullets appear in both the PLANNED (read-only) and ACTUAL (checkbox) panes
      const testMatches = screen.getAllByText('Write the tests');
      expect(testMatches.length).toBeGreaterThanOrEqual(1);
      const prMatches = screen.getAllByText('Open a PR');
      expect(prMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('renders bullet checkboxes in the ACTUAL pane', () => {
      renderRow({
        expanded: true,
        commitmentOverrides: {
          bullets: [
            { id: 'b-1', body: 'Deploy to staging', sortOrder: 1, isCompleted: false },
          ],
        },
      });
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });
});
