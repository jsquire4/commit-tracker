import { Badge } from '@/components/Badge';
import type { DriftSignal, DriftSeverity, DriftMetric } from '@/types';

interface DriftSignalListProps {
  signals: DriftSignal[];
}

const severityOrder: Record<DriftSeverity, number> = {
  STRUCTURAL: 0,
  SUSTAINED: 1,
  EMERGING: 2,
};

const severityVariant: Record<DriftSeverity, 'red' | 'yellow'> = {
  STRUCTURAL: 'red',
  SUSTAINED: 'yellow',
  EMERGING: 'yellow',
};

const severityBorderColor: Record<DriftSeverity, string> = {
  STRUCTURAL: 'border-l-error',
  SUSTAINED: 'border-l-warning',
  EMERGING: 'border-l-warning/60',
};

const metricVariant: Record<DriftMetric, 'blue' | 'green' | 'gray'> = {
  ALIGNMENT: 'blue',
  VELOCITY: 'green',
  COVERAGE: 'gray',
};

const trendLabel: Record<string, string> = {
  IMPROVING: '\u2191 Improving',
  FLAT: '\u2192 Flat',
  DECLINING: '\u2193 Declining',
};

const trendColor: Record<string, string> = {
  IMPROVING: 'text-accent',
  FLAT: 'text-muted',
  DECLINING: 'text-error',
};

export function DriftSignalList({ signals }: DriftSignalListProps) {
  const sorted = [...signals].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-on-surface">
        Active Drift Signals
        <span className="ml-2 text-sm font-normal text-muted">
          ({signals.length})
        </span>
      </h2>
      <div className="space-y-2 animate-stagger">
        {sorted.map((signal, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${signal.unitId}-${signal.metric}-${idx}`}
            className={`rounded-lg border border-outline-variant border-l-4 ${severityBorderColor[signal.severity]} bg-surface-lowest px-4 py-3`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-medium text-on-surface">
                {signal.unitName}
              </span>
              <Badge variant={metricVariant[signal.metric]}>{signal.metric}</Badge>
              <Badge variant={severityVariant[signal.severity]}>{signal.severity}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              <span>
                Current:{' '}
                <span className="font-medium text-on-surface-variant">
                  {String(Math.round(signal.currentValue))}%
                </span>
              </span>
              <span>
                Baseline:{' '}
                <span className="font-medium text-on-surface-variant">
                  {String(Math.round(signal.baselineValue))}%
                </span>
              </span>
              <span>
                {signal.weekCount}w trending
              </span>
              <span className={trendColor[signal.trendDirection] ?? 'text-muted'}>
                {trendLabel[signal.trendDirection] ?? signal.trendDirection}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
