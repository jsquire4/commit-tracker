import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments } from '@/hooks/useCommitments';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type {
  UserRole,
  Commitment,
  ReconciliationStatus,
  TeamMemberSummary,
  AssignmentAttributionResponse,
} from '@/types';

const ALLOWED_ROLES: UserRole[] = ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Friendly label for a role string from the backend */
function roleLabel(role: string): string {
  const map: Record<string, string> = {
    EMPLOYEE: 'IC',
    MANAGER: 'Manager',
    DIRECTOR: 'Director',
    VP: 'VP',
    EXECUTIVE: 'Exec',
    ANALYST: 'Analyst',
  };
  return map[role] ?? role;
}

/** Group commitments by rally cry title, putting unlinked last */
function groupByRallyCry(commitments: Commitment[]): { label: string; count: number }[] {
  const groups: Record<string, number> = {};
  let unlinked = 0;

  for (const c of commitments) {
    if (c.rcdoLink?.rallyCryTitle) {
      const title = c.rcdoLink.rallyCryTitle;
      groups[title] = (groups[title] ?? 0) + 1;
    } else {
      unlinked += 1;
    }
  }

  const result = Object.entries(groups).map(([label, count]) => ({ label, count }));
  if (unlinked > 0) {
    result.push({ label: 'Unlinked', count: unlinked });
  }
  return result;
}

/** Describe last-week reconciliation for a person's commitments */
function lastWeekSummary(commitments: Commitment[]): {
  text: string;
  hasWarning: boolean;
} {
  const reconciled = commitments.filter((c) => c.reconciliationStatus != null);
  if (reconciled.length === 0) {
    return { text: 'No prior reconciliation data', hasWarning: false };
  }

  const completed = reconciled.filter((c) => c.reconciliationStatus === 'COMPLETED').length;
  const total = reconciled.length;

  if (completed === total) {
    return { text: 'All completed', hasWarning: false };
  }

  return {
    text: `Partially completed (${completed} of ${total})`,
    hasWarning: true,
  };
}

/** Badge color by rally cry name — deterministic hash to a small palette */
function rallyCryColor(label: string): string {
  if (label === 'Unlinked') return 'bg-gray-700 text-gray-300';
  const colors = [
    'bg-blue-800/60 text-blue-300',
    'bg-emerald-800/60 text-emerald-300',
    'bg-violet-800/60 text-violet-300',
    'bg-amber-800/60 text-amber-300',
    'bg-rose-800/60 text-rose-300',
    'bg-cyan-800/60 text-cyan-300',
  ];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length] as string;
}

const RECON_STATUS_LABEL: Record<ReconciliationStatus, string> = {
  COMPLETED: 'Completed',
  PARTIALLY_COMPLETED: 'Partial',
  NOT_STARTED: 'Not started',
  CARRIED_FORWARD: 'Carried forward',
};

