import { useCountUp } from '@/hooks/useMotion';
import { MetricInfo } from '@/components/MetricInfo';
import { METRIC_DEFINITIONS } from '@/constants/metric-definitions';

interface MetricCardProps {
  value: number;
  label: string;
  suffix?: string;
  colorClass?: string;
  index: number;
  metricKey?: string;
}

function MetricCard({ value, label, suffix = '', colorClass = 'text-on-surface', index, metricKey }: MetricCardProps) {
  const display = useCountUp(value);
  const def = metricKey ? METRIC_DEFINITIONS[metricKey] : null;
  return (
    <div
      className="bg-surface-lowest rounded-sm p-5 text-center animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={`text-[1.75rem] font-semibold tabular-nums ${colorClass}`}>
        {display}{suffix}
      </div>
      <div className="text-small uppercase tracking-[0.05rem] text-muted mt-1 flex items-center justify-center gap-1">
        {label}
        {def && <MetricInfo formula={def.formula} />}
      </div>
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
  const carryDef = METRIC_DEFINITIONS.carriedForward;

  return (
    <div className="grid grid-cols-4 gap-4 max-[768px]:grid-cols-2">
      <MetricCard value={teamSize} label="Team Size" metricKey="teamSize" index={0} />
      <MetricCard value={rallyCryCoverage} label="Rally Cry Coverage" suffix="%" colorClass="text-accent" metricKey="rallyCryCoverage" index={1} />
      <div
        className="bg-surface-lowest rounded-sm p-5 text-center animate-fade-up"
        style={{ animationDelay: '80ms' }}
      >
        <div className={`text-[1.75rem] font-semibold tabular-nums ${carriedForwardCount > 0 ? 'text-warning' : 'text-on-surface'}`}>
          {carriedForwardCount}
        </div>
        <div className="text-small uppercase tracking-[0.05rem] text-muted mt-1 flex items-center justify-center gap-1">
          Carried Forward
          {carryDef && <MetricInfo formula={carryDef.formula} />}
        </div>
        <div className="text-xs text-muted mt-0.5">of {totalCommitments} commitments ({carryPct}%)</div>
      </div>
      <MetricCard value={unlinkedCommitments} label="Unlinked Commitments" colorClass={unlinkedCommitments > 0 ? 'text-warning' : 'text-on-surface'} metricKey="unlinkedCommitments" index={3} />
    </div>
  );
}
