import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments } from '@/hooks/useCommitments';
import { useUIStore } from '@/stores/ui.store';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Button from '@/components/Button';
import { DashboardFilters } from '@/features/manager-dashboard/DashboardFilters';
import { WeekRangeSelector, useHasDraftCycles } from './WeekRangeSelector';
import { TeamSummaryCard } from './TeamSummaryCard';
import { TeamMetricsStrip } from './TeamMetricsStrip';
import { RallyCryCoverageCards } from './RallyCryCoverageCards';
import { PersonCard } from './PersonCard';
import { AssignWorkForm, createEmptyFormState } from './AssignWorkForm';
import { TeamAnalytics } from './TeamAnalytics';
import { GrowthAreaAlignmentCard } from './GrowthAreaAlignmentCard';
import { RollingWorkHistory } from '@/features/commitment-history/RollingWorkHistory';
import type {
  Commitment,
  TeamMemberSummary,
} from '@/types';
import type { AssignmentFormState } from './AssignWorkForm';
import { MANAGER_AND_ABOVE } from '@/constants/roles';

// ── Main Page ────────────────────────────────────────────────────────────────

export function MyTeamPage() {
  const { role, userId } = useAuth();
  const { data: cycle } = useCurrentCycle();

  const filters = useUIStore((s) => s.dashboardFilters);
  const setDashboardFilters = useUIStore((s) => s.setDashboardFilters);

  // Executives should see their full org subtree by default, not just direct VP reports
  useEffect(() => {
    if (role === 'EXECUTIVE' && filters.includeSubtree !== true) {
      setDashboardFilters({ includeSubtree: true });
    }
  }, [role, filters.includeSubtree, setDashboardFilters]);

  const { data: dashboard, isLoading: dashLoading, isError: dashError, error: dashErr } = useDashboard(filters);

  // Use the cycle the dashboard resolved — keeps commitments in sync with all dashboard sections
  const activeCycleId = dashboard?.resolvedCycleId ?? cycle?.id ?? '';
  const { data: commitments, isLoading: commitmentsLoading } = useCommitments(activeCycleId);

  const { hasDraft, draftLabel } = useHasDraftCycles(filters);

  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [assignFormState, setAssignFormState] = useState<AssignmentFormState>(createEmptyFormState);

  // ALL hooks must be above any conditional returns (Rules of Hooks)
  const allCommitments = commitments ?? [];

  const commitmentsByUser = useMemo(() => {
    const map: Record<string, Commitment[]> = {};
    for (const c of allCommitments) {
      if (!map[c.userId]) map[c.userId] = [];
      map[c.userId]!.push(c);
    }
    return map;
  }, [allCommitments]);

  const members = dashboard?.teamRollup?.members ?? [];

  const teamMemberOptions = useMemo(
    () => members.map((m) => ({ id: m.userId, displayName: m.displayName })),
    [members],
  );

  const rcdoOptions = useMemo(
    () =>
      (dashboard?.rcdoCoverage?.byRallyCry ?? []).map((r) => ({
        id: r.rallyCryId,
        title: r.title,
      })),
    [dashboard?.rcdoCoverage?.byRallyCry],
  );

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aLinked = (commitmentsByUser[a.userId] ?? []).filter((c) => c.rcdoLink?.rallyCryTitle).length;
      const bLinked = (commitmentsByUser[b.userId] ?? []).filter((c) => c.rcdoLink?.rallyCryTitle).length;
      const aTotal = (commitmentsByUser[a.userId] ?? []).length;
      const bTotal = (commitmentsByUser[b.userId] ?? []).length;
      const aRisk = aTotal > 0 && aLinked === 0;
      const bRisk = bTotal > 0 && bLinked === 0;
      if (aRisk !== bRisk) return aRisk ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members, commitmentsByUser]);

  // Role guard — after all hooks
  if (!role || !MANAGER_AND_ABOVE.has(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="font-serif text-headline text-on-surface">Access Restricted</h1>
        <p className="text-body text-on-surface-variant max-w-sm">My Team is only accessible to managers and above.</p>
      </div>
    );
  }

  if (dashLoading || commitmentsLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-8 py-8 flex flex-col gap-8">
        {/* Page header skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-20 bg-surface-container animate-pulse rounded-sm" />
          <div className="h-8 w-40 bg-surface-container animate-pulse rounded-sm" />
        </div>
        {/* Filters skeleton */}
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-surface-container animate-pulse rounded-sm" />
          <div className="h-9 w-32 bg-surface-container animate-pulse rounded-sm" />
        </div>
        {/* AI summary card skeleton */}
        <div className="h-32 bg-surface-lowest rounded-sm animate-pulse" />
        {/* Metrics strip skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-lowest rounded-sm animate-pulse" />
          ))}
        </div>
        {/* Rally cry coverage skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-surface-lowest rounded-sm animate-pulse" />
          ))}
        </div>
        {/* Team members skeleton */}
        <div className="bg-surface-lowest rounded-sm p-5 flex flex-col gap-3">
          <div className="h-6 w-36 bg-surface-container animate-pulse rounded-sm" />
          <SkeletonLoader variant="table-row" count={5} />
        </div>
      </div>
    );
  }

  if (dashError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="font-serif text-headline text-on-surface">Failed to load team data</h1>
        <p className="text-body text-on-surface-variant max-w-sm">{dashErr instanceof Error ? dashErr.message : 'An unexpected error occurred.'}</p>
        <Button variant="primary" onClick={() => { window.location.reload(); }}>Retry</Button>
      </div>
    );
  }

  const { rcdoCoverage } = dashboard;
  // carriedFromCommitmentId identifies commitments carried into this cycle from a previous one.
  // In DRAFT cycles, reconciliationStatus is null — use carriedFromCommitmentId for carry-in detection.
  const carriedCount = allCommitments.filter((c) => c.carriedFromCommitmentId != null).length;
  const totalCommitments = allCommitments.length;
  const linkedPct = Math.round(rcdoCoverage?.linkedPercentage ?? 0);
  const unlinkedCount = rcdoCoverage?.unlinkedCount ?? 0;

  function openAssignFromPerson(member: TeamMemberSummary) {
    setAssignFormState({ ...createEmptyFormState(), employeeId: member.userId });
    setAssignFormOpen(true);
  }

  return (
    <div className="max-w-[960px] mx-auto px-8 py-8 flex flex-col gap-8">
      {/* Page header with week range selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-[1.25rem] text-on-surface shrink-0">My Team</h1>
        <WeekRangeSelector filters={filters} onChange={setDashboardFilters} />
      </div>

      {/* Draft / unreconciled disclaimer */}
      {hasDraft && (
        <div className="flex items-start gap-3 bg-warning/[0.06] border border-warning/20 rounded-sm px-4 py-3">
          <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-body font-medium text-on-surface">
              Includes unreconciled data
            </p>
            <p className="text-small text-on-surface-variant mt-0.5">
              {draftLabel} {draftLabel?.includes(',') ? 'have' : 'has'} not been locked or reconciled yet.
              Commitments may still be added, changed, or removed before the week closes.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Filters */}
      <DashboardFilters
        filters={filters}
        onChange={setDashboardFilters}
        teamMemberOptions={teamMemberOptions}
        rcdoOptions={rcdoOptions}
        role={role}
      />

      {/* AI Summary Card */}
      <TeamSummaryCard
        dashboard={dashboard}
        commitments={allCommitments}
        cycleId={activeCycleId}
        {...(filters.cycleWeekStart !== undefined && { cycleWeekStart: filters.cycleWeekStart })}
        {...(filters.cycleWeekEnd !== undefined && { cycleWeekEnd: filters.cycleWeekEnd })}
        hasDraftData={hasDraft}
      />

      {/* Metrics Strip */}
      <TeamMetricsStrip
        teamSize={members.length}
        rallyCryCoverage={linkedPct}
        carriedForwardCount={carriedCount}
        totalCommitments={totalCommitments}
        unlinkedCommitments={unlinkedCount}
      />

      {/* Rally Cry Coverage Cards */}
      {rcdoCoverage && <RallyCryCoverageCards coverage={rcdoCoverage} />}

      {/* My Rolling Work — capped at 3 weeks on My Team; no pagination */}
      <RollingWorkHistory maxWeeks={3} />

      {/* Team Members */}
      <ErrorBoundary>
        <div className="bg-surface-lowest rounded-sm">
          <div className="px-5 pt-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-[1.25rem] text-on-surface">Team Members</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setAssignFormState(createEmptyFormState()); setAssignFormOpen(true); }}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                }
              >
                Assign Work
              </Button>
            </div>
          </div>

          <div className="flex flex-col">
            {sortedMembers.map((member) => (
              <PersonCard
                key={member.userId}
                member={member}
                commitments={commitmentsByUser[member.userId] ?? []}
                onAssign={openAssignFromPerson}
              />
            ))}
            {sortedMembers.length === 0 && (
              <p className="text-body text-muted text-center py-8">No team members found.</p>
            )}
          </div>
        </div>
      </ErrorBoundary>

      {/* Team Analytics — collapsible */}
      <ErrorBoundary>
        <TeamAnalytics dashboard={dashboard} />
      </ErrorBoundary>

      {/* Growth Area Alignment — collapsible */}
      {dashboard.growthAreaAlignment && (
        <ErrorBoundary>
          <GrowthAreaAlignmentCard data={dashboard.growthAreaAlignment} />
        </ErrorBoundary>
      )}

      {/* Assign Work Slide-Over */}
      <AssignWorkForm
        open={assignFormOpen}
        onClose={() => { setAssignFormOpen(false); }}
        members={members}
        initialState={assignFormState}
        cycleId={activeCycleId}
        managerId={userId}
      />
    </div>
  );
}
