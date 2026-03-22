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
  try {
    return await fetchData<TeamSummaryResponse>(`${BASE}/team-summary`, params);
  } catch (err: unknown) {
    // 204 No Content — LLM not configured; fall back gracefully
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 204) return null;
    throw err;
  }
}
