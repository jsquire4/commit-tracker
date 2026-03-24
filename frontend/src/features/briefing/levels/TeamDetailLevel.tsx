/**
 * Level 2: Team detail — adapted from TeamDrillDown.
 * Restyled to Compass design system. Shows alignment trends, completion,
 * cost impact, displacement, carry-forward chains.
 */
import { Badge } from '@/components/Badge';
import Card from '@/components/Card';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useCurrentCycle } from '@/hooks/useCycle';
import {
  useAlignmentTrend,
  useCompletionTrend,
  useDisplacementReport,
  useCarryChains,
  useExecutiveHealth,
} from '@/hooks/useObservatory';
import { useCommitments } from '@/hooks/useCommitments';
import { useUserList } from '@/hooks/useUsers';
import { AlignmentTrendChart } from '@/features/observatory/AlignmentTrendChart';
import { CompletionTrendChart } from '@/features/observatory/CompletionTrendChart';
import { DisplacementReport } from '@/features/observatory/DisplacementReport';
import { CarryForwardChainList } from '@/features/observatory/CarryForwardChainList';
import { DarkWorkAttribution } from '@/features/observatory/DarkWorkAttribution';

interface TeamDetailLevelProps {
  teamId: string;
  onSelectPerson: (personId: string) => void;
}

export function TeamDetailLevel({ teamId, onSelectPerson }: TeamDetailLevelProps) {
  const { data: cycle } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';

  const healthQuery = useExecutiveHealth();

  const healthUnits = healthQuery.data?.units ?? [];
  const managerUnit = healthUnits.find((u) => u.managerId === teamId);
  const isManager = Boolean(managerUnit);

  // H11: Alignment trend is only meaningful for managers (an IC has no "team" to compute alignment for).
  // Pass managerId only when the person is a known manager; otherwise skip the trending call.
  const alignmentQuery = useAlignmentTrend(12, isManager ? teamId : undefined);
  // H9: Scope completion trend to this manager's team when the backend supports it.
  const completionQuery = useCompletionTrend(12, isManager ? teamId : undefined);
  // H9: Displacement endpoint does not yet accept a managerId filter — data shown is org-wide.
  // TODO: add managerId support to GET /api/v1/observatory/displacement and pass teamId here.
  const displacementQuery = useDisplacementReport(12);
  const carryQuery = useCarryChains(cycleId);
  // Fetch all cycle commitments so the Team Members list shows every report,
  // not just the manager's own entries. PersonDetailLevel re-filters by userId.
  const commitmentsQuery = useCommitments(cycleId);
  // Fetch the full user list so we can identify direct reports by reportsTo = teamId.
  const usersQuery = useUserList();

  const isLoading =
    healthQuery.isLoading || alignmentQuery.isLoading || completionQuery.isLoading ||
    displacementQuery.isLoading || carryQuery.isLoading ||
    commitmentsQuery.isLoading || usersQuery.isLoading;

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        <SkeletonLoader variant="card" count={4} />
      </div>
    );
  }

  const commitments = commitmentsQuery.data ?? [];
  const managerName = managerUnit?.managerName
    ?? commitments[0]?.userDisplayName
    ?? 'Team';

  const alignmentData = alignmentQuery.data ?? [];
  const completionData = completionQuery.data ?? [];
  const displacementData = displacementQuery.data ?? { totalDisplacements: 0, byCategory: [], weeklyTrend: {} };
  const carryChains = carryQuery.data ?? [];

  // H11: For non-managers, alignment trend data is org-wide and not meaningful for an IC.
  const latestAlignment = isManager && alignmentData.length > 0 ? alignmentData[alignmentData.length - 1] : null;
  const strategicPct = latestAlignment?.strategicPct ?? managerUnit?.strategicAlignmentPct;

  // Derive the set of direct reports using the user list (reportsTo === teamId).
  const allUsers = usersQuery.data ?? [];
  const directReports = allUsers.filter((u) => u.reportsTo === teamId && u.isActive);
  const directReportIds = new Set(directReports.map((u) => u.id));

  // H10: Filter carry chains to only include commitments belonging to this team.
  const teamMemberIds = directReportIds.size > 0 ? directReportIds : new Set(commitments.map((c) => c.userId));
  const teamCarryChains = carryChains.filter((chain) => teamMemberIds.has(chain.userId));
  const carryForwardCount = teamCarryChains.length;

  // Group commitments by person for click-through.
  // Seed the map from directReports so members with zero commitments are still shown.
  const byPerson = new Map<string, { name: string; count: number }>();
  for (const u of directReports) {
    byPerson.set(u.id, { name: u.displayName, count: 0 });
  }
  for (const c of commitments) {
    if (byPerson.has(c.userId)) {
      byPerson.get(c.userId)!.count += 1;
    }
  }

  const gradeColor: Record<string, 'on-track' | 'watch' | 'at-risk'> = {
    GREEN: 'on-track',
    YELLOW: 'watch',
    RED: 'at-risk',
  };

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-headline text-on-surface font-normal">{managerName}</h1>
          {managerUnit?.grade && (
            <Badge variant="status" color={gradeColor[managerUnit.grade] ?? 'on-track'}>
              {managerUnit.grade}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-body text-on-surface-variant">
          {strategicPct != null ? `${Math.round(strategicPct)}% rally cry coverage` : 'Rally cry coverage: N/A'}
          {' \u00B7 '}
          {commitments.length} commitments
          {' \u00B7 '}
          {carryForwardCount} carry-forward chain{carryForwardCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Team members — click to drill to person */}
      {byPerson.size > 0 && (
        <section className="animate-fade-up" style={{ animationDelay: '40ms' }}>
          <h2 className="text-body font-medium text-on-surface mb-3">Team Members</h2>
          <div className="flex flex-wrap gap-2">
            {[...byPerson.entries()].map(([userId, data]) => (
              <button
                key={userId}
                type="button"
                onClick={() => { onSelectPerson(userId); }}
                className="px-3 py-1.5 text-body bg-surface-lowest rounded-sm hover:bg-surface-container-low transition-colors"
                style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
              >
                <span className="text-on-surface">{data.name}</span>
                <span className="text-muted ml-1.5">({data.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Analytics sections */}
      {/* H11: Only render alignment trend for managers — it's not meaningful for ICs. */}
      {isManager && (
        <Card padding="normal" className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <p className="text-small text-muted mb-2">Strategic alignment over time.</p>
          <AlignmentTrendChart managerId={teamId} weekCount={12} showTarget />
        </Card>
      )}

      <Card padding="normal" className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <p className="text-small text-muted mb-2">Completion rate and carry-forward rate.</p>
        <CompletionTrendChart data={completionData} />
      </Card>

      <Card padding="normal" className="animate-fade-up" style={{ animationDelay: '160ms' }}>
        <p className="text-small text-muted mb-2">Displacement patterns.</p>
        <DisplacementReport summary={displacementData} />
      </Card>

      <Card padding="normal" className="animate-fade-up" style={{ animationDelay: '240ms' }}>
        <p className="text-small text-muted mb-2">Carry-forward chains.</p>
        <CarryForwardChainList chains={teamCarryChains} />
      </Card>

      <Card padding="normal" className="animate-fade-up" style={{ animationDelay: '280ms' }}>
        <p className="text-small text-muted mb-2">Work attribution.</p>
        <DarkWorkAttribution commitments={commitments} />
      </Card>
    </div>
  );
}
