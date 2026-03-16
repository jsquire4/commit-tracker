import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { TransitionActions } from '../TransitionActions';
import { cycleFactory } from '@/test/factories';

describe('TransitionActions', () => {
  it('shows Lock Commitments button when cycle is DRAFT', () => {
    const cycle = cycleFactory({ state: 'DRAFT', commitmentCount: 2 });

    renderWithProviders(
      <TransitionActions cycle={cycle} commitmentCount={2} />
    );

    expect(screen.getByRole('button', { name: /lock commitments/i })).toBeInTheDocument();
  });

  it('disables Lock button when cycle is DRAFT with no commitments', () => {
    const cycle = cycleFactory({ state: 'DRAFT', commitmentCount: 0 });

    renderWithProviders(
      <TransitionActions cycle={cycle} commitmentCount={0} />
    );

    const lockBtn = screen.getByRole('button', { name: /lock commitments/i });
    expect(lockBtn).toBeDisabled();
    expect(screen.getByText(/add at least one commitment/i)).toBeInTheDocument();
  });

  it('shows Begin Reconciliation button when cycle is LOCKED', () => {
    const cycle = cycleFactory({ state: 'LOCKED' });

    renderWithProviders(
      <TransitionActions cycle={cycle} commitmentCount={3} />
    );

    expect(screen.getByRole('button', { name: /begin reconciliation/i })).toBeInTheDocument();
  });

  it('shows cycle complete message when cycle is RECONCILED', () => {
    const cycle = cycleFactory({ state: 'RECONCILED' });

    renderWithProviders(
      <TransitionActions cycle={cycle} commitmentCount={3} />
    );

    expect(screen.getByText(/cycle complete/i)).toBeInTheDocument();
  });

  it('renders nothing when cycle is RECONCILING', () => {
    const cycle = cycleFactory({ state: 'RECONCILING' });
    const { container } = renderWithProviders(
      <TransitionActions cycle={cycle} commitmentCount={3} />
    );

    expect(container.firstChild).toBeNull();
  });
});
