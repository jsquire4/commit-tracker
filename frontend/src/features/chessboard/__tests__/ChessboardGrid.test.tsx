import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { ChessboardGrid } from '../ChessboardGrid';
import { commitmentFactory } from '@/test/factories';
import type { ChessCategory } from '@/types/chess.types';

const mockCategories: ChessCategory[] = [
  {
    id: 'cat-strategic',
    orgId: 'org-1',
    name: 'Strategic',
    description: null,
    colorHex: '#2563EB',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-operational',
    orgId: 'org-1',
    name: 'Operational',
    description: null,
    colorHex: '#6B7280',
    sortOrder: 2,
    isActive: true,
  },
];

describe('ChessboardGrid', () => {
  it('renders category column headers', () => {
    renderWithProviders(
      <ChessboardGrid commitments={[]} categories={mockCategories} />
    );

    expect(screen.getByRole('columnheader', { name: /strategic/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /operational/i })).toBeInTheDocument();
  });

  it('places commitments in correct cells by priority rank', () => {
    const highPriorityCommit = commitmentFactory({
      title: 'High Priority Task',
      chessCategoryId: 'cat-strategic',
      priorityRank: 1,
    });
    const mediumPriorityCommit = commitmentFactory({
      title: 'Medium Priority Task',
      chessCategoryId: 'cat-operational',
      priorityRank: 3,
    });

    renderWithProviders(
      <ChessboardGrid
        commitments={[highPriorityCommit, mediumPriorityCommit]}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('High Priority Task')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority Task')).toBeInTheDocument();
  });

  it('renders Uncategorized column when commitments have no category', () => {
    const uncategorizedCommit = commitmentFactory({
      title: 'Uncategorized Task',
      chessCategoryId: null,
    });

    renderWithProviders(
      <ChessboardGrid
        commitments={[uncategorizedCommit]}
        categories={mockCategories}
      />
    );

    expect(screen.getByRole('columnheader', { name: /uncategorized/i })).toBeInTheDocument();
  });

  it('renders priority tier legend', () => {
    renderWithProviders(
      <ChessboardGrid commitments={[]} categories={mockCategories} />
    );

    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    expect(screen.getByText(/low/i)).toBeInTheDocument();
  });

  it('renders empty grid with no commitments', () => {
    renderWithProviders(
      <ChessboardGrid commitments={[]} categories={mockCategories} />
    );

    // Headers still present
    expect(screen.getByRole('columnheader', { name: /strategic/i })).toBeInTheDocument();
  });

  it('does not render Uncategorized column when all commitments have a category', () => {
    const commit = commitmentFactory({
      chessCategoryId: 'cat-strategic',
    });

    renderWithProviders(
      <ChessboardGrid commitments={[commit]} categories={mockCategories} />
    );

    expect(screen.queryByRole('columnheader', { name: /uncategorized/i })).not.toBeInTheDocument();
  });
});