const RECON_STATUS_COLOR: Record<ReconciliationStatus, string> = {
  COMPLETED: 'text-emerald-400',
  PARTIALLY_COMPLETED: 'text-amber-400',
  NOT_STARTED: 'text-red-400',
  CARRIED_FORWARD: 'text-blue-400',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PersonCardProps {
  member: TeamMemberSummary;
  commitments: Commitment[];
}

function PersonCard({ member, commitments }: PersonCardProps) {
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => groupByRallyCry(commitments), [commitments]);
  const { text: lastWeek, hasWarning } = useMemo(
    () => lastWeekSummary(commitments),
    [commitments],
  );

  const workingOnParts = groups.map((g) => `${g.label} (${g.count})`).join(', ');

  return (
    <div
      className={`bg-gray-900 border rounded-lg p-4 transition-colors ${
        hasWarning
          ? 'border-gray-800 border-l-4 border-l-amber-500'
          : 'border-gray-800'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasWarning && (
            <span className="text-amber-400 text-sm" title="Needs attention">
              &#9888;
            </span>
          )}
          <span className="text-base font-semibold text-gray-100">
            {member.displayName}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {roleLabel(member.role)}
        </span>
      </div>

      {/* Summary line */}
      <p className="mt-1 text-sm text-gray-400">
        {commitments.length} commitment{commitments.length !== 1 ? 's' : ''}
        {workingOnParts && (
          <>
            {' '}
            &middot; Working on:{' '}
            {groups.map((g) => (
              <span
                key={g.label}
                className={`inline-block text-xs px-1.5 py-0.5 rounded mr-1 ${rallyCryColor(g.label)}`}
              >
                {g.label} ({g.count})
              </span>
            ))}
          </>
        )}
      </p>

      {/* Last week */}
      <p className="mt-0.5 text-xs text-gray-500">
        Last week: {lastWeek}
      </p>

      {/* Expand toggle */}
      <button
        type="button"
        className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9656;
        </span>
        {expanded ? 'Hide commitments' : 'View commitments'}
      </button>

      {/* Expanded commitment list */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? `${commitments.length * 64 + 16}px` : '0px' }}
      >
        <ul className="mt-3 space-y-2">
          {commitments.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-2 py-1 border-t border-gray-800 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-200 truncate">{c.title}</p>
                {c.rcdoLink?.rallyCryTitle && (
                  <span
                    className={`inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 ${rallyCryColor(c.rcdoLink.rallyCryTitle)}`}
                  >
                    {c.rcdoLink.rallyCryTitle}
                  </span>
                )}
              </div>
              {c.reconciliationStatus && (
                <span
                  className={`text-xs whitespace-nowrap ${RECON_STATUS_COLOR[c.reconciliationStatus]}`}
                >
                  {RECON_STATUS_LABEL[c.reconciliationStatus]}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TeamOverview({
  memberCount,
  totalCommitments,
  linkedPercentage,
  carriedCount,
}: {
  memberCount: number;
  totalCommitments: number;
  linkedPercentage: number;
  carriedCount: number;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-lg font-semibold text-gray-100">
        Your team: {memberCount} people, {totalCommitments} commitment{totalCommitments !== 1 ? 's' : ''} this week
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
        <span>{linkedPercentage}% linked to a rally cry</span>
        <span>{carriedCount} carried forward</span>
      </div>
    </div>
  );
}

function AssignmentPatterns({
  attribution,
}: {
  attribution: AssignmentAttributionResponse;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-2">
        Assignment Patterns
      </h2>
      <p className="text-sm text-gray-400">
        You assigned {attribution.managerAssignedPercentage}% of work this week.{' '}
        {attribution.selfDirectedPercentage}% was self-directed.
      </p>
      {(attribution.concentrationRisks ?? []).length > 0 && (
        <div className="mt-2 space-y-1">
          {attribution.concentrationRisks.map((risk) => (
            <p key={risk.assignedToUserId} className="text-sm text-amber-400">
              {risk.assignedToName} received {risk.percentageOfTotal}% of all assignments.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MyTeamPage() {
  const { role } = useAuth();
  const { data: cycle } = useCurrentCycle();
  const activeCycleId = cycle?.id ?? '';

  const { data: dashboard, isLoading: dashLoading, isError: dashError, error: dashErr } = useDashboard();
  const { data: commitments, isLoading: commitmentsLoading } = useCommitments(activeCycleId);

  // ---- Role guard ----
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          My Team is only accessible to managers and above.
        </p>
      </div>
    );
  }

  // ---- Loading ----
  if (dashLoading || commitmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label="Loading team view..." />
      </div>
    );
  }

  // ---- Error ----
  if (dashError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-100">Failed to load team data</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          {dashErr instanceof Error ? dashErr.message : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => { window.location.reload(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Derived data ----
  const { teamRollup, assignmentAttribution, rcdoCoverage } = dashboard;
  const members = teamRollup?.members ?? [];
  const allCommitments = commitments ?? [];

  const carriedCount = allCommitments.filter((c) => c.carriedFromCommitmentId != null).length;
  const totalCommitments = allCommitments.length;

  // Build a map: userId -> Commitment[]
  const commitmentsByUser: Record<string, Commitment[]> = {};
  for (const c of allCommitments) {
    if (!commitmentsByUser[c.userId]) {
      commitmentsByUser[c.userId] = [];
    }
    commitmentsByUser[c.userId]!.push(c);
  }

  // Sort: members with warnings first, then alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    const aCommits = commitmentsByUser[a.userId] ?? [];
    const bCommits = commitmentsByUser[b.userId] ?? [];
    const aWarn = lastWeekSummary(aCommits).hasWarning;
    const bWarn = lastWeekSummary(bCommits).hasWarning;
    if (aWarn !== bWarn) return aWarn ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">My Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Narrative view of your team&#39;s weekly commitments and alignment.
          </p>
        </div>

        {/* Section A: Team Overview */}
        <TeamOverview
          memberCount={members.length}
          totalCommitments={totalCommitments}
          linkedPercentage={rcdoCoverage?.linkedPercentage ?? 0}
          carriedCount={carriedCount}
        />

        {/* Section B: Per-Person Cards */}
        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3">
            Team Members
          </h2>
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <PersonCard
                key={member.userId}
                member={member}
                commitments={commitmentsByUser[member.userId] ?? []}
              />
            ))}
            {sortedMembers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                No team members found for this cycle.
              </p>
            )}
          </div>
        </div>

        {/* Section C: Assignment Patterns */}
        {assignmentAttribution && (
          <AssignmentPatterns attribution={assignmentAttribution} />
        )}
      </div>
    </div>
  );
}
