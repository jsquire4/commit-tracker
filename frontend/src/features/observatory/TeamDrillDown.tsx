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

  const alignmentQuery = useAlignmentTrend(12, managerId);
  const completionQuery = useCompletionTrend(12);
  const costQuery = useCostImpact(cycleId || undefined);
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
    alignmentQuery.isLoading ||
    completionQuery.isLoading ||
    costQuery.isLoading ||
    displacementQuery.isLoading ||
    carryQuery.isLoading ||
    commitmentsQuery.isLoading;

  const error =
    alignmentQuery.error ??
    completionQuery.error ??
    costQuery.error ??
    displacementQuery.error ??
    carryQuery.error ??
    commitmentsQuery.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" label="Loading team data…" />
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

  const completionData = completionQuery.data ?? [];
  const costSignals = costQuery.data ?? [];
  const displacementData = displacementQuery.data ?? {
    totalDisplacements: 0,
    byCategory: [],
    weeklyTrend: {},
  };
  const carryChains = carryQuery.data ?? [];
  const commitments = commitmentsQuery.data ?? [];

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link
          to="/observatory"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Observatory
        </Link>
      </div>

      <PageHeader
        title="Team Drill-Down"
        badge={<Badge variant="blue">{managerId ?? 'Unknown'}</Badge>}
      />

      <div className="flex flex-col gap-6">
        <AlignmentTrendChart {...(managerId ? { managerId } : {})} weekCount={12} showTarget />
        <CompletionTrendChart data={completionData} />
        <CostImpactTable signals={costSignals} />
        <DisplacementReport summary={displacementData} />
        <CarryForwardChainList chains={carryChains} />
        <DarkWorkAttribution commitments={commitments} />
      </div>
    </div>
  );
}
