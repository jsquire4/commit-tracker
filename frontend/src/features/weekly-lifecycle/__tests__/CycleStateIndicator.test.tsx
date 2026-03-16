import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CycleStateIndicator } from '../CycleStateIndicator';
import type { StateTransition } from '../CycleStateIndicator';
import type { CycleState } from '@/types';

describe('CycleStateIndicator', () => {
  it('renders all four cycle state labels', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="DRAFT" transitions={[]} />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Reconciling')).toBeInTheDocument();
    expect(screen.getByText('Reconciled')).toBeInTheDocument();
  });

  it('shows "Now" label for current state with no transition time', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="DRAFT" transitions={[]} />
    );

    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('renders with LOCKED as current state', () => {
    const transitions: StateTransition[] = [
      { fromState: null, toState: 'DRAFT', transitionedAt: '2026-03-16T09:00:00Z' },
      { fromState: 'DRAFT', toState: 'LOCKED', transitionedAt: '2026-03-16T10:00:00Z' },
    ];

    renderWithProviders(
      <CycleStateIndicator currentState="LOCKED" transitions={transitions} />
    );

    // When LOCKED state has a transition timestamp, the timestamp is shown (not "Now").
    // "Now" is only shown when the current state has no matching transition entry.
    expect(screen.getByText('Locked')).toBeInTheDocument();
    // The LOCKED state has a transitionedAt so it shows a formatted date, not "Now"
    expect(screen.queryByText('Now')).not.toBeInTheDocument();
  });

  it('renders with RECONCILING as current state', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="RECONCILING" transitions={[]} />
    );

    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('renders with RECONCILED as current state', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="RECONCILED" transitions={[]} />
    );

    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('shows cycle progress heading', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="DRAFT" transitions={[]} />
    );

    expect(screen.getByText(/cycle progress/i)).toBeInTheDocument();
  });

  it.each<CycleState>(['DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED'])(
    'renders correctly for state %s',
    (state) => {
      renderWithProviders(
        <CycleStateIndicator currentState={state} transitions={[]} />
      );

      expect(screen.getByText('Now')).toBeInTheDocument();
    }
  );
});
