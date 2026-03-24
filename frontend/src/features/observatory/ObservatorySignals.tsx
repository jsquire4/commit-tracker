import { useAlignmentTrend, useCompletionTrend, useDisplacementReport, useDriftReport, useObservatoryConfig } from '@/hooks/useObservatory';
import type { AlignmentDataPoint, CompletionDataPoint, DisplacementSummary, DriftReport } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignalMetric {
  value: string;
  label: string;
}

interface SignalCard {
  type: string;
  detectedLabel: string;
  title: string;
  body: string;
  metrics: SignalMetric[];
}

// ─── Signal derivation helpers ────────────────────────────────────────────────

export function deriveDriftSignal(drift: DriftReport | undefined): SignalCard | null {
  if (!drift || drift.signals.length === 0) return null;

  const structural = drift.signals.filter((s) => s.severity === 'STRUCTURAL');
  const sustained = drift.signals.filter((s) => s.severity === 'SUSTAINED');
  const emerging = drift.signals.filter((s) => s.severity === 'EMERGING');

  const worstSignal = structural[0] ?? sustained[0] ?? emerging[0];
  if (!worstSignal) return null;

  const weekCount = worstSignal.weekCount;
  const isImproving = worstSignal.trendDirection === 'IMPROVING';
  const detectedLabel = `Detected W${String(weekCount)} · ${isImproving ? 'Partially recovered' : 'Ongoing'}`;

  const avgCurrent =
    drift.signals.reduce((sum, s) => sum + s.currentValue, 0) / drift.signals.length;
  const avgBaseline =
    drift.signals.reduce((sum, s) => sum + s.baselineValue, 0) / drift.signals.length;

  return {
    type: 'Drift Pattern',
    detectedLabel,
    title: `${structural.length > 0 ? 'Structural drift' : 'Sustained drift'} across ${String(drift.signals.length)} signal${drift.signals.length !== 1 ? 's' : ''}`,
    body: `Alignment deviation relative to baseline observed across reporting period. ${worstSignal.unitName} shows the most sustained pattern.`,
    metrics: [
      { value: String(drift.signals.length), label: 'Active signals' },
      { value: `${Math.round(avgCurrent)}%`, label: 'Current avg' },
      { value: `${Math.round(avgBaseline)}%`, label: 'Baseline avg' },
    ],
  };
}

export function deriveLowStrategicSignal(alignment: AlignmentDataPoint[] | undefined, strategicAlignmentTarget: number): SignalCard | null {
  if (!alignment || alignment.length < 2) return null;

  const recent = alignment.slice(-4);
  const avgStrategic =
    recent.reduce((sum, p) => sum + p.strategicPct, 0) / recent.length;
  const avgOperational =
    recent.reduce((sum, p) => sum + p.operationalPct, 0) / recent.length;
  const avgTotal = recent.reduce((sum, p) => sum + p.totalCommitments, 0) / recent.length;

  if (avgStrategic >= strategicAlignmentTarget) return null;

  const weekLabel = alignment[alignment.length - 1]?.cycleLabel ?? 'recent';

  return {
    type: 'Strategic Alignment',
    detectedLabel: `Detected ${weekLabel} · Active`,
    title: 'Low Strategic Alignment in recent cycles',
    body: 'A significant share of commitments fall outside strategic categories. Operational and defensive work is absorbing capacity.',
    metrics: [
      { value: `${Math.round(avgStrategic)}%`, label: 'Strategic avg' },
      { value: `${Math.round(avgOperational)}%`, label: 'Operational avg' },
      { value: Math.round(avgTotal).toLocaleString(), label: 'Avg commitments' },
    ],
  };
}

export function deriveWorkDistributionSignal(
  completion: CompletionDataPoint[] | undefined,
  darkWorkWarningPct: number,
): SignalCard | null {
  if (!completion || completion.length < 2) return null;

  const recent = completion.slice(-4);
  const avgCarry =
    recent.reduce((sum, p) => sum + p.carryForwardRate, 0) / recent.length;
  const avgNotStarted =
    recent.reduce((sum, p) => sum + p.notStartedRate, 0) / recent.length;
  const avgCompletion =
    recent.reduce((sum, p) => sum + p.completionRate, 0) / recent.length;

  if (avgCarry + avgNotStarted < darkWorkWarningPct) return null;

  const weekLabel = completion[completion.length - 1]?.cycleLabel ?? 'recent';

  return {
    type: 'Work Distribution',
    detectedLabel: `Detected ${weekLabel} · Ongoing`,
    title: 'Carry-forward and unstarted work accumulating',
    body: 'A meaningful portion of committed work is not completing within the cycle. Carry-forward chains are lengthening across teams.',
    metrics: [
      { value: `${Math.round(avgCompletion)}%`, label: 'Completion' },
      { value: `${Math.round(avgCarry)}%`, label: 'Carry-forward' },
      { value: `${Math.round(avgNotStarted)}%`, label: 'Not started' },
    ],
  };
}

