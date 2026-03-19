import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useAuth } from '@/hooks/useAuth';
import {
  useAlignmentTrend,
  useCompletionTrend,
  useCostImpact,
  useDisplacementReport,
  useCarryChains,
  useExecutiveHealth,
} from '@/hooks/useObservatory';
import { useCommitments } from '@/hooks/useCommitments';
import { AlignmentTrendChart } from './AlignmentTrendChart';
import { CompletionTrendChart } from './CompletionTrendChart';
import { CostImpactTable } from './CostImpactTable';
import { DisplacementReport } from './DisplacementReport';
import { CarryForwardChainList } from './CarryForwardChainList';
import { DarkWorkAttribution } from './DarkWorkAttribution';
import type { UserRole } from '@/types';

const ALLOWED_ROLES: UserRole[] = ['DIRECTOR', 'VP', 'EXECUTIVE'];

export function TeamDrillDown() {
  const { managerId } = useParams<{ managerId: string }>();
  const { role } = useAuth();

  const { data: cycle, isLoading: cycleLoading } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';

  const healthQuery = useExecutiveHealth();
  const alignmentQuery = useAlignmentTrend(12, managerId);
  // TODO: useCompletionTrend does not accept a managerId — shows org-wide data.
  // Needs backend support to scope by manager (e.g. useCompletionTrend(12, managerId)).
  const completionQuery = useCompletionTrend(12);
  const costQuery = useCostImpact(cycleId || undefined);
  // TODO: useDisplacementReport does not accept a managerId — shows org-wide data.
  // Needs backend support to scope by manager (e.g. useDisplacementReport(12, managerId)).
  const displacementQuery = useDisplacementReport(12);
  const carryQuery = useCarryChains(cycleId);
  const commitmentsQuery = useCommitments(cycleId, managerId ? { userId: managerId } : undefined);

  // Role guard — after all hooks are called (React rules of hooks)
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Observatory access requires Director or above.</p>
      </div>
    );
  }

  const isLoading =
    cycleLoading ||
    healthQuery.isLoading ||
    alignmentQuery.isLoading ||
    completionQuery.isLoading ||
    costQuery.isLoading ||
    displacementQuery.isLoading ||
    carryQuery.isLoading ||
    commitmentsQuery.isLoading;

  const error =
    healthQuery.error ??
    alignmentQuery.error ??
    completionQuery.error ??
    costQuery.error ??
    displacementQuery.error ??
    carryQuery.error ??
    commitmentsQuery.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" label="Loading team data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 dark:text-red-400">
        Failed to load team data. Please try again.
      </div>
    );
  }

  // Resolve manager name from executive health units
  const healthUnits = healthQuery.data?.units ?? [];
  const managerUnit = healthUnits.find((u) => u.managerId === managerId);
  const managerName = managerUnit?.managerName ?? managerId ?? 'Unknown';

  const alignmentData = alignmentQuery.data ?? [];
  const completionData = completionQuery.data ?? [];
  const costSignals = costQuery.data ?? [];
  const displacementData = displacementQuery.data ?? {
    totalDisplacements: 0,
    byCategory: [],
    weeklyTrend: {},
  };
  const carryChains = carryQuery.data ?? [];
  const commitments = commitmentsQuery.data ?? [];

  // Derive narrative summary values
  const latestAlignment = alignmentData.length > 0
    ? alignmentData[alignmentData.length - 1]
    : null;
  const latestCompletion = completionData.length > 0
    ? completionData[completionData.length - 1]
    : null;
  const strategicPct = latestAlignment?.strategicPct ?? managerUnit?.strategicAlignmentPct;
  const completionPct = latestCompletion?.completionRate ?? managerUnit?.completionRate;
  const carryForwardCount = carryChains.length;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link
          to="/observatory"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          &larr; Observatory
        </Link>
      </div>

      <PageHeader
        title="Team Drill-Down"
        badge={<Badge variant="blue">Team: {managerName}</Badge>}
      />

      {/* Narrative summary */}
      <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <span className="font-semibold">{managerName}</span>
          {managerUnit?.role ? ` (${managerUnit.role})` : ''}
          {' — '}
          {strategicPct != null
            ? `Strategic alignment: ${Math.round(strategicPct)}%`
            : 'Strategic alignment: N/A'}
          {' | '}
          {completionPct != null
            ? `Completion: ${Math.round(completionPct)}%`
            : 'Completion: N/A'}
          {' | '}
          Carry-forwards: {carryForwardCount}
          {managerUnit?.grade ? ` | Health grade: ${managerUnit.grade}` : ''}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Shows how your team's work breaks down by category over time. The dashed line is the org target.
          </p>
          <AlignmentTrendChart {...(managerId ? { managerId } : {})} weekCount={12} showTarget />
        </section>

        <section>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Completion rate and carry-forward rate over time.
          </p>
          <CompletionTrendChart data={completionData} />
        </section>

        <section>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Cost-weighted view of time spent on non-strategic work.
          </p>
          <CostImpactTable signals={costSignals} />
        </section>

        <section>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Why work didn't get done — displacement reasons and patterns.
          </p>
          <DisplacementReport summary={displacementData} />
        </section>

        <section>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Work items stuck in carry-forward for multiple weeks.
          </p>
          <CarryForwardChainList chains={carryChains} />
        </section>

        <section>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            How work is distributed between manager-assigned and self-directed.
          </p>
          <DarkWorkAttribution commitments={commitments} />
        </section>
      </div>
    </div>
  );
}
