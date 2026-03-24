import { fetchData } from './client';
import type {
  PortfolioData,
  PortfolioCompany,
  PortfolioMetric,
  ComparisonRow,
  HealthGradeLabel,
  RallyCryStatus,
} from '@/types/portfolio.types';

const OBSERVATORY_BASE = '/api/v1/observatory';

interface BackendRallyCrySummary {
  name: string;
  commitmentCount: number;
  status: string;
}

/** Backend PortcoSummary shape */
interface BackendPortcoSummary {
  orgId: string;
  orgName: string;
  overallGrade: 'GREEN' | 'YELLOW' | 'RED';
  strategicAlignmentPct: number;
  rallyCoveragePct: number;
  completionRate: number;
  carryForwardRate: number;
  activeDriftSignals: number;
  headcount: number;
  rallyCries: BackendRallyCrySummary[];
}

interface BackendPortfolioHealth {
  portfolioId: string;
  portfolioName: string;
  portcos: BackendPortcoSummary[];
  computedAt: string;
}

/** Backend trend data */
interface BackendAlignmentDataPoint {
  cycleId: string;
  cycleLabel: string;
  startsAt: string;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  rallyCoveragePct: number;
  totalCommitments: number;
}

interface BackendPortcoTrendLine {
  orgId: string;
  orgName: string;
  dataPoints: BackendAlignmentDataPoint[];
}

interface BackendPortfolioComparison {
  portfolioId: string;
  portfolioName: string;
  trends: BackendPortcoTrendLine[];
}

const GRADE_MAP: Record<string, HealthGradeLabel> = {
  GREEN: 'On Track',
  YELLOW: 'Watch',
  RED: 'At Risk',
};

function mapGrade(grade: string): HealthGradeLabel {
  return GRADE_MAP[grade] ?? 'Watch';
}

/**
 * Fetch portfolio data from real backend endpoints and transform
 * into the PortfolioData shape the frontend expects.
 */
export async function getPortfolioData(): Promise<PortfolioData> {
  // Fetch health data and trend data in parallel
  const [health, comparison] = await Promise.all([
    fetchData<BackendPortfolioHealth>(`${OBSERVATORY_BASE}/portfolio`),
    fetchData<BackendPortfolioComparison>(`${OBSERVATORY_BASE}/portfolio/comparison`, { weekCount: 12 })
      .catch(() => null), // graceful fallback if comparison endpoint not available
  ]);

  const portcos = health.portcos ?? [];
  const trendMap = new Map<string, BackendAlignmentDataPoint[]>();
  if (comparison?.trends) {
    for (const line of comparison.trends) {
      trendMap.set(line.orgId, line.dataPoints);
    }
  }

  // Build aggregate metrics
  const companyCount = portcos.length;
  const avgRallyCoverage = companyCount > 0
    ? Math.round(portcos.reduce((sum, c) => sum + c.rallyCoveragePct, 0) / companyCount)
    : 0;
  const avgCarryForward = companyCount > 0
    ? Math.round(portcos.reduce((sum, c) => sum + c.carryForwardRate, 0) / companyCount)
    : 0;
  const totalDrift = portcos.reduce((sum, c) => sum + c.activeDriftSignals, 0);

  const metrics: PortfolioMetric[] = [
    { key: 'companies', label: 'Active Companies', value: companyCount },
    { key: 'alignment', label: 'Avg Rally Cry Coverage', value: avgRallyCoverage, suffix: '%' },
    { key: 'carry', label: 'Portfolio Carry-Forward', value: avgCarryForward, suffix: '%' },
    { key: 'drift', label: 'Active Drift Signals', value: totalDrift },
  ];

  // Map companies
  const companies: PortfolioCompany[] = portcos.map((c) => {
    const trend = trendMap.get(c.orgId) ?? [];
    return {
      orgId: c.orgId,
      name: c.orgName,
      subtitle: `${c.headcount} people`,
      healthGrade: mapGrade(c.overallGrade),
      metrics: {
        strategicAlignment: Math.round(c.strategicAlignmentPct),
        coverage: Math.round(c.rallyCoveragePct),
        carryForward: Math.round(c.carryForwardRate),
        completionRate: Math.round(c.completionRate),
      },
      alignmentTrend: trend.map((p) => ({ value: Math.round(p.rallyCoveragePct) })),
      rallyCries: (c.rallyCries ?? []).map((rc): RallyCryStatus => ({
        name: rc.name,
        commitmentCount: rc.commitmentCount,
        status: rc.status as RallyCryStatus['status'],
      })),
      driftSignals: {
        count: c.activeDriftSignals,
        description: c.activeDriftSignals > 0
          ? `${c.activeDriftSignals} active signal${c.activeDriftSignals !== 1 ? 's' : ''}`
          : 'No drift signals',
        severity: c.activeDriftSignals > 0 ? 'warning' as const : 'muted' as const,
      },
    };
  });

  // Build comparison table
  const comparisonRows: ComparisonRow[] = portcos.map((c) => {
    const trend = trendMap.get(c.orgId) ?? [];
    const weeksActive = trend.length;

    // Compute trend direction from last 4 data points
    let trendDir: 'up' | 'down' | 'flat' = 'flat';
    let trendLabel = 'Stable';
    if (trend.length >= 2) {
      const recent = trend[trend.length - 1]!.rallyCoveragePct;
      const prior = trend[Math.max(0, trend.length - 4)]!.rallyCoveragePct;
      const delta = recent - prior;
      if (delta > 3) { trendDir = 'up'; trendLabel = 'Rising'; }
      else if (delta < -3) { trendDir = 'down'; trendLabel = 'Declining'; }
    }

    return {
      orgId: c.orgId,
      name: c.orgName,
      weeksActive,
      alignment: Math.round(c.rallyCoveragePct),
      trend: trendDir,
      trendLabel,
      coverage: Math.round(c.rallyCoveragePct),
      carryForward: Math.round(c.carryForwardRate),
      driftSignals: c.activeDriftSignals,
      healthGrade: mapGrade(c.overallGrade),
    };
  });

  return {
    narrative: {
      generatedAt: health.computedAt ?? new Date().toISOString(),
      headline: 'Portfolio Intelligence Summary',
      narrative: `Tracking ${companyCount} active ${companyCount === 1 ? 'company' : 'companies'}. Average rally cry coverage across the portfolio is ${avgRallyCoverage}% with ${totalDrift} active drift signal${totalDrift !== 1 ? 's' : ''}.`,
      focusAreas: portcos
        .filter((c) => c.overallGrade === 'RED' || c.activeDriftSignals >= 2)
        .map((c, i) => ({
          id: `f${i}`,
          text: `${c.orgName}: ${mapGrade(c.overallGrade)} — ${c.activeDriftSignals} drift signal${c.activeDriftSignals !== 1 ? 's' : ''}, ${Math.round(c.rallyCoveragePct)}% rally cry coverage`,
        })),
    },
    metrics,
    companies,
    comparison: comparisonRows,
  };
}