export function deriveDisplacementSignal(displacement: DisplacementSummary | undefined): SignalCard | null {
  if (!displacement || displacement.totalDisplacements === 0) return null;

  const topCategory = displacement.byCategory[0];
  const weekKeys = Object.keys(displacement.weeklyTrend).sort();
  const recentWeek = weekKeys[weekKeys.length - 1];
  const recentCount = recentWeek ? (displacement.weeklyTrend[recentWeek] ?? 0) : 0;

  const detectedLabel = topCategory
    ? `${topCategory.category.replace(/_/g, ' ')} · ${topCategory.percentage.toFixed(0)}% of events`
    : 'Detected · Active';

  return {
    type: 'Displacement Cascade',
    detectedLabel,
    title: `${String(displacement.totalDisplacements)} displacement event${displacement.totalDisplacements !== 1 ? 's' : ''} across reporting period`,
    body: 'Commitments are being displaced from their original cycles. The pattern suggests recurring capacity or priority conflicts.',
    metrics: [
      { value: String(displacement.totalDisplacements), label: 'Total events' },
      { value: String(displacement.byCategory.length), label: 'Categories' },
      { value: String(recentCount), label: 'Most recent cycle' },
    ],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricBox({ value, label }: SignalMetric) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[1.125rem] font-semibold text-on-surface tabular-nums leading-none"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
      <span className="text-[0.6875rem] text-on-surface-variant leading-tight">{label}</span>
    </div>
  );
}

function SignalCardView({ card }: { card: SignalCard }) {
  return (
    <div
      className="bg-surface-lowest border border-outline-variant rounded-lg flex flex-col border-l-[3px] border-l-on-surface-variant"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-0">
        <span className="label-caps text-on-surface-variant">{card.type}</span>
        <span
          className="text-[0.6875rem] text-on-surface-variant rounded-full px-2 py-0.5 leading-none"
          style={{ background: 'var(--color-surface-container)' }}
        >
          {card.detectedLabel}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-1">
        <h3
          className="font-serif text-on-surface leading-snug"
          style={{ fontSize: '0.9375rem', fontWeight: 600 }}
        >
          {card.title}
        </h3>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="text-[0.75rem] text-on-surface-variant leading-relaxed">{card.body}</p>
      </div>

      {/* Footer metrics */}
      <div
        className="px-4 py-3 flex items-start gap-5 border-t"
        style={{ borderColor: 'var(--color-surface-container)' }}
      >
        {card.metrics.map((m) => (
          <MetricBox key={m.label} value={m.value} label={m.label} />
        ))}
      </div>
    </div>
  );
}

function EmptySignals() {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-on-surface-variant">No active signals detected for this period.</p>
    </div>
  );
}

function SignalSkeleton() {
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-4 animate-pulse space-y-3"
      style={{ borderLeft: '3px solid var(--color-surface-container-high)' }}>
      <div className="h-3 w-32 rounded shimmer" />
      <div className="h-4 w-3/4 rounded shimmer" />
      <div className="h-3 w-full rounded shimmer" />
      <div className="h-3 w-5/6 rounded shimmer" />
      <div className="flex gap-5 pt-2 border-t" style={{ borderColor: 'var(--color-surface-container)' }}>
        <div className="h-6 w-12 rounded shimmer" />
        <div className="h-6 w-12 rounded shimmer" />
        <div className="h-6 w-12 rounded shimmer" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ObservatorySignalsProps {
  weekCount: number;
}

export function ObservatorySignals({ weekCount }: ObservatorySignalsProps) {
  const { data: drift, isLoading: driftLoading } = useDriftReport(weekCount);
  const { data: alignment, isLoading: alignmentLoading } = useAlignmentTrend(weekCount);
  const { data: completion, isLoading: completionLoading } = useCompletionTrend(weekCount);
  const { data: displacement, isLoading: displacementLoading } = useDisplacementReport(weekCount);
  const { data: config } = useObservatoryConfig();

  const strategicAlignmentTarget = config ? parseFloat(config.strategicAlignmentTarget) : 50;
  const darkWorkWarningPct = config ? parseFloat(config.darkWorkWarningPct) : 20;

  const isLoading = driftLoading || alignmentLoading || completionLoading || displacementLoading;

  const cards: SignalCard[] = [];
  if (!isLoading) {
    const driftCard = deriveDriftSignal(drift);
    const specificityCard = deriveLowStrategicSignal(alignment, strategicAlignmentTarget);
    const distributionCard = deriveWorkDistributionSignal(completion, darkWorkWarningPct);
    const displacementCard = deriveDisplacementSignal(displacement);

    if (driftCard) cards.push(driftCard);
    if (specificityCard) cards.push(specificityCard);
    if (distributionCard) cards.push(distributionCard);
    if (displacementCard) cards.push(displacementCard);
  }

  return (
    <div>
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '12px',
          }}
        >
          <SignalSkeleton />
          <SignalSkeleton />
        </div>
      ) : cards.length === 0 ? (
        <EmptySignals />
      ) : (
        <div
          className="animate-stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '12px',
          }}
        >
          {cards.map((card) => (
            <SignalCardView key={card.type} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
