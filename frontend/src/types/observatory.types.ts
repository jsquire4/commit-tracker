// ─── Enum type unions ───────────────────────────────────────────────────────

export type HealthGrade = 'GREEN' | 'YELLOW' | 'RED';

export type DriftSeverity = 'EMERGING' | 'SUSTAINED' | 'STRUCTURAL';

export type DriftMetric = 'ALIGNMENT' | 'VELOCITY' | 'COVERAGE';

export type TrendDirection = 'DECLINING' | 'FLAT' | 'IMPROVING';

export type DriftUnitType = 'TEAM' | 'MANAGER' | 'ORG_UNIT';

export type IntegrityFlagType =
  | 'UNIFORM_CATEGORIZATION'
  | 'COMPLETION_MISMATCH'
  | 'DUPLICATE_NOTES';

export type DisplacementCategory =
  | 'MANAGER_REASSIGNED'
  | 'PRODUCTION_EMERGENCY'
  | 'RESOURCE_BLOCKED'
  | 'SCOPE_CHANGE'
  | 'DEPRIORITIZED'
  | 'EXTERNAL_DEPENDENCY'
  | 'OTHER';

// ─── Core DTO interfaces ─────────────────────────────────────────────────────

export interface OrgUnitHealth {
  managerId: string;
  managerName: string;
  role: string;
  headcount: number;
  costBandWeightedHeadcount: number;
  grade: HealthGrade;
  strategicAlignmentPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  rallyCoveragePct: number;
  completionRate: number;
  trendDirection: string;
  weeksTrending: number;
}

export interface ExecutiveHealthResponse {
  orgId: string;
  orgName: string;
  overallGrade: HealthGrade;
  strategicAlignmentPct: number;
  completionRate: number;
  carryForwardRate: number;
  activeDriftSignals: number;
  integrityFlags: number;
  units: OrgUnitHealth[];
  computedAt: string;
}

export interface DriftSignal {
  unitType: DriftUnitType;
  unitId: string;
  unitName: string;
  metric: DriftMetric;
  severity: DriftSeverity;
  currentValue: number;
  baselineValue: number;
  weekCount: number;
  trendDirection: TrendDirection;
  dataPoints: number[];
}

export interface DriftReport {
  signals: DriftSignal[];
  generatedAt: string;
}

export interface AlignmentDataPoint {
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

export interface CompletionDataPoint {
  cycleId: string;
  cycleLabel: string;
  startsAt: string;
  completionRate: number;
  carryForwardRate: number;
  notStartedRate: number;
  totalCommitments: number;
  reconciledCount: number;
}

export interface CarryForwardChain {
  commitmentId: string;
  title: string;
  userId: string;
  userDisplayName: string;
  chainLength: number;
  originCycleLabel: string;
}

export interface CostWeightedSignal {
  userId: string;
  displayName: string;
  role: string;
  costBandName: string;
  costBandTier: number;
  /** BigDecimal serialised as string by Jackson */
  totalHours: string;
  strategicHours: string;
  nonStrategicHours: string;
  misalignmentCost: string;
}

export interface CategoryCount {
  category: DisplacementCategory;
  count: number;
  percentage: number;
  topTeams: string[];
}

export interface NoteCluster {
  theme: string;
  representativeNotes: string[];
  count: number;
  affectedTeams: string[];
  affectedUsers: string[];
}

export interface DisplacementSummary {
  totalDisplacements: number;
  byCategory: CategoryCount[];
  /** weekNumber → count */
  weeklyTrend: Record<string, number>;
  noteClusters?: NoteCluster[];
}

export interface IntegrityFlag {
  type: IntegrityFlagType;
  userId: string;
  details: Record<string, unknown>;
}

export interface IntegrityReport {
  flags: IntegrityFlag[];
}

/** Mirrors ObservatoryConfigResponse — BigDecimal fields are strings from Jackson */
export interface ObservatoryConfig {
  id: string;
  orgId: string;
  driftEmergingWeeks: number;
  driftSustainedWeeks: number;
  driftStructuralWeeks: number;
  strategicAlignmentTarget: string;
  misalignmentWarningPct: string;
  darkWorkWarningPct: string;
  concentrationRiskPct: string;
  uniformityThreshold: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortcoSummary {
  orgId: string;
  orgName: string;
  overallGrade: HealthGrade;
  strategicAlignmentPct: number;
  completionRate: number;
  rallyCoveragePct: number;
  carryForwardRate: number;
  activeDriftSignals: number;
  headcount: number;
}

export interface PortfolioHealthResponse {
  portfolioId: string;
  portfolioName: string;
  portcos: PortcoSummary[];
  computedAt: string;
}

export interface PortcoTrendLine {
  orgId: string;
  orgName: string;
  dataPoints: AlignmentDataPoint[];
}

export interface PortfolioComparisonResponse {
  portfolioId: string;
  portfolioName: string;
  trends: PortcoTrendLine[];
}

// ─── Program Heatmap ─────────────────────────────────────────────────────────

export interface WeekCell {
  cycleId: string;
  cycleLabel: string;
  dominantCategory: string | null;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  totalCommitments: number;
}

export interface PersonHeatmapRow {
  userId: string;
  displayName: string;
  weekCells: WeekCell[];
}

export interface ManagerHeatmapRow {
  managerId: string;
  managerName: string;
  managerRole: string;
  teamSize: number;
  weekCells: WeekCell[];
  members: PersonHeatmapRow[];
}

export interface ProgramHeatmapResponse {
  managers: ManagerHeatmapRow[];
}

// ─── Signals Summary ─────────────────────────────────────────────────────────

export interface SignalMetric {
  label: string;
  value: string;
}

export interface ObservatorySignal {
  signalType: string;
  status: string;
  detectedWeek: string;
  resolvedWeek: string | null;
  title: string;
  body: string;
  metrics: SignalMetric[];
}

export interface SignalsSummaryResponse {
  signals: ObservatorySignal[];
  computedAt: string;
}

// ─── Program Summary ─────────────────────────────────────────────────────────

export interface ProgramSummaryResponse {
  narrative: string;
  generatedAt: string;
}
