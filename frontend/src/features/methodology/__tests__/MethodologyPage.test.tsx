import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { MethodologyPage } from '../MethodologyPage';
import { METRIC_DEFINITIONS } from '@/constants/metric-definitions';

describe('MethodologyPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<MethodologyPage />);
    expect(screen.getByText(/Methodology & Definitions/i)).toBeInTheDocument();
  });

  it('displays all metric definition labels from METRIC_DEFINITIONS', () => {
    renderWithProviders(<MethodologyPage />);
    for (const def of Object.values(METRIC_DEFINITIONS)) {
      // Use getAllByText because some labels (e.g. "Carried Forward") also appear
      // in the static Reconciliation Statuses section below the metric cards.
      expect(screen.getAllByText(def.label).length).toBeGreaterThan(0);
    }
  });

  it('shows formula cards for each metric', () => {
    renderWithProviders(<MethodologyPage />);
    for (const def of Object.values(METRIC_DEFINITIONS)) {
      expect(screen.getByText(def.formula)).toBeInTheDocument();
    }
  });

  it('renders the AI-Generated Content section', () => {
    renderWithProviders(<MethodologyPage />);
    expect(screen.getByText(/AI-Generated Content/i)).toBeInTheDocument();
  });

  it('renders the CHESS Categories section', () => {
    renderWithProviders(<MethodologyPage />);
    // Use getByRole to avoid matching the word "CHESS categories" inside metric descriptions
    expect(screen.getByRole('heading', { name: 'CHESS Categories' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Strategic' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operational' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Defensive' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capability Building' })).toBeInTheDocument();
  });

  it('renders the Reconciliation Statuses section', () => {
    renderWithProviders(<MethodologyPage />);
    expect(screen.getByRole('heading', { name: 'Reconciliation Statuses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Partially Completed' })).toBeInTheDocument();
    // "Carried Forward" appears both as a metric card heading and a reconciliation status heading
    expect(screen.getAllByRole('heading', { name: 'Carried Forward' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Not Started/i })).toBeInTheDocument();
  });
});
