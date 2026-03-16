import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { TeamRollupTable } from '../TeamRollupTable';
import { teamMemberFactory } from '@/test/factories';

describe('TeamRollupTable', () => {
  it('renders a row per team member', () => {
    const members = [
      teamMemberFactory({ displayName: 'Alice Smith' }),
      teamMemberFactory({ displayName: 'Bob Jones' }),
      teamMemberFactory({ displayName: 'Carol Lee' }),
    ];

    renderWithProviders(
      <TeamRollupTable members={members} cycleId="cycle-1" />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol Lee')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    renderWithProviders(
      <TeamRollupTable members={[]} cycleId="cycle-1" />
    );

    expect(screen.getByText(/no team members found/i)).toBeInTheDocument();
  });

  it('renders table headers', () => {
    const members = [teamMemberFactory()];

    renderWithProviders(
      <TeamRollupTable members={members} cycleId="cycle-1" />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Cycle State')).toBeInTheDocument();
    expect(screen.getByText('# Commitments')).toBeInTheDocument();
    expect(screen.getByText('Strategic %')).toBeInTheDocument();
  });

  it('sorts by column when header is clicked', async () => {
    const user = userEvent.setup();
    const members = [
      teamMemberFactory({ displayName: 'Zara White', totalCommitments: 1 }),
      teamMemberFactory({ displayName: 'Alice Brown', totalCommitments: 5 }),
    ];

    renderWithProviders(
      <TeamRollupTable members={members} cycleId="cycle-1" />
    );

    // Default sort by name asc — Alice should come first
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent('Alice Brown');

    // Click Name header to sort desc
    await user.click(screen.getByText('Name'));
    const rowsAfter = screen.getAllByRole('row');
    expect(rowsAfter[1]).toHaveTextContent('Zara White');
  });

  it('calls onSelectMember when row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectMember = vi.fn();
    const member = teamMemberFactory({ displayName: 'Alice Smith', userId: 'user-test' });

    renderWithProviders(
      <TeamRollupTable
        members={[member]}
        cycleId="cycle-1"
        onSelectMember={onSelectMember}
      />
    );

    await user.click(screen.getByText('Alice Smith'));
    expect(onSelectMember).toHaveBeenCalledWith('user-test');
  });

  it('renders Team Rollup heading', () => {
    renderWithProviders(
      <TeamRollupTable members={[teamMemberFactory()]} cycleId="cycle-1" />
    );

    expect(screen.getByText('Team Rollup')).toBeInTheDocument();
  });
});
