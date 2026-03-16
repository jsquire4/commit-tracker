import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useUIStore } from '@/stores/ui.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DashboardFilters } from './DashboardFilters';
import { AlignmentGapChart } from './AlignmentGapChart';
import { AssignmentSignals } from './AssignmentSignals';
import { TeamRollupTable } from './TeamRollupTable';
import type { UserRole, DashboardFilters as DashboardFiltersType } from '@/types';

const ALLOWED_ROLES: UserRole[] = ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE', 'ANALYST'];

export function ManagerDashboardPage() {
  const { role } = useAuth();
  const dashboardFilters = useUIStore((s) => s.dashboardFilters);
  const setDashboardFilters = useUIStore((s) => s.setDashboardFilters);

  // Track active cycle ID for the detail expansion — derived from the loaded data
  const [activeCycleId, setActiveCycleId] = useState<string>('');

  const { data, isLoading, isError, error } = useDashboard(dashboardFilters);

  // Role guard
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Access Restricted</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          The Manager Dashboard is only accessible to managers and above.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label="Loading dashboard…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Failed to load dashboard</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const { teamRollup, alignmentSignal, assignmentAttribution } = data;

  // Build team member options for the filters dropdown
  const teamMemberOptions = teamRollup.members.map((m) => ({
    id: m.userId,
    displayName: m.displayName,
  }));

  function handleFiltersChange(partial: Partial<DashboardFiltersType>) {
    setDashboardFilters(partial);
  }

  function handleSegmentClick(userId: string | null, _category: string) {
    if (userId) {
      setDashboardFilters({ teamMemberId: userId });
    }
  }

  // Use cycleWeekStart as a stand-in for cycleId when fetching member details.
  // In a real integration the API would return a cycleId; use weekStart or empty string.
  const derivedCycleId = activeCycleId || dashboardFilters.cycleWeekStart || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Weekly commitment overview and alignment signals for your team.
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters
        filters={dashboardFilters}
        onChange={handleFiltersChange}
        teamMemberOptions={teamMemberOptions}
      />

      {/* Alignment gap chart — THE key differentiator */}
      <AlignmentGapChart
        aggregate={alignmentSignal}
        members={alignmentSignal.byTeamMember}
        onSegmentClick={handleSegmentClick}
      />

      {/* Assignment signals */}
      <AssignmentSignals signals={assignmentAttribution} />

      {/* Team rollup table with inline expansion */}
      <TeamRollupTable
        members={teamRollup.members}
        cycleId={derivedCycleId}
        onSelectMember={(id) => {
          // When a member is selected via the table, update the filter as well
          setDashboardFilters({ teamMemberId: id });
          setActiveCycleId(activeCycleId); // keep existing cycle; noop placeholder
        }}
      />
    </div>
  );
}
