/**
 * PortfolioMetricsStrip — 4-card grid: Active Companies, Avg Strategic Alignment,
 * Portfolio Carry-Forward, Active Drift Signals. Count-up animation.
 */
import { useCountUp } from '@/hooks/useMotion';
import type { PortfolioMetric } from '@/types/portfolio.types';

interface PortfolioMetricsStripProps {
  metrics: PortfolioMetric[];
}

const trendDotClass: Record<string, string> = {
  up: 'bg-accent',
  down: 'bg-warning',
  flat: 'bg-muted',
};

function MetricCard({ metric, index }: { metric: PortfolioMetric; index: number }) {
  const displayValue = useCountUp(metric.value);

  return (
    <div
      className="bg-surface-lowest rounded-sm p-4 animate-fade-up transition-colors hover:bg-surface"
      style={{
        animationDelay: `${(index + 1) * 40}ms`,
        transitionDuration: 'var(--duration-fast, 150ms)',
      }}
    >
      <div className="label-caps text-muted mb-1.5">{metric.label}</div>
      <div className="font-serif text-headline text-on-surface tabular-nums flex items-center gap-2">
        <span>{displayValue}{metric.suffix ?? ''}</span>
        {metric.trend && (
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${trendDotClass[metric.trend] ?? ''}`}
          />
        )}
      </div>
    </div>
  );
}

export function PortfolioMetricsStrip({ metrics }: PortfolioMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <MetricCard key={m.key} metric={m} index={i} />
      ))}
    </div>
  );
}
