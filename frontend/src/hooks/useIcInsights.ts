import { useQuery } from '@tanstack/react-query';
import { getIcWeekSummary, getMyStory, getRollingHistory } from '@/api/ic-insights.api';

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

export function useRollingHistory(weeks?: number) {
  return useQuery({
    queryKey: ['rolling-history', weeks ?? 4],
    queryFn: () => getRollingHistory(weeks),
    staleTime: 60_000,
  });
}
