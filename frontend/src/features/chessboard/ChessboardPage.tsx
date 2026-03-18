import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useAuth } from '@/hooks/useAuth';
import { getTeam } from '@/api/users.api';
import { listCycles } from '@/api/cycles.api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ChessboardGrid } from './ChessboardGrid';
import type { ChessCategory } from '@/types/chess.types';
import type { Commitment } from '@/types';

const MANAGER_ROLES = new Set(['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE']);

/** Derive distinct ChessCategory objects from a list of commitments */
function deriveCategoriesFromCommitments(commitments: Commitment[]): ChessCategory[] {
  const seen = new Map<string, ChessCategory>();

  commitments.forEach((c) => {
    if (c.chessCategoryId && !seen.has(c.chessCategoryId)) {
      seen.set(c.chessCategoryId, {
        id: c.chessCategoryId,
        orgId: '',
        name: c.chessCategoryName ?? c.chessCategoryId,
        description: null,
        colorHex: null,
        sortOrder: seen.size,
        isActive: true,
      });
    }
  });

  return Array.from(seen.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ChessboardPage() {
  const { userId, role } = useAuth();
  const isManager = role !== null && MANAGER_ROLES.has(role);

  const [selectedUserId, setSelectedUserId] = useState<string>(userId);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const cycleQuery = useCurrentCycle();
  const currentCycleId = cycleQuery.data?.id ?? '';

  // Default selected cycle to current cycle once loaded
  const effectiveCycleId = selectedCycleId || currentCycleId;

  const cyclesQuery = useQuery({
    queryKey: ['cycles'],
    queryFn: () => listCycles(),
    staleTime: 60_000,
  });
  const allCycles = cyclesQuery.data?.items ?? [];

  // Find the previous cycle: the most recent cycle with startsAt before the selected cycle
  const selectedCycle = allCycles.find((c) => c.id === effectiveCycleId);
  const prevCycle = selectedCycle
    ? allCycles
        .filter((c) => new Date(c.startsAt) < new Date(selectedCycle.startsAt))
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0]
    : undefined;
  const prevCycleId = prevCycle?.id ?? '';

  const commitmentsQuery = useCommitments(effectiveCycleId, {
    userId: selectedUserId,
  });

  const prevCommitmentsQuery = useCommitments(prevCycleId, {
    userId: selectedUserId,
  });

  const teamQuery = useQuery({
    queryKey: ['users', 'team'],
    queryFn: getTeam,
    enabled: isManager,
    staleTime: 60_000,
  });

  const isLoading = cycleQuery.isLoading || commitmentsQuery.isLoading;
  const isError = cycleQuery.isError || commitmentsQuery.isError;
  const commitments = commitmentsQuery.data ?? [];
  const previousCommitments = prevCommitmentsQuery.data;

  const categories = deriveCategoriesFromCommitments(commitments);

  // Resolve the display name for the selected user
  const selectedUserName =
    selectedUserId === userId
      ? 'My Commitments'
      : (teamQuery.data?.find((m) => m.id === selectedUserId)?.displayName ?? 'Team Member');

  return (
    <div className="p-6 max-w-full">
      <PageHeader
        title="Chessboard View"
        {...(selectedCycle
          ? { subtitle: `${selectedCycle.label} · ${selectedCycle.state}` }
          : cycleQuery.data
          ? { subtitle: `${cycleQuery.data.label} · ${cycleQuery.data.state}` }
          : {})}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Cycle selector */}
            {allCycles.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="chessboard-cycle-select"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                >
                  Cycle:
                </label>
                <select
                  id="chessboard-cycle-select"
                  className={[
                    'text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                  ].join(' ')}
                  value={effectiveCycleId}
                  onChange={(e) => { setSelectedCycleId(e.target.value); }}
                >
                  {allCycles
                    .slice()
                    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                        {c.id === currentCycleId ? ' (current)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* User selector — managers only */}
            {isManager && teamQuery.data && teamQuery.data.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="chessboard-user-select"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                >
                  Viewing:
                </label>
                <select
                  id="chessboard-user-select"
                  className={[
                    'text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                  ].join(' ')}
                  value={selectedUserId}
                  onChange={(e) => { setSelectedUserId(e.target.value); }}
                >
                  <option value={userId}>My Commitments</option>
                  {teamQuery.data.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        }
      />

      {isLoading && (
        <LoadingSpinner fullPage label="Loading commitments…" />
      )}

      {!isLoading && isError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
          Failed to load chessboard data. Please refresh and try again.
        </div>
      )}

      {!isLoading && !isError && commitments.length === 0 && (
        <EmptyState
          title="No commitments yet"
          description={
            selectedUserId === userId
              ? 'Add commitments in the Commit Entry view to see them here.'
              : `${selectedUserName} has no commitments for this cycle.`
          }
        />
      )}

      {!isLoading && !isError && commitments.length > 0 && (
        <>
          {/* Tier label sidebar + grid */}
          <div className="flex gap-3">
            {/* Priority tier labels column */}
            <div className="flex flex-col gap-3 pt-8 shrink-0 w-16">
              {(['High', 'Medium', 'Low'] as const).map((tier) => (
                <div
                  key={tier}
                  className="flex items-center justify-end min-h-[72px]"
                >
                  <span
                    className={[
                      'text-xs font-semibold uppercase tracking-wide rotate-0',
                      tier === 'High' ? 'text-red-600' : '',
                      tier === 'Medium' ? 'text-yellow-600' : '',
                      tier === 'Low' ? 'text-green-600' : '',
                    ].join(' ')}
                  >
                    {tier}
                  </span>
                </div>
              ))}
            </div>

            {/* Main grid */}
            <div className="flex-1 min-w-0">
              <ChessboardGrid
                commitments={commitments}
                categories={categories}
                {...(previousCommitments !== undefined ? { previousCommitments } : {})}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
