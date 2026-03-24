import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CycleStateIndicator } from '../CycleStateIndicator';
import type { CycleState } from '@/types';

describe('CycleStateIndicator', () => {
  it('renders the DRAFT state label and message', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="DRAFT" />
    );

    expect(screen.getByText(/draft/i)).toBeInTheDocument();
    expect(screen.getByText(/ready to plan/i)).toBeInTheDocument();
  });

  it('renders with LOCKED as current state', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="LOCKED" />
    );

    expect(screen.getByText(/locked/i)).toBeInTheDocument();
    expect(screen.getByText(/commitments locked/i)).toBeInTheDocument();
  });

  it('renders with RECONCILING as current state', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="RECONCILING" />
    );

    expect(screen.getByText(/reconciling/i)).toBeInTheDocument();
    expect(screen.getByText(/reconciliation open/i)).toBeInTheDocument();
  });

  it('renders with RECONCILED as current state', () => {
    renderWithProviders(
      <CycleStateIndicator currentState="RECONCILED" />
    );

    expect(screen.getByText(/reconciled/i)).toBeInTheDocument();
    expect(screen.getByText(/week complete/i)).toBeInTheDocument();
  });

  it.each<CycleState>(['DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED'])(
    'renders without error for state %s',
    (state) => {
      renderWithProviders(
        <CycleStateIndicator currentState={state} />
      );

      expect(document.querySelector('[class*="rounded-full"]')).toBeTruthy();
    }
  );
});
