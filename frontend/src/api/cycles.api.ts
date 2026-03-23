import apiClient, { fetchData } from './client';
import type {
  Cycle,
  CycleFilters,
  TransitionRequest,
} from '@/types';
import type { PaginatedResponse } from '@/types/api.types';

const BASE = '/api/v1/cycles';

export async function getCurrentCycle(): Promise<Cycle> {
  return fetchData<Cycle>(`${BASE}/current`);
}

export async function getCycle(id: string): Promise<Cycle> {
  return fetchData<Cycle>(`${BASE}/${id}`);
}

export async function listCycles(
  filters?: CycleFilters
): Promise<PaginatedResponse<Cycle>> {
  return fetchData<PaginatedResponse<Cycle>>(BASE, filters as Record<string, unknown>);
}

export async function transitionCycle(
  id: string,
  req: TransitionRequest
): Promise<Cycle> {
  const response = await apiClient.post<{ data: Cycle }>(`${BASE}/${id}/transition`, req);
  return response.data.data;
}

export async function startNextCycle(fromCycleId: string): Promise<Cycle> {
  const response = await apiClient.post<{ data: Cycle }>(`${BASE}/${fromCycleId}/next`);
  return response.data.data;
}
