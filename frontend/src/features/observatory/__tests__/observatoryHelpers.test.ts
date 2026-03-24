import { describe, it, expect } from 'vitest';
import {
  deriveDriftSignal,
  deriveDisplacementSignal,
  deriveLowStrategicSignal,
  deriveWorkDistributionSignal,
} from '../ObservatorySignals';
import type { DriftReport, DisplacementSummary, AlignmentDataPoint, CompletionDataPoint } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDriftReport(overrides?: Partial<DriftReport>): DriftReport {
  return {
    signals: [
      {
        unitType: 'TEAM',
        unitId: 'unit-1',
        unitName: 'Alpha Team',
        metric: 'ALIGNMENT',
        severity: 'SUSTAINED',
        currentValue: 35,
        baselineValue: 55,
        weekCount: 4,
        trendDirection: 'DECLINING',
        dataPoints: [55, 50, 42, 35],
      },
    ],
    generatedAt: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

function makeDisplacementSummary(overrides?: Partial<DisplacementSummary>): DisplacementSummary {
  return {
    totalDisplacements: 12,
    byCategory: [
      { category: 'PRODUCTION_EMERGENCY', count: 7, percentage: 58.3, topTeams: ['Alpha'] },
      { category: 'SCOPE_CHANGE', count: 5, percentage: 41.7, topTeams: ['Beta'] },
    ],
    weeklyTrend: { '2026-W10': 3, '2026-W11': 5, '2026-W12': 4 },
    ...overrides,
  };
}

function makeAlignmentPoints(count = 5, strategicPct = 40): AlignmentDataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    cycleId: `cycle-${i}`,
    cycleLabel: `W${i + 1}`,
    startsAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    strategicPct,
    operationalPct: 30,
    defensivePct: 20,
    capabilityBuildingPct: 10,
    rallyCoveragePct: 45,
    totalCommitments: 20,
  }));
}

function makeCompletionPoints(count = 5, carryForwardRate = 15, notStartedRate = 10): CompletionDataPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    cycleId: `cycle-${i}`,
    cycleLabel: `W${i + 1}`,
    startsAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    completionRate: 75,
    carryForwardRate,
    notStartedRate,
    totalCommitments: 20,
    reconciledCount: 15,
  }));
}

// ─── deriveDriftSignal ────────────────────────────────────────────────────────

