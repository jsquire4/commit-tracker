import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { RallyCryCoverageCards } from '../RallyCryCoverageCards';
import type { RcdoCoverageResponse } from '@/types';

function makeCoverage(
  overrides: Partial<RcdoCoverageResponse> = {}
): RcdoCoverageResponse {
  return {
    totalCommitments: 0,
    linkedCount: 0,
    unlinkedCount: 0,
    linkedPercentage: 0,
    byRallyCry: [],
    uncoveredObjectives: [],
    ...overrides,
  };
}

describe('RallyCryCoverageCards', () => {
  it('returns null when byRallyCry is empty', () => {
    const { container } = renderWithProviders(
      <RallyCryCoverageCards coverage={makeCoverage()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when byRallyCry is undefined', () => {
    const coverage = makeCoverage({ byRallyCry: undefined as unknown as [] });
    const { container } = renderWithProviders(
      <RallyCryCoverageCards coverage={coverage} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders each rally cry title', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Accelerate Growth', commitmentCount: 3, percentage: 60 },
        { rallyCryId: 'rc-2', title: 'Reduce Churn', commitmentCount: 2, percentage: 40 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    expect(screen.getByText('Accelerate Growth')).toBeInTheDocument();
    expect(screen.getByText('Reduce Churn')).toBeInTheDocument();
  });

  it('shows commitment count with correct pluralisation for multiple', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Accelerate Growth', commitmentCount: 3, percentage: 100 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    expect(screen.getByText('3 commitments')).toBeInTheDocument();
  });

  it('shows singular "commitment" when count is 1', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Accelerate Growth', commitmentCount: 1, percentage: 100 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    expect(screen.getByText('1 commitment')).toBeInTheDocument();
  });

  it('shows "0 commitments" text when commitmentCount is 0', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Accelerate Growth', commitmentCount: 0, percentage: 0 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    expect(screen.getByText('0 commitments')).toBeInTheDocument();
  });

  it('applies warning border class when commitmentCount is 0 (gap detection)', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'No Coverage RC', commitmentCount: 0, percentage: 0 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    // The card div wrapping the title carries the warning left-border class
    const card = screen.getByText('No Coverage RC').closest('div[class*="bg-surface"]');
    expect(card).toHaveClass('border-l-warning');
  });

  it('does not apply warning border class when commitmentCount is non-zero', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Covered RC', commitmentCount: 2, percentage: 100 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    const card = screen.getByText('Covered RC').closest('div[class*="bg-surface"]');
    expect(card).not.toHaveClass('border-l-warning');
  });

  it('applies warning border when rally cry title appears in uncoveredObjectives', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Accelerate Growth', commitmentCount: 2, percentage: 100 },
      ],
      uncoveredObjectives: [
        {
          definingObjectiveId: 'do-1',
          title: 'Uncovered Objective',
          rallyCryTitle: 'Accelerate Growth',
          rallyCryId: 'rc-1',
        },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    // Covered by commitments but has an uncovered DO — still a gap
    const card = screen.getByText('Accelerate Growth').closest('div[class*="bg-surface"]');
    expect(card).toHaveClass('border-l-warning');
  });

  it('renders the section heading', () => {
    const coverage = makeCoverage({
      byRallyCry: [
        { rallyCryId: 'rc-1', title: 'Accelerate Growth', commitmentCount: 1, percentage: 100 },
      ],
    });

    renderWithProviders(<RallyCryCoverageCards coverage={coverage} />);

    expect(screen.getByText(/rally cry coverage/i)).toBeInTheDocument();
  });
});
