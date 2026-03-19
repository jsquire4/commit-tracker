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
  STRUCTURAL: 'border-l-red-500',
  SUSTAINED: 'border-l-amber-500',
  EMERGING: 'border-l-yellow-400',
};

const metricVariant: Record<DriftMetric, 'blue' | 'green' | 'gray'> = {
  ALIGNMENT: 'blue',
  VELOCITY: 'green',
  COVERAGE: 'gray',
};

const trendLabel: Record<string, string> = {
  IMPROVING: '↑ Improving',
  FLAT: '→ Flat',
  DECLINING: '↓ Declining',
};

const trendColor: Record<string, string> = {
  IMPROVING: 'text-green-600 dark:text-green-400',
  FLAT: 'text-gray-500 dark:text-gray-400',
  DECLINING: 'text-red-600 dark:text-red-400',
};

export function DriftSignalList({ signals }: DriftSignalListProps) {
  const sorted = [...signals].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Active Drift Signals
        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
          ({signals.length})
        </span>
      </h2>
      <div className="space-y-2 animate-stagger">
        {sorted.map((signal, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${signal.unitId}-${signal.metric}-${idx}`}
            className={`rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${severityBorderColor[signal.severity]} bg-white dark:bg-gray-900 px-4 py-3`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {signal.unitName}
              </span>
              <Badge variant={metricVariant[signal.metric]}>{signal.metric}</Badge>
              <Badge variant={severityVariant[signal.severity]}>{signal.severity}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Current:{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {String(Math.round(signal.currentValue))}%
                </span>
              </span>
              <span>
                Baseline:{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {String(Math.round(signal.baselineValue))}%
                </span>
              </span>
              <span>
                {signal.weekCount}w trending
              </span>
              <span className={trendColor[signal.trendDirection] ?? 'text-gray-500'}>
                {trendLabel[signal.trendDirection] ?? signal.trendDirection}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
