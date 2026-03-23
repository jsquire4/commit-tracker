import { useCountUp } from '@/hooks/useMotion';

interface MetricCardProps {
  value: number;
  label: string;
  suffix?: string;
  colorClass?: string;
  index: number;
}

function MetricCard({ value, label, suffix = '', colorClass = 'text-on-surface', index }: MetricCardProps) {
  const display = useCountUp(value);
  return (
    <div
      className="bg-surface-lowest rounded-sm p-5 text-center animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={`text-[1.75rem] font-semibold tabular-nums ${colorClass}`}>
        {display}{suffix}
      </div>
      <div className="text-small uppercase tracking-[0.05rem] text-muted mt-1">{label}</div>
    </div>
  );
}

interface TeamMetricsStripProps {
  teamSize: number;
  rallyCryCoverage: number;
  carriedForwardCount: number;
  totalCommitments: number;
  unlinkedCommitments: number;
}

export function TeamMetricsStrip({
  teamSize,
  rallyCryCoverage,
  carriedForwardCount,
  totalCommitments,
  unlinkedCommitments,
}: TeamMetricsStripProps) {
  const carryPct = totalCommitments > 0 ? Math.round((carriedForwardCount / totalCommitments) * 100) : 0;

  return (
    <div className="grid grid-cols-4 gap-4 max-[768px]:grid-cols-2">
      <MetricCard value={teamSize} label="Team Size" index={0} />
      <MetricCard value={rallyCryCoverage} label="Rally Cry Coverage" suffix="%" colorClass="text-accent" index={1} />
      <div
        className="bg-surface-lowest rounded-sm p-5 text-center animate-fade-up"
        style={{ animationDelay: '80ms' }}
      >
        <div className={`text-[1.75rem] font-semibold tabular-nums ${carriedForwardCount > 0 ? 'text-warning' : 'text-on-surface'}`}>
          {carriedForwardCount}
        </div>
        <div className="text-small uppercase tracking-[0.05rem] text-muted mt-1">Carried Forward</div>
        <div className="text-xs text-muted mt-0.5">of {totalCommitments} commitments ({carryPct}%)</div>
      </div>
      <MetricCard value={unlinkedCommitments} label="Unlinked Commitments" colorClass={unlinkedCommitments > 0 ? 'text-warning' : 'text-on-surface'} index={3} />
    </div>
  );
}
