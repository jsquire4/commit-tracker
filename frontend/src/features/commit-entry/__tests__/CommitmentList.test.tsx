import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CommitmentList } from '../CommitmentList';
import { commitmentFactory } from '@/test/factories';

describe('CommitmentList', () => {
  it('renders commitment cards for each commitment', () => {
    const commitments = [
      commitmentFactory({ title: 'First Commitment' }),
      commitmentFactory({ title: 'Second Commitment' }),
    ];

    renderWithProviders(
      <CommitmentList
        commitments={commitments}
        cycleState="DRAFT"
        cycleId="cycle-1"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('First Commitment')).toBeInTheDocument();
    expect(screen.getByText('Second Commitment')).toBeInTheDocument();
  });

  it('shows empty list when no commitments', () => {
    renderWithProviders(
      <CommitmentList
        commitments={[]}
        cycleState="DRAFT"
        cycleId="cycle-1"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // List renders but no commitment cards
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('renders list container with aria-label', () => {
    renderWithProviders(
      <CommitmentList
        commitments={[commitmentFactory({ title: 'Test Commit' })]}
        cycleState="DRAFT"
        cycleId="cycle-1"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole('list', { name: /commitment list/i })).toBeInTheDocument();
  });

  it('renders without drag context when cycle is not DRAFT', () => {
    const commitments = [commitmentFactory({ title: 'Locked Commitment' })];

    renderWithProviders(
      <CommitmentList
        commitments={commitments}
        cycleState="LOCKED"
        cycleId="cycle-1"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Locked Commitment')).toBeInTheDocument();
  });
});
