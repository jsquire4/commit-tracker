import apiClient, { fetchData } from './client';

const BASE = '/api/v1/feedback';

export type Vote = 'up' | 'down';

export interface FeedbackResponse {
  vote: string;
}

export async function submitFeedback(scope: string, cycleId: string, vote: Vote): Promise<void> {
  await apiClient.post(BASE, { scope, cycleId, vote });
}

export async function getFeedback(scope: string, cycleId: string): Promise<FeedbackResponse> {
  return fetchData<FeedbackResponse>(`${BASE}?scope=${encodeURIComponent(scope)}&cycleId=${encodeURIComponent(cycleId)}`);
}