describe('deriveDriftSignal', () => {
  it('returns null for undefined input', () => {
    expect(deriveDriftSignal(undefined)).toBeNull();
  });

  it('returns null when signals array is empty', () => {
    expect(deriveDriftSignal({ signals: [], generatedAt: '2026-03-20T00:00:00Z' })).toBeNull();
  });

  it('returns a SignalCard for a report with sustained signals', () => {
    const card = deriveDriftSignal(makeDriftReport());
    expect(card).not.toBeNull();
    expect(card!.type).toBe('Drift Pattern');
  });

  it('prefers STRUCTURAL severity over SUSTAINED when both are present', () => {
    const report = makeDriftReport({
      signals: [
        {
          unitType: 'TEAM', unitId: 'u1', unitName: 'Alpha', metric: 'ALIGNMENT',
          severity: 'STRUCTURAL', currentValue: 20, baselineValue: 60,
          weekCount: 10, trendDirection: 'DECLINING', dataPoints: [],
        },
        {
          unitType: 'TEAM', unitId: 'u2', unitName: 'Beta', metric: 'ALIGNMENT',
          severity: 'SUSTAINED', currentValue: 35, baselineValue: 55,
          weekCount: 5, trendDirection: 'FLAT', dataPoints: [],
        },
      ],
    });
    const card = deriveDriftSignal(report);
    expect(card!.title).toMatch(/Structural drift/);
  });

  it('uses SUSTAINED label when no structural signal exists', () => {
    const card = deriveDriftSignal(makeDriftReport());
    expect(card!.title).toMatch(/Sustained drift/);
  });

  it('uses EMERGING signal when it is the only severity present', () => {
    const report = makeDriftReport({
      signals: [
        {
          unitType: 'TEAM', unitId: 'u1', unitName: 'Gamma', metric: 'ALIGNMENT',
          severity: 'EMERGING', currentValue: 48, baselineValue: 55,
          weekCount: 2, trendDirection: 'FLAT', dataPoints: [],
        },
      ],
    });
    const card = deriveDriftSignal(report);
    expect(card).not.toBeNull();
    expect(card!.title).toMatch(/Sustained drift/); // no structural → falls through to else
  });

  it('reflects improving trend direction in detectedLabel', () => {
    const report = makeDriftReport({
      signals: [
        {
          unitType: 'TEAM', unitId: 'u1', unitName: 'Alpha', metric: 'ALIGNMENT',
          severity: 'SUSTAINED', currentValue: 50, baselineValue: 45,
          weekCount: 3, trendDirection: 'IMPROVING', dataPoints: [],
        },
      ],
    });
    const card = deriveDriftSignal(report);
    expect(card!.detectedLabel).toMatch(/Partially recovered/);
  });

  it('reflects non-improving trend direction in detectedLabel', () => {
    const card = deriveDriftSignal(makeDriftReport());
    expect(card!.detectedLabel).toMatch(/Ongoing/);
  });

  it('includes correct signal count in title (singular)', () => {
    const card = deriveDriftSignal(makeDriftReport());
    expect(card!.title).toMatch(/1 signal\b/);
  });

  it('includes correct signal count in title (plural)', () => {
    const report = makeDriftReport({
      signals: [
        { unitType: 'TEAM', unitId: 'u1', unitName: 'A', metric: 'ALIGNMENT', severity: 'SUSTAINED', currentValue: 30, baselineValue: 50, weekCount: 3, trendDirection: 'FLAT', dataPoints: [] },
        { unitType: 'TEAM', unitId: 'u2', unitName: 'B', metric: 'ALIGNMENT', severity: 'SUSTAINED', currentValue: 40, baselineValue: 55, weekCount: 3, trendDirection: 'FLAT', dataPoints: [] },
      ],
    });
    const card = deriveDriftSignal(report);
    expect(card!.title).toMatch(/2 signals/);
  });

  it('emits correct metrics: active signals, current avg, baseline avg', () => {
    const report = makeDriftReport({
      signals: [
        { unitType: 'TEAM', unitId: 'u1', unitName: 'A', metric: 'ALIGNMENT', severity: 'SUSTAINED', currentValue: 30, baselineValue: 50, weekCount: 3, trendDirection: 'FLAT', dataPoints: [] },
        { unitType: 'TEAM', unitId: 'u2', unitName: 'B', metric: 'ALIGNMENT', severity: 'SUSTAINED', currentValue: 40, baselineValue: 60, weekCount: 3, trendDirection: 'FLAT', dataPoints: [] },
      ],
    });
    const card = deriveDriftSignal(report);
    expect(card!.metrics).toHaveLength(3);
    expect(card!.metrics[0]).toEqual({ value: '2', label: 'Active signals' });
    expect(card!.metrics[1]).toEqual({ value: '35%', label: 'Current avg' });
    expect(card!.metrics[2]).toEqual({ value: '55%', label: 'Baseline avg' });
  });

  it('handles a signal with zero current and baseline values', () => {
    const report = makeDriftReport({
      signals: [
        { unitType: 'TEAM', unitId: 'u1', unitName: 'A', metric: 'ALIGNMENT', severity: 'EMERGING', currentValue: 0, baselineValue: 0, weekCount: 1, trendDirection: 'FLAT', dataPoints: [] },
      ],
    });
    const card = deriveDriftSignal(report);
    expect(card).not.toBeNull();
    expect(card!.metrics[1]).toEqual({ value: '0%', label: 'Current avg' });
    expect(card!.metrics[2]).toEqual({ value: '0%', label: 'Baseline avg' });
  });
});

// ─── deriveDisplacementSignal ─────────────────────────────────────────────────

