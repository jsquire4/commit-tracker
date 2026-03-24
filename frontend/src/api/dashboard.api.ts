import apiClient from './client';
import { fetchData } from './client';
import type { DashboardFilters, DashboardResponse } from '@/types';
import type { TeamSummaryResponse } from '@/types/briefing.types';

const BASE = '/api/v1/dashboard';

export async function getDashboard(
  filters?: DashboardFilters
): Promise<DashboardResponse> {
  return fetchData<DashboardResponse>(BASE, filters as Record<string, unknown>);
}

/**
 * Fetch the LLM-generated team summary for the My Team AI Summary card.
 * Returns null when the backend returns 204 (LLM not configured).
 */
export async function getTeamSummary(
  cycleWeekStart?: string
): Promise<TeamSummaryResponse | null> {
  const params: Record<string, unknown> = {};
  if (cycleWeekStart) params.cycleWeekStart = cycleWeekStart;
  const response = await apiClient.get<{ data: TeamSummaryResponse } | null>(
    `${BASE}/team-summary`,
    { params },
  );
  // 204 No Content — LLM not configured; fall back gracefully
  if (response.status === 204 || response.data == null) return null;
  return response.data.data;
}
