/** Portfolio page types */

export type HealthGradeLabel = 'On Track' | 'Watch' | 'At Risk';
export type HealthGradeColor = 'teal' | 'amber' | 'rose';
export type PortfolioTrend = 'up' | 'down' | 'flat';

export interface PortfolioMetric {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  trend?: PortfolioTrend;
}

export interface RallyCryStatus {
  name: string;
  commitmentCount: number;
  status: 'on-track' | 'behind' | 'stalled' | 'flagged' | 'coverage-gap';
}

export interface DriftSignalSummary {
  count: number;
  description: string;
  severity: 'warning' | 'muted';
}

export interface CompanyMetrics {
  strategicAlignment: number;
  coverage: number;
  carryForward: number;
  completionRate: number;
}

export interface SparklinePoint {
  value: number;
}

export interface PortfolioCompany {
  orgId: string;
  name: string;
  subtitle: string;
  healthGrade: HealthGradeLabel;
  metrics: CompanyMetrics;
  alignmentTrend: SparklinePoint[];
  rallyCries: RallyCryStatus[];
  driftSignals: DriftSignalSummary;
}

export interface ComparisonRow {
  orgId: string;
  name: string;
  weeksActive: number;
  alignment: number;
  trend: PortfolioTrend;
  trendLabel: string;
  coverage: number;
  carryForward: number;
  driftSignals: number;
  healthGrade: HealthGradeLabel;
}

export interface PortfolioNarrative {
  generatedAt: string;
  headline: string;
  narrative: string;
  focusAreas: { id: string; text: string }[];
}

export interface PortfolioData {
  narrative: PortfolioNarrative;
  metrics: PortfolioMetric[];
  companies: PortfolioCompany[];
  comparison: ComparisonRow[];
}