describe('deriveDisplacementSignal', () => {
  it('returns null for undefined input', () => {
    expect(deriveDisplacementSignal(undefined)).toBeNull();
  });

  it('returns null when totalDisplacements is zero', () => {
    expect(deriveDisplacementSignal(makeDisplacementSummary({ totalDisplacements: 0 }))).toBeNull();
  });

  it('returns a SignalCard for a non-zero displacement summary', () => {
    const card = deriveDisplacementSignal(makeDisplacementSummary());
    expect(card).not.toBeNull();
    expect(card!.type).toBe('Displacement Cascade');
  });

  it('uses top category as detectedLabel', () => {
    const card = deriveDisplacementSignal(makeDisplacementSummary());
    // top category is PRODUCTION_EMERGENCY at 58% — underscores replaced with spaces
    expect(card!.detectedLabel).toMatch(/PRODUCTION EMERGENCY/);
    expect(card!.detectedLabel).toMatch(/58%/);
  });

  it('falls back to generic detectedLabel when byCategory is empty', () => {
    const summary = makeDisplacementSummary({ byCategory: [] });
    const card = deriveDisplacementSignal(summary);
    expect(card!.detectedLabel).toBe('Detected · Active');
  });

  it('emits singular title for exactly one displacement', () => {
    const summary = makeDisplacementSummary({ totalDisplacements: 1 });
    const card = deriveDisplacementSignal(summary);
    expect(card!.title).toMatch(/1 displacement event\b/);
    expect(card!.title).not.toMatch(/events/);
  });

  it('emits plural title for multiple displacements', () => {
    const card = deriveDisplacementSignal(makeDisplacementSummary());
    expect(card!.title).toMatch(/12 displacement events/);
  });

  it('picks the most recent week count from weeklyTrend', () => {
    const card = deriveDisplacementSignal(makeDisplacementSummary());
    // weeks sorted: W10, W11, W12 → most recent = W12 with count 4
    const recentMetric = card!.metrics.find((m) => m.label === 'Most recent cycle');
    expect(recentMetric?.value).toBe('4');
  });

  it('reports 0 for most recent cycle when weeklyTrend is empty', () => {
    const summary = makeDisplacementSummary({ weeklyTrend: {} });
    const card = deriveDisplacementSignal(summary);
    const recentMetric = card!.metrics.find((m) => m.label === 'Most recent cycle');
    expect(recentMetric?.value).toBe('0');
  });

  it('emits correct metrics structure', () => {
    const card = deriveDisplacementSignal(makeDisplacementSummary());
    expect(card!.metrics).toHaveLength(3);
    expect(card!.metrics[0]).toEqual({ value: '12', label: 'Total events' });
    expect(card!.metrics[1]).toEqual({ value: '2', label: 'Categories' });
  });
});

// ─── deriveLowStrategicSignal ─────────────────────────────────────────────────

