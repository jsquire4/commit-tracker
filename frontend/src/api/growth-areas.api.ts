import apiClient, { fetchData } from './client';
import type { GrowthArea, CreateGrowthAreaRequest, UpdateGrowthAreaRequest } from '@/types';

const BASE = '/api/v1/growth-areas';

export async function getMyGrowthAreas(): Promise<GrowthArea[]> {
  return fetchData<GrowthArea[]>(`${BASE}/me`);
}

export async function createGrowthArea(
  req: CreateGrowthAreaRequest
): Promise<GrowthArea> {
  const response = await apiClient.post<{ data: GrowthArea }>(BASE, req);
  return response.data.data;
}

export async function updateGrowthArea(
  id: string,
  req: UpdateGrowthAreaRequest
): Promise<GrowthArea> {
  const response = await apiClient.put<{ data: GrowthArea }>(`${BASE}/${id}`, req);
  return response.data.data;
}

export async function deleteGrowthArea(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
