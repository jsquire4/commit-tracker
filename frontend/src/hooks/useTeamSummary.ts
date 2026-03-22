import { useQuery } from '@tanstack/react-query';
import { getTeamSummary } from '@/api/dashboard.api';
import type { TeamSummaryResponse } from '@/types/briefing.types';

/**
 * Fetches the LLM-generated team summary for the My Team AI Summary card.
 *
 * Returns undefined while loading and null when the LLM is not configured
 * (backend returned 204). The card falls back to the deterministic buildSummary()
 * when data is null or the query is still in flight.
 */
export function useTeamSummary(cycleWeekStart?: string) {
  return useQuery<TeamSummaryResponse | null>({
    queryKey: ['team-summary', cycleWeekStart ?? ''],
    queryFn: () => getTeamSummary(cycleWeekStart),
    staleTime: 5 * 60_000,
    retry: false, // Don't retry — null (204) is a valid non-error response
  });
}
