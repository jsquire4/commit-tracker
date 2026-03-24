import { fetchData } from './client';
import type { IcWeekSummaryResponse, MyStoryResponse } from '@/types';

const BASE = '/api/v1/ic-insights';

export async function getIcWeekSummary(
  cycleId: string
): Promise<IcWeekSummaryResponse> {
  return fetchData<IcWeekSummaryResponse>(`${BASE}/week-summary`, { cycleId });
}

export async function getMyStory(weeks?: number): Promise<MyStoryResponse> {
  return fetchData<MyStoryResponse>(`${BASE}/my-story`, weeks != null ? { weeks } : undefined);
}
