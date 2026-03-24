import { fetchData } from './client';
import type { IcWeekSummaryResponse, MyStoryResponse, RollingHistoryResponse } from '@/types';

export async function getIcWeekSummary(
  cycleId: string
): Promise<IcWeekSummaryResponse> {
  return fetchData<IcWeekSummaryResponse>('/api/v1/my-week/summary', { cycleId });
}

export async function getMyStory(weeks?: number): Promise<MyStoryResponse> {
  return fetchData<MyStoryResponse>('/api/v1/my-story', weeks != null ? { weeks } : undefined);
}

export async function getRollingHistory(offset: number, limit: number): Promise<RollingHistoryResponse> {
  return fetchData<RollingHistoryResponse>('/api/v1/my-week/rolling-history', { offset, limit });
}

export async function getTeamMemberHistory(
  userId: string,
  offset: number,
  limit: number,
): Promise<RollingHistoryResponse> {
  return fetchData<RollingHistoryResponse>('/api/v1/my-week/team-member-history', {
    userId,
    offset,
    limit,
  });
}

export async function getTeamMemberStory(userId: string, weeks?: number): Promise<MyStoryResponse> {
  return fetchData<MyStoryResponse>('/api/v1/my-week/team-member-story', {
    userId,
    ...(weeks != null ? { weeks } : {}),
  });
}
