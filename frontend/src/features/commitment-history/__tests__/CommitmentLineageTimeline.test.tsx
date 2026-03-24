import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommitmentLineageTimeline } from '../CommitmentLineageTimeline';
import type { CommitmentLineageNode } from '@/types';

const sampleNodes: CommitmentLineageNode[] = [
  {
    commitmentId: 'a',
    cycleId: 'c1',
    cycleLabel: 'Week of Mar 10',
    startsAt: '2026-03-10T00:00:00Z',
    endsAt: '2026-03-16T23:59:59Z',
    title: 'Newest',
    description: null,
    bullets: [],
    userId: 'u1',
    userDisplayName: 'Test',
    reconciliationStatus: 'COMPLETED',
    reconciliationNote: null,
  },
  {
    commitmentId: 'b',
    cycleId: 'c2',
    cycleLabel: 'Week of Mar 3',
    startsAt: '2026-03-03T00:00:00Z',
    endsAt: '2026-03-09T23:59:59Z',
    title: 'Older',
    description: null,
    bullets: [{ id: 'tb1', body: 'Task', sortOrder: 0, isCompleted: true }],
    userId: 'u1',
    userDisplayName: 'Test',
    reconciliationStatus: null,
    reconciliationNote: null,
  },
];

describe('CommitmentLineageTimeline', () => {
  it('renders newest first (first item is accent / first title)', () => {
    render(
      <CommitmentLineageTimeline
        nodes={sampleNodes}
        isLoading={false}
        hasMore={false}
        onLoadMore={() => {}}
        loadMoreLoading={false}
      />
    );
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('Newest');
    expect(titles[1]).toHaveTextContent('Older');
  });

  it('calls onLoadMore when See more is clicked', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(
      <CommitmentLineageTimeline
        nodes={sampleNodes}
        isLoading={false}
        hasMore
        onLoadMore={onLoadMore}
        loadMoreLoading={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /see more history/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
