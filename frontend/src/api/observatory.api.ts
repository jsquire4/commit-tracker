import apiClient, { fetchData } from './client';
import type {
  AlignmentDataPoint,
  CarryForwardChain,
  CompletionDataPoint,
  CostWeightedSignal,
  DisplacementSummary,
  DriftReport,
  ExecutiveHealthResponse,
  IntegrityReport,
  ObservatoryConfig,
  PortfolioHealthResponse,
  ProgramHeatmapResponse,
  SignalsSummaryResponse,
} from '@/types';

const BASE = '/api/v1/observatory';

export async function getObservatoryDashboard(weekCount?: number): Promise<{
  health: ExecutiveHealthResponse;
  alignmentTrend: AlignmentDataPoint[];
  completionTrend: CompletionDataPoint[];
}> {
  return fetchData(`${BASE}/dashboard`, weekCount !== undefined ? { weekCount } : undefined);
}

export async function getExecutiveHealth(
  weekCount?: number
): Promise<ExecutiveHealthResponse> {
  return fetchData<ExecutiveHealthResponse>(`${BASE}/health`, weekCount !== undefined ? { weekCount } : undefined);
}

export async function getDriftReport(
  weekCount?: number
): Promise<DriftReport> {
  return fetchData<DriftReport>(`${BASE}/drift`, weekCount !== undefined ? { weekCount } : undefined);
}

export async function getAlignmentTrend(
  weekCount?: number,
  managerId?: string
): Promise<AlignmentDataPoint[]> {
  const params: Record<string, unknown> = {};
  if (weekCount !== undefined) params.weekCount = weekCount;
  if (managerId !== undefined) params.managerId = managerId;
  const raw = await fetchData<AlignmentDataPoint[] | { dataPoints: AlignmentDataPoint[] }>(`${BASE}/alignment-trend`, Object.keys(params).length > 0 ? params : undefined);
  // When managerId is set, backend returns TeamAlignmentTrend { dataPoints: [...] }
  // When no managerId, backend returns AlignmentDataPoint[] directly
  if (Array.isArray(raw)) return raw;
  return (raw as { dataPoints: AlignmentDataPoint[] }).dataPoints ?? [];
}

export async function getCompletionTrend(
  weekCount?: number
): Promise<CompletionDataPoint[]> {
  return fetchData<CompletionDataPoint[]>(`${BASE}/completion-trend`, weekCount !== undefined ? { weekCount } : undefined);
}

export async function getCostImpact(
  cycleId?: string
): Promise<CostWeightedSignal[]> {
  return fetchData<CostWeightedSignal[]>(`${BASE}/cost-impact`, cycleId !== undefined ? { cycleId } : undefined);
}

export async function getDisplacementReport(
  weekCount?: number
): Promise<DisplacementSummary> {
  return fetchData<DisplacementSummary>(`${BASE}/displacement`, weekCount !== undefined ? { weekCount } : undefined);
}

export async function getCarryChains(
  cycleId: string
): Promise<CarryForwardChain[]> {
  return fetchData<CarryForwardChain[]>(`${BASE}/carry-chains`, { cycleId });
}

export async function getIntegrityReport(
  cycleId?: string
): Promise<IntegrityReport> {
  return fetchData<IntegrityReport>(`${BASE}/integrity`, cycleId !== undefined ? { cycleId } : undefined);
}

export async function getObservatoryConfig(): Promise<ObservatoryConfig> {
  return fetchData<ObservatoryConfig>(`${BASE}/config`);
}

export async function updateObservatoryConfig(
  config: Partial<ObservatoryConfig>
): Promise<ObservatoryConfig> {
  const response = await apiClient.put<{ data: ObservatoryConfig }>(`${BASE}/config`, config);
  return response.data.data;
}

export async function getPortfolioHealth(): Promise<PortfolioHealthResponse> {
  return fetchData<PortfolioHealthResponse>(`${BASE}/portfolio`);
}

export async function getProgramHeatmap(
  weekCount?: number
): Promise<ProgramHeatmapResponse> {
  return fetchData<ProgramHeatmapResponse>(`${BASE}/program-heatmap`, weekCount !== undefined ? { weekCount } : undefined);
}

export async function getSignalsSummary(
  weekCount?: number
): Promise<SignalsSummaryResponse> {
  return fetchData<SignalsSummaryResponse>(`${BASE}/signals-summary`, weekCount !== undefined ? { weekCount } : undefined);
}
