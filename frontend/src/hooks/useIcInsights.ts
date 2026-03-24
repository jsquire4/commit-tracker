import { useQuery } from '@tanstack/react-query';
import { getIcWeekSummary, getMyStory, getRollingHistory, getTeamMemberHistory } from '@/api/ic-insights.api';

export function useIcWeekSummary(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['ic-insights', 'week-summary', cycleId],
    queryFn: () => getIcWeekSummary(cycleId!),
    enabled: Boolean(cycleId),
    staleTime: 30_000,
  });
}

export function useMyStory(weeks?: number) {
  return useQuery({
    queryKey: ['ic-insights', 'my-story', weeks],
    queryFn: () => getMyStory(weeks),
    staleTime: 5 * 60_000,
  });
}

export function useRollingHistory(offset: number, limit: number) {
  return useQuery({
    queryKey: ['rolling-history', offset, limit],
    queryFn: () => getRollingHistory(offset, limit),
    staleTime: 60_000,
  });
}

export function useTeamMemberHistory(userId: string | undefined, offset: number, limit: number) {
  return useQuery({
    queryKey: ['team-member-history', userId, offset, limit],
    queryFn: () => getTeamMemberHistory(userId!, offset, limit),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
