export interface GrowthAreaHit {
  growthAreaId: string;
  label: string;
  commitmentCount: number;
}

export interface IcWeekSummaryResponse {
  cycleId: string;
  cycleLabel: string;
  startsAt: string;
  endsAt: string;
  totalPlanned: number;
  completed: number;
  partiallyCompleted: number;
  notStarted: number;
  carriedForward: number;
  unplanned: number;
  completionRate: number;
  personalAlignmentPct: number;
  growthAreaHits: GrowthAreaHit[];
  displacementCount: number;
  narrativeSummary: string | null;
}

export interface WeeklyCount {
  cycleLabel: string;
  count: number;
}

export interface GrowthAreaProgress {
  growthAreaId: string;
  label: string;
  totalCommitments: number;
  completedCommitments: number;
  weeklyBreakdown: WeeklyCount[];
}

export interface WeekSnapshot {
  cycleId: string;
  cycleLabel: string;
  startsAt: string;
  endsAt: string;
  commitmentCount: number;
  completedCount: number;
  completionRate: number;
  personalAlignmentPct: number;
}

export interface PatternStats {
  totalCommitments: number;
  totalCompleted: number;
  overallCompletionRate: number;
  overallCarryForwardRate: number;
  totalDisplacements: number;
  totalUnplanned: number;
  categoryDistribution: Record<string, number>;
}

export interface MyStoryResponse {
  growthAreaProgress: GrowthAreaProgress[];
  recentWeeks: WeekSnapshot[];
  patternStats: PatternStats;
  narrativeInsight: string | null;
  resumeBullets: string[] | null;
}
