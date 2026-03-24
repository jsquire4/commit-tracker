import type { ExecutiveHealthResponse } from '@/types/observatory.types';
import {
  HEALTH_COLORS,
  gradeFromAlignment,
  formatWeekLabel,
  trendArrow,
  trendArrowColor,
} from './health.utils';

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  variant,
}: {
  value: string;
  label: string;
  variant: 'neutral' | 'warning' | 'success';
}) {
  const borderClass = variant === 'warning'
    ? 'border-warning/30'
    : variant === 'success'
      ? 'border-accent/30'
      : 'border-outline-variant';

  const valueClass = variant === 'warning'
    ? 'text-warning'
    : variant === 'success'
      ? 'text-accent'
      : 'text-on-surface';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${borderClass} bg-surface-container`}>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

// ─── HeadlineStrip ────────────────────────────────────────────────────────────

interface HeadlineStripProps {
  health: ExecutiveHealthResponse;
}

export function HeadlineStrip({ health }: HeadlineStripProps) {
  const alignGrade = gradeFromAlignment(health.strategicAlignmentPct);
  const alignColor = HEALTH_COLORS[alignGrade];

  const decliningCount = health.units.filter((u) => u.trendDirection.toUpperCase() === 'DECLINING').length;
  const improvingCount = health.units.filter((u) => u.trendDirection.toUpperCase() === 'IMPROVING').length;
  const overallTrend = improvingCount > decliningCount
    ? 'IMPROVING'
    : decliningCount > improvingCount
      ? 'DECLINING'
      : 'FLAT';

  return (
    <div className="flex items-center justify-between h-20 px-6 bg-surface-lowest/85 backdrop-blur-sm border-b border-outline-variant">
      {/* Left: Rally Cry Coverage headline */}
      <div className="flex items-center gap-3">
        <span
          className="text-5xl font-bold tabular-nums tracking-tight"
          style={{ color: alignColor, fontVariantNumeric: 'tabular-nums' }}
        >
          {health.strategicAlignmentPct.toFixed(1)}%
        </span>
        <div className="flex flex-col">
          <span className={`text-lg font-semibold ${trendArrowColor(overallTrend)}`}>
            {trendArrow(overallTrend)}
          </span>
          <span className="text-xs text-muted uppercase tracking-wider">
            Rally Cry Coverage
          </span>
        </div>
      </div>

      {/* Center: Secondary metric pills */}
      <div className="hidden md:flex items-center gap-3">
        <StatPill
          value={`${String(Math.round(health.completionRate))}%`}
          label="Completion"
          variant="neutral"
        />
        <StatPill
          value={`${health.carryForwardRate.toFixed(1)}%`}
          label="Carry-Forward"
          variant={health.carryForwardRate > 10 ? 'warning' : 'neutral'}
        />
        <StatPill
          value={String(health.activeDriftSignals)}
          label="Drift Signals"
          variant={health.activeDriftSignals > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Right: Org name + week label */}
      <div className="text-right">
        <p className="text-sm font-medium text-on-surface-variant">{health.orgName}</p>
        <p className="text-xs text-muted">{formatWeekLabel(health.computedAt)}</p>
      </div>
    </div>
  );
}
