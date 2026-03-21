import { useMemo } from 'react';
import { useCountUp } from '@/hooks/useMotion';
import type { Commitment } from '@/types';

interface CommitmentSummaryStripProps {
  commitments: Commitment[];
}

function AnimatedCount({ value }: { value: number }) {
  const display = useCountUp(value);
  return <span className="font-semibold text-on-surface tabular-nums">{display}</span>;
}

export function CommitmentSummaryStrip({ commitments }: CommitmentSummaryStripProps) {
  const stats = useMemo(() => {
    const total = commitments.length;
    const strategic = commitments.filter((c) => c.chessCategoryName === 'Strategic').length;
    const operational = commitments.filter((c) => c.chessCategoryName === 'Operational').length;
    const defensive = commitments.filter((c) => c.chessCategoryName === 'Defensive').length;
    const capability = commitments.filter(
      (c) => c.chessCategoryName === 'Capability Building',
    ).length;
    const linked = commitments.filter((c) => Boolean(c.rcdoLink.rallyCryId)).length;
    const assigned = commitments.filter((c) => c.attribution.kind === 'ASSIGNED_BY').length;

    return { total, strategic, operational, defensive, capability, linked, assigned };
  }, [commitments]);

  if (stats.total === 0) return null;

  const sep = <span className="text-outline-variant text-[0.625rem]">&middot;</span>;

  return (
    <div className="bg-surface-lowest rounded-sm px-5 py-2 text-small text-on-surface-variant flex items-center gap-1.5 tracking-wide">
      <AnimatedCount value={stats.total} />
      <span className="text-muted">{stats.total === 1 ? 'commitment' : 'commitments'}</span>
      {sep}
      {stats.strategic > 0 && (
        <>
          <span className="text-muted">Strategic</span> <AnimatedCount value={stats.strategic} />
          {sep}
        </>
      )}
      {stats.operational > 0 && (
        <>
          <span className="text-muted">Operational</span> <AnimatedCount value={stats.operational} />
          {sep}
        </>
      )}
      {stats.defensive > 0 && (
        <>
          <span className="text-muted">Defensive</span> <AnimatedCount value={stats.defensive} />
          {sep}
        </>
      )}
      {stats.capability > 0 && (
        <>
          <span className="text-muted">Capability</span> <AnimatedCount value={stats.capability} />
          {sep}
        </>
      )}
      <AnimatedCount value={stats.linked} />
      <span className="text-muted">of</span>
      <AnimatedCount value={stats.total} />
      <span className="text-muted">linked</span>
      {stats.assigned > 0 && (
        <>
          {sep}
          <AnimatedCount value={stats.assigned} />
          <span className="text-muted">assigned</span>
        </>
      )}
    </div>
  );
}
