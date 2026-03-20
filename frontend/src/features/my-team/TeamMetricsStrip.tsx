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
  carryForwardRate: number;
  unlinkedCommitments: number;
}

export function TeamMetricsStrip({
  teamSize,
  rallyCryCoverage,
  carryForwardRate,
  unlinkedCommitments,
}: TeamMetricsStripProps) {
  return (
    <div className="grid grid-cols-4 gap-4 max-[768px]:grid-cols-2">
      <MetricCard value={teamSize} label="Team Size" index={0} />
      <MetricCard value={rallyCryCoverage} label="Rally Cry Coverage" suffix="%" colorClass="text-accent" index={1} />
      <MetricCard value={carryForwardRate} label="Carry-Forward Rate" suffix="%" colorClass="text-warning" index={2} />
      <MetricCard value={unlinkedCommitments} label="Unlinked Commitments" colorClass={unlinkedCommitments > 0 ? 'text-warning' : 'text-on-surface'} index={3} />
    </div>
  );
}
