import type { PortfolioData } from '@/types/portfolio.types';

/**
 * Fetch portfolio overview data.
 *
 * Currently returns a hardcoded stub matching the mockup data.
 * Will be replaced by real API calls to /api/v1/observatory/portfolio.
 */
export async function getPortfolioData(_cycleId?: string): Promise<PortfolioData> {
  void _cycleId;

  return {
    narrative: {
      generatedAt: new Date().toISOString(),
      headline: 'Portfolio Intelligence Summary',
      narrative:
        'The portfolio is tracking 3 active companies this quarter. Meridian Manufacturing continues to lead in alignment at 41% strategic with an improving trajectory. Apex Dynamics is the primary concern\u2009\u2014\u2009strategic alignment has dropped 12 points over 4 weeks and carry-forward rate hit 32%, the highest in the portfolio. Cascade Logistics is in early deployment (Week 2), trending positively with 55% strategic alignment but insufficient data for drift analysis.',
      focusAreas: [
        { id: 'f1', text: 'Apex Dynamics: Alignment drift is sustained\u2009\u2014\u2009consider management review' },
        { id: 'f2', text: 'Cascade Logistics: On track but monitor\u2009\u2014\u2009Week 2 data is early' },
        { id: 'f3', text: 'Meridian: Churn Reduction rally cry has zero engineering coverage' },
      ],
    },
    metrics: [
      { key: 'companies', label: 'Active Companies', value: 3 },
      { key: 'alignment', label: 'Avg Strategic Alignment', value: 47, suffix: '%' },
      { key: 'carry', label: 'Portfolio Carry-Forward', value: 19, suffix: '%' },
      { key: 'drift', label: 'Active Drift Signals', value: 4, trend: 'down' },
    ],
    companies: [
      {
        orgId: 'meridian-001',
        name: 'Meridian Manufacturing',
        subtitle: 'Industrial \u00B7 Acquired Q3 2025 \u00B7 Week 6 of deployment',
        healthGrade: 'On Track',
        metrics: { strategicAlignment: 41, coverage: 88, carryForward: 18, completionRate: 72 },
        alignmentTrend: [{ value: 28 }, { value: 36 }, { value: 40 }, { value: 44 }, { value: 46 }, { value: 41 }],
        rallyCries: [
          { name: 'Launch Enterprise Tier', commitmentCount: 12, status: 'on-track' },
          { name: 'Reduce Churn', commitmentCount: 1, status: 'coverage-gap' },
          { name: 'SOC2 Certification', commitmentCount: 5, status: 'on-track' },
        ],
        driftSignals: { count: 2, description: '2 \u2014 Alignment \u2193 Emerging (2 teams)', severity: 'warning' },
      },
      {
        orgId: 'apex-002',
        name: 'Apex Dynamics',
        subtitle: 'Aerospace Components \u00B7 Acquired Q1 2025 \u00B7 Week 14 of deployment',
        healthGrade: 'At Risk',
        metrics: { strategicAlignment: 28, coverage: 62, carryForward: 32, completionRate: 58 },
        alignmentTrend: [
          { value: 40 }, { value: 38 }, { value: 38 }, { value: 36 }, { value: 34 },
          { value: 34 }, { value: 32 }, { value: 30 }, { value: 28 }, { value: 26 },
          { value: 24 }, { value: 24 }, { value: 22 }, { value: 28 },
        ],
        rallyCries: [
          { name: 'Supply Chain Modernization', commitmentCount: 8, status: 'behind' },
          { name: 'Quality Systems Overhaul', commitmentCount: 3, status: 'stalled' },
          { name: 'Revenue Diversification', commitmentCount: 0, status: 'flagged' },
        ],
        driftSignals: { count: 3, description: '3 \u2014 Alignment \u2193 Sustained, Velocity \u2193 Emerging, Coverage \u2193 Sustained', severity: 'warning' },
      },
      {
        orgId: 'cascade-003',
        name: 'Cascade Logistics',
        subtitle: 'Last-Mile Delivery \u00B7 Acquired Q4 2025 \u00B7 Week 2 of deployment',
        healthGrade: 'On Track',
        metrics: { strategicAlignment: 55, coverage: 74, carryForward: 8, completionRate: 85 },
        alignmentTrend: [{ value: 48 }, { value: 55 }],
        rallyCries: [
          { name: 'Route Optimization Platform', commitmentCount: 6, status: 'on-track' },
          { name: 'Driver Retention', commitmentCount: 4, status: 'on-track' },
        ],
        driftSignals: { count: 0, description: '0 \u2014 Insufficient data (< 4 weeks)', severity: 'muted' },
      },
    ],
    comparison: [
      {
        orgId: 'meridian-001', name: 'Meridian Manufacturing', weeksActive: 6,
        alignment: 41, trend: 'down', trendLabel: 'Slight', coverage: 88,
        carryForward: 18, driftSignals: 2, healthGrade: 'On Track',
      },
      {
        orgId: 'apex-002', name: 'Apex Dynamics', weeksActive: 14,
        alignment: 28, trend: 'down', trendLabel: 'Declining', coverage: 62,
        carryForward: 32, driftSignals: 3, healthGrade: 'At Risk',
      },
      {
        orgId: 'cascade-003', name: 'Cascade Logistics', weeksActive: 2,
        alignment: 55, trend: 'up', trendLabel: 'Rising', coverage: 74,
        carryForward: 8, driftSignals: 0, healthGrade: 'On Track',
      },
    ],
  };
}
