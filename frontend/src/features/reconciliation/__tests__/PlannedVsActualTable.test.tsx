import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PlannedVsActualTable } from '../PlannedVsActualTable';
import { commitmentFactory } from '@/test/factories';
import type { CommitmentReconciliationDetail } from '@/types/reconciliation.types';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function makeDetail(title?: string): CommitmentReconciliationDetail {
  return {
    commitment: commitmentFactory({ title: title ?? 'A Commitment' }),
    reconciliation: null,
  };
}

function renderTable(commitments: CommitmentReconciliationDetail[], cycleId = 'cycle-1') {
  return renderWithProviders(
    <PlannedVsActualTable commitments={commitments} cycleId={cycleId} />,
  );
}

/* ─── Tests ───────────────────────────────────────────────────────────────── */

describe('PlannedVsActualTable', () => {
  it('renders empty state message when there are no commitments', () => {
    renderTable([]);
    expect(screen.getByText(/no commitments to reconcile/i)).toBeInTheDocument();
  });

  it('renders a row for each commitment', () => {
    const details = [
      makeDetail('Ship auth feature'),
      makeDetail('Refactor database layer'),
      makeDetail('Update API docs'),
    ];
    renderTable(details);

    expect(screen.getByText('Ship auth feature')).toBeInTheDocument();
    expect(screen.getByText('Refactor database layer')).toBeInTheDocument();
    expect(screen.getByText('Update API docs')).toBeInTheDocument();
  });

  it('expands the first card by default', () => {
    const details = [
      makeDetail('First Commitment'),
      makeDetail('Second Commitment'),
    ];
    renderTable(details);

    // The first commitment's toggle button should have aria-expanded="true"
    const toggleButtons = screen.getAllByRole('button', { name: /first commitment/i });
    expect(toggleButtons.length).toBeGreaterThan(0);
    // At least one button for the first card should be expanded
    const firstCardToggle = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('aria-expanded') === 'true',
    );
    expect(firstCardToggle).toBeDefined();
  });

  it('second card is collapsed by default', () => {
    const details = [
      makeDetail('First Commitment'),
      makeDetail('Second Commitment'),
    ];
    renderTable(details);

    const expandedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-expanded') === 'true');

    // Only one card should be expanded at start
    expect(expandedButtons).toHaveLength(1);
  });

  it('collapses the first card when its toggle is clicked', async () => {
    const user = userEvent.setup();
    const details = [makeDetail('Only Commitment')];
    renderTable(details);

    // Initially expanded
    const toggleBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('aria-expanded') === 'true',
    );
    expect(toggleBtn).toBeDefined();

    await user.click(toggleBtn!);

    // Now collapsed
    const expandedAfter = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-expanded') === 'true');
    expect(expandedAfter).toHaveLength(0);
  });

  it('expands a collapsed card when its toggle is clicked', async () => {
    const user = userEvent.setup();
    const details = [
      makeDetail('First Commitment'),
      makeDetail('Second Commitment'),
    ];
    renderTable(details);

    // Find the collapsed (aria-expanded=false) toggle button for the second commitment
    const allToggleButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.hasAttribute('aria-expanded'));

    const collapsedBtn = allToggleButtons.find(
      (btn) => btn.getAttribute('aria-expanded') === 'false',
    );
    expect(collapsedBtn).toBeDefined();

    await user.click(collapsedBtn!);

    // Now the second card should be expanded
    const expandedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-expanded') === 'true');
    expect(expandedButtons.length).toBeGreaterThan(0);
  });

  it('accordion behaviour: clicking one card collapses the previously open one', async () => {
    const user = userEvent.setup();
    const details = [
      makeDetail('Card Alpha'),
      makeDetail('Card Beta'),
    ];
    renderTable(details);

    // Find the collapsed button (second card)
    const allToggleButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.hasAttribute('aria-expanded'));

    const secondCardBtn = allToggleButtons.find(
      (btn) => btn.getAttribute('aria-expanded') === 'false',
    );
    expect(secondCardBtn).toBeDefined();

    await user.click(secondCardBtn!);

    // The clicked card's button must now be expanded
    expect(secondCardBtn).toHaveAttribute('aria-expanded', 'true');
    // And exactly one card should be expanded overall (accordion collapses the first)
    const expandedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-expanded') === 'true');
    expect(expandedButtons).toHaveLength(1);
  });

  it('renders with a single commitment correctly', () => {
    const details = [makeDetail('Solo Commitment')];
    renderTable(details);

    expect(screen.getByText('Solo Commitment')).toBeInTheDocument();
    // Should NOT show empty state
    expect(screen.queryByText(/no commitments to reconcile/i)).not.toBeInTheDocument();
  });
});
