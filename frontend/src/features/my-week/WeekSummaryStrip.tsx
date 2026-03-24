import { useMemo } from 'react';
import { useCountUp } from '@/hooks/useMotion';
import type { Commitment } from '@/types';
import type { GrowthArea } from '@/types';

interface WeekSummaryStripProps {
  commitments: Commitment[];
  growthAreas: GrowthArea[];
  cycleId: string | undefined;
}

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  isLoading?: boolean;
}

function MetricCard({ label, value, suffix, isLoading }: MetricCardProps) {
  const display = useCountUp(isLoading ? 0 : value);

  if (isLoading) {
    return (
      <div className="bg-surface-lowest rounded-sm p-3 flex flex-col gap-1">
        <div className="h-3 w-20 bg-surface-container-low rounded animate-pulse" />
        <div className="h-7 w-12 bg-surface-container-low rounded animate-pulse mt-1" />
      </div>
    );
  }

  return (
    <div className="bg-surface-lowest rounded-sm p-3 flex flex-col gap-1">
      <span className="text-[0.625rem] text-muted uppercase tracking-[0.06em] font-medium leading-none">
        {label}
      </span>
      <span className="font-serif text-2xl text-on-surface font-normal leading-none tabular-nums">
        {display}{suffix}
      </span>
    </div>
  );
}

export function WeekSummaryStripSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <MetricCard key={i} label="" value={0} isLoading />
      ))}
    </div>
  );
}

export function WeekSummaryStrip({ commitments, growthAreas }: WeekSummaryStripProps) {
  const stats = useMemo(() => {
    const total = commitments.length;

    // Count of unique growth areas touched across this week's commitments
    const touchedAreaIds = new Set<string>();
    for (const c of commitments) {
      for (const id of c.growthAreaIds) {
        touchedAreaIds.add(id);
      }
    }
    const growthAreasTouched = touchedAreaIds.size;

    // Personal alignment: % of commitments with ≥1 growth area
    const personalAlignmentCount = commitments.filter((c) => c.growthAreaIds.length > 0).length;
    const personalAlignmentPct =
      total > 0 ? Math.round((personalAlignmentCount / total) * 100) : 0;

    // Rally cry coverage: % linked to a rally cry
    const linkedCount = commitments.filter((c) => Boolean(c.rcdoLink.rallyCryId)).length;
    const rallyCryCoveragePct =
      total > 0 ? Math.round((linkedCount / total) * 100) : 0;

    return {
      total,
      growthAreasTouched,
      personalAlignmentPct,
      rallyCryCoveragePct,
    };
  }, [commitments]);

  if (commitments.length === 0 && growthAreas.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard label="Commitments" value={stats.total} />
      <MetricCard label="Growth Areas Touched" value={stats.growthAreasTouched} />
      <MetricCard label="Growth Alignment" value={stats.personalAlignmentPct} suffix="%" />
      <MetricCard label="Org Alignment" value={stats.rallyCryCoveragePct} suffix="%" />
    </div>
  );
}
