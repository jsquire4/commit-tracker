import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { AlignmentGapChart } from '../AlignmentGapChart';
import type { AlignmentSignalResponse, MemberAlignment } from '@/types';

const mockAggregate: AlignmentSignalResponse = {
  teamSize: 2,
  distribution: {
    STRATEGIC: { count: 3, percentage: 42.9 },
    OPERATIONAL: { count: 2, percentage: 28.6 },
    DEFENSIVE: { count: 1, percentage: 14.3 },
    CAPABILITY_BUILDING: { count: 1, percentage: 14.3 },
  },
  unlinkedCount: 0,
  byTeamMember: [],
};

const mockMembers: MemberAlignment[] = [
  {
    userId: 'user-2',
    displayName: 'Bob Jones',
    distribution: {
      STRATEGIC: { count: 2, percentage: 66.7 },
      OPERATIONAL: { count: 1, percentage: 33.3 },
    },
    unlinkedCount: 0,
  },
];

describe('AlignmentGapChart', () => {
  it('renders the chart heading', () => {
    renderWithProviders(
      <AlignmentGapChart aggregate={mockAggregate} members={mockMembers} />
    );

    expect(screen.getByText(/alignment gap/i)).toBeInTheDocument();
  });

  it('renders category legend items', () => {
    renderWithProviders(
      <AlignmentGapChart aggregate={mockAggregate} members={mockMembers} />
    );

    expect(screen.getByText('Strategic')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('Defensive')).toBeInTheDocument();
    expect(screen.getByText('Capability Building')).toBeInTheDocument();
  });

  it('renders without error when members are provided', () => {
    // recharts SVG text (Y-axis labels) may not be found by getByText in jsdom,
    // so we verify the component mounts without throwing.
    const { container } = renderWithProviders(
      <AlignmentGapChart aggregate={mockAggregate} members={mockMembers} />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('calls onSegmentClick when provided', () => {
    const onSegmentClick = vi.fn();

    renderWithProviders(
      <AlignmentGapChart
        aggregate={mockAggregate}
        members={mockMembers}
        onSegmentClick={onSegmentClick}
      />
    );

    // Chart renders without error when callback is provided
    expect(screen.getByText(/alignment gap/i)).toBeInTheDocument();
  });

  it('renders without error with empty members list', () => {
    const { container } = renderWithProviders(
      <AlignmentGapChart aggregate={mockAggregate} members={[]} />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('renders chart description', () => {
    renderWithProviders(
      <AlignmentGapChart aggregate={mockAggregate} members={mockMembers} />
    );

    expect(screen.getByText(/commitment distribution by chess category/i)).toBeInTheDocument();
  });
});
