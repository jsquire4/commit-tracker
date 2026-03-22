/**
 * All types mirror the backend DTOs in the dashboard package.
 * See: TeamRollupResponse, AlignmentSignalResponse,
 * AssignmentAttributionResponse, RcdoCoverageResponse, DashboardResponse.
 */

/** Mirrors backend DashboardResponse — composite response from GET /api/v1/dashboard */
export interface DashboardResponse {
  teamRollup: TeamRollupResponse;
  alignmentSignal: AlignmentSignalResponse;
  assignmentAttribution: AssignmentAttributionResponse;
  rcdoCoverage: RcdoCoverageResponse;
}

/** Mirrors backend TeamRollupResponse */
export interface TeamRollupResponse {
  members: TeamMemberSummary[];
}

export interface TeamMemberSummary {
  userId: string;
  displayName: string;
  role: string;
  totalCommitments: number;
  cycleState: import('./cycle.types').CycleState;
  reconciledCount: number;
  /** Count of COMPLETED + PARTIALLY_COMPLETED reconciliation records for this member. */
  completedCount: number;
  categoryBreakdown: Record<string, number>;
}

/** Mirrors backend AlignmentSignalResponse */
export interface AlignmentSignalResponse {
  teamSize: number;
  distribution: Record<string, CategoryDistribution>;
  unlinkedCount: number;
  byTeamMember: MemberAlignment[];
}

export interface CategoryDistribution {
  count: number;
  percentage: number;
}

export interface MemberAlignment {
  userId: string;
  displayName: string;
  distribution: Record<string, CategoryDistribution>;
  unlinkedCount: number;
}

/** Mirrors backend AssignmentAttributionResponse */
export interface AssignmentAttributionResponse {
  totalCommitments: number;
  selfDirectedCount: number;
  selfDirectedPercentage: number;
  managerAssignedCount: number;
  managerAssignedPercentage: number;
  concentrationRisks: AssignmentConcentration[];
}

export interface AssignmentConcentration {
  assignedToUserId: string;
  assignedToName: string;
  assignmentCount: number;
  percentageOfTotal: number;
}

export interface DashboardFilters {
  cycleWeekStart?: string;
  teamMemberId?: string;
  rcdoId?: string;
  includeSubtree?: boolean;
}

/** Mirrors backend RcdoCoverageResponse */
export interface RcdoCoverageResponse {
  totalCommitments: number;
  linkedCount: number;
  unlinkedCount: number;
  linkedPercentage: number;
  byRallyCry: { rallyCryId: string; title: string; commitmentCount: number; percentage: number }[];
  uncoveredObjectives: { definingObjectiveId: string; title: string; rallyCryTitle: string }[];
}
