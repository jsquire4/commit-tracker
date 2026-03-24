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

export interface AlignedTask {
  commitmentId: string;
  title: string;
  cycleLabel: string;
  reconciliationStatus: string | null;
}

export interface GrowthAreaAlignmentDetail {
  growthAreaId: string;
  label: string;
  isActive: boolean;
  alignedCommitmentCount: number;
  completedCount: number;
  topTasks: AlignedTask[];
}

export interface HistoryCommitment {
  id: string;
  title: string;
  reconciliationStatus: string | null;
  rallyCryTitle: string | null;
  chessCategoryName: string | null;
  growthAreaLabels: string[];
  isUnplanned: boolean;
  assignedByName: string | null;
}

export interface WeekGroup {
  cycleId: string;
  cycleLabel: string;
  startsAt: string;
  endsAt: string;
  cycleState: string;
  commitments: HistoryCommitment[];
}

export interface RollingHistoryResponse {
  weeks: WeekGroup[];
}

export interface MyStoryResponse {
  growthAreaProgress: GrowthAreaProgress[];
  recentWeeks: WeekSnapshot[];
  patternStats: PatternStats;
  narrativeInsight: string | null;
  resumeBullets: string[] | null;
  overallAlignmentPct: number;
  growthAreaAlignmentDetails: GrowthAreaAlignmentDetail[];
}
