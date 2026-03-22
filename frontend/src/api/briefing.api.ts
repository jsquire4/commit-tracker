import { fetchData } from './client';
import type { BriefingResponse } from '@/types/briefing.types';

/**
 * Fetch the AI-generated briefing for a given cycle.
 * Calls the real backend endpoint which invokes the LLM.
 */
export async function getBriefing(cycleId: string): Promise<BriefingResponse> {
  return fetchData<BriefingResponse>(`/api/v1/briefing?cycleId=${cycleId}`);
}
