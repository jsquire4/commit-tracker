import { fetchData } from './client';
import type { IcWeekSummaryResponse, MyStoryResponse } from '@/types';

export async function getIcWeekSummary(
  cycleId: string
): Promise<IcWeekSummaryResponse> {
  return fetchData<IcWeekSummaryResponse>('/api/v1/my-week/summary', { cycleId });
}

export async function getMyStory(weeks?: number): Promise<MyStoryResponse> {
  return fetchData<MyStoryResponse>('/api/v1/my-story', weeks != null ? { weeks } : undefined);
}
