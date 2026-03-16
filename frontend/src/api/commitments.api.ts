import apiClient, { fetchData } from './client';
import type {
  Commitment,
  CreateCommitmentRequest,
  UpdateCommitmentRequest,
  CommitmentFilters,
} from '@/types';

const BASE = '/api/v1/commitments';

export async function getCommitments(
  cycleId: string,
  filters?: CommitmentFilters
): Promise<Commitment[]> {
  return fetchData<Commitment[]>(`${BASE}`, {
    cycleId,
    ...filters,
  });
}

export async function createCommitment(
  req: CreateCommitmentRequest
): Promise<Commitment> {
  const response = await apiClient.post<{ data: Commitment }>(BASE, req);
  return response.data.data;
}

export async function updateCommitment(
  id: string,
  req: UpdateCommitmentRequest
): Promise<Commitment> {
  const response = await apiClient.put<{ data: Commitment }>(`${BASE}/${id}`, req);
  return response.data.data;
}

export async function deleteCommitment(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function reorderCommitments(
  cycleId: string,
  orderedIds: string[]
): Promise<void> {
  await apiClient.put(`${BASE}/reorder`, { cycleId, commitmentIds: orderedIds });
}

export async function createUnplannedCommitment(
  req: CreateCommitmentRequest
): Promise<Commitment> {
  const response = await apiClient.post<{ data: Commitment }>(`${BASE}/unplanned`, req);
  return response.data.data;
}