describe('deriveLowStrategicSignal', () => {
  it('returns null for undefined input', () => {
    expect(deriveLowStrategicSignal(undefined, 50)).toBeNull();
  });

  it('returns null when fewer than 2 data points are provided', () => {
    expect(deriveLowStrategicSignal(makeAlignmentPoints(1), 50)).toBeNull();
  });

  it('returns null when recent strategic average meets the target', () => {
    // strategicPct = 60 >= target 50
    const card = deriveLowStrategicSignal(makeAlignmentPoints(5, 60), 50);
    expect(card).toBeNull();
  });

  it('returns a SignalCard when recent strategic average is below target', () => {
    // strategicPct = 40 < target 50
    const card = deriveLowStrategicSignal(makeAlignmentPoints(5, 40), 50);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('Strategic Alignment');
  });

  it('returns null at exact boundary (avgStrategic === target)', () => {
    const card = deriveLowStrategicSignal(makeAlignmentPoints(5, 50), 50);
    expect(card).toBeNull();
  });

  it('emits correct strategic avg metric rounded to nearest integer', () => {
    // Recent 4 points all have strategicPct = 33, avg = 33
    const points = makeAlignmentPoints(5, 33);
    const card = deriveLowStrategicSignal(points, 50);
    const strategicMetric = card!.metrics.find((m) => m.label === 'Strategic avg');
    expect(strategicMetric?.value).toBe('33%');
  });

  it('uses only last 4 data points for the average', () => {
    // First point has high strategic (80), last 4 are low (30) — signal should fire
    const points: AlignmentDataPoint[] = [
      { cycleId: 'c0', cycleLabel: 'W1', startsAt: '2026-01-01T00:00:00Z', strategicPct: 80, operationalPct: 10, defensivePct: 5, capabilityBuildingPct: 5, rallyCoveragePct: 50, totalCommitments: 10 },
      ...makeAlignmentPoints(4, 30),
    ];
    const card = deriveLowStrategicSignal(points, 50);
    expect(card).not.toBeNull();
    const strategicMetric = card!.metrics.find((m) => m.label === 'Strategic avg');
    expect(strategicMetric?.value).toBe('30%');
  });

  it('uses the last cycle label as the detectedLabel week', () => {
    const points = makeAlignmentPoints(5, 40);
    const card = deriveLowStrategicSignal(points, 50);
    // last point's cycleLabel is 'W5'
    expect(card!.detectedLabel).toMatch(/W5/);
  });
});

// ─── deriveWorkDistributionSignal ─────────────────────────────────────────────

describe('deriveWorkDistributionSignal', () => {
  it('returns null for undefined input', () => {
    expect(deriveWorkDistributionSignal(undefined, 20)).toBeNull();
  });

  it('returns null when fewer than 2 data points provided', () => {
    expect(deriveWorkDistributionSignal(makeCompletionPoints(1), 20)).toBeNull();
  });

  it('returns null when carry+notStarted is below warning threshold', () => {
    // carry=5, notStarted=5 → combined=10 < threshold=20
    const card = deriveWorkDistributionSignal(makeCompletionPoints(5, 5, 5), 20);
    expect(card).toBeNull();
  });

  it('returns a SignalCard when carry+notStarted meets or exceeds warning threshold', () => {
    // carry=15, notStarted=10 → combined=25 >= threshold=20
    const card = deriveWorkDistributionSignal(makeCompletionPoints(5, 15, 10), 20);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('Work Distribution');
  });

  it('returns null at exact boundary where combined equals threshold', () => {
    // carry=10, notStarted=10 → combined=20 which is NOT < 20, so card fires
    const card = deriveWorkDistributionSignal(makeCompletionPoints(5, 10, 10), 20);
    expect(card).not.toBeNull();
  });

  it('emits correct carry-forward and not-started metrics', () => {
    const card = deriveWorkDistributionSignal(makeCompletionPoints(5, 15, 10), 20);
    const carryMetric = card!.metrics.find((m) => m.label === 'Carry-forward');
    const notStartedMetric = card!.metrics.find((m) => m.label === 'Not started');
    expect(carryMetric?.value).toBe('15%');
    expect(notStartedMetric?.value).toBe('10%');
  });

  it('uses only last 4 data points to compute averages', () => {
    // First point has very low carry/notStarted, last 4 have high values
    const points: CompletionDataPoint[] = [
      { cycleId: 'c0', cycleLabel: 'W1', startsAt: '2026-01-01T00:00:00Z', completionRate: 95, carryForwardRate: 2, notStartedRate: 1, totalCommitments: 20, reconciledCount: 19 },
      ...makeCompletionPoints(4, 20, 15),
    ];
    const card = deriveWorkDistributionSignal(points, 20);
    expect(card).not.toBeNull();
    const carryMetric = card!.metrics.find((m) => m.label === 'Carry-forward');
    expect(carryMetric?.value).toBe('20%');
  });

  it('emits completion rate metric', () => {
    const card = deriveWorkDistributionSignal(makeCompletionPoints(5, 15, 10), 20);
    const completionMetric = card!.metrics.find((m) => m.label === 'Completion');
    expect(completionMetric?.value).toBe('75%');
  });
});
