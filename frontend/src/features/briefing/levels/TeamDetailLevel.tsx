/**
 * Level 2: Team detail — adapted from TeamDrillDown.
 * Shows alignment trends, completion, cost impact, displacement, carry-forward chains.
 */
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCurrentCycle } from '@/hooks/useCycle';
import {
  useAlignmentTrend,
  useCompletionTrend,
  useCostImpact,
  useDisplacementReport,
  useCarryChains,
  useExecutiveHealth,
} from '@/hooks/useObservatory';
import { useCommitments } from '@/hooks/useCommitments';
import { AlignmentTrendChart } from '@/features/observatory/AlignmentTrendChart';
import { CompletionTrendChart } from '@/features/observatory/CompletionTrendChart';
import { CostImpactTable } from '@/features/observatory/CostImpactTable';
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

  // Determine if this is a known manager (in health units) or just a person
  const healthUnits = healthQuery.data?.units ?? [];
  const managerUnit = healthUnits.find((u) => u.managerId === teamId);
  const isManager = Boolean(managerUnit);

  // Only pass managerId to alignment trend if this is an actual manager —
  // the backend returns errors for non-manager user IDs
  const alignmentQuery = useAlignmentTrend(12, isManager ? teamId : undefined);
  const completionQuery = useCompletionTrend(12);
  const costQuery = useCostImpact(cycleId || undefined);
  const displacementQuery = useDisplacementReport(12);
  const carryQuery = useCarryChains(cycleId);
  const commitmentsQuery = useCommitments(cycleId, teamId ? { userId: teamId } : undefined);

  const isLoading =
    healthQuery.isLoading || alignmentQuery.isLoading || completionQuery.isLoading ||
    costQuery.isLoading || displacementQuery.isLoading || carryQuery.isLoading || commitmentsQuery.isLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><LoadingSpinner size="lg" label="Loading team data..." /></div>;
  }

  // Resolve name from health units or from commitments
  const commitments = commitmentsQuery.data ?? [];
  const managerName = managerUnit?.managerName
    ?? commitments[0]?.userDisplayName
    ?? 'Team';

  const alignmentData = alignmentQuery.data ?? [];
  const completionData = completionQuery.data ?? [];
  const costSignals = costQuery.data ?? [];
  const displacementData = displacementQuery.data ?? { totalDisplacements: 0, byCategory: [], weeklyTrend: {} };
  const carryChains = carryQuery.data ?? [];

  const latestAlignment = alignmentData.length > 0 ? alignmentData[alignmentData.length - 1] : null;
  const strategicPct = latestAlignment?.strategicPct ?? managerUnit?.strategicAlignmentPct;
  const carryForwardCount = carryChains.length;

  // Group commitments by person for click-through
  const byPerson = new Map<string, { name: string; count: number }>();
  for (const c of commitments) {
    if (!byPerson.has(c.userId)) byPerson.set(c.userId, { name: c.userDisplayName, count: 0 });
    byPerson.get(c.userId)!.count += 1;
  }

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-50">{managerName}</h1>
          {managerUnit?.grade && <Badge variant={managerUnit.grade === 'RED' ? 'red' : managerUnit.grade === 'YELLOW' ? 'yellow' : 'green'}>{managerUnit.grade}</Badge>}
        </div>
        <p className="mt-2 text-sm text-gray-400">
          {strategicPct != null ? `${Math.round(strategicPct)}% strategic alignment` : 'Strategic alignment: N/A'}
          {' \u00B7 '}
          {commitments.length} commitments
          {' \u00B7 '}
          {carryForwardCount} carry-forward chain{carryForwardCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Team members — click to drill to person */}
      {byPerson.size > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Team Members</h2>
          <div className="flex flex-wrap gap-2">
            {[...byPerson.entries()].map(([userId, data]) => (
              <button
                key={userId}
                type="button"
                onClick={() => { onSelectPerson(userId); }}
                className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition-colors"
              >
                <span className="text-gray-200">{data.name}</span>
                <span className="text-gray-500 ml-1.5">({data.count})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Analytics sections */}
      <section>
        <p className="text-xs text-gray-500 mb-2">Strategic alignment over time.</p>
        <AlignmentTrendChart {...(isManager ? { managerId: teamId } : {})} weekCount={12} showTarget />
      </section>

      <section>
        <p className="text-xs text-gray-500 mb-2">Completion rate and carry-forward rate.</p>
        <CompletionTrendChart data={completionData} />
      </section>

      <section>
        <p className="text-xs text-gray-500 mb-2">Cost-weighted misalignment.</p>
        <CostImpactTable signals={costSignals} />
      </section>

      <section>
        <p className="text-xs text-gray-500 mb-2">Displacement patterns.</p>
        <DisplacementReport summary={displacementData} />
      </section>

      <section>
        <p className="text-xs text-gray-500 mb-2">Carry-forward chains.</p>
        <CarryForwardChainList chains={carryChains} />
      </section>

      <section>
        <p className="text-xs text-gray-500 mb-2">Work attribution.</p>
        <DarkWorkAttribution commitments={commitments} />
      </section>
    </div>
  );
}
