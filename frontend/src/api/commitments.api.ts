import apiClient, { fetchData } from './client';
import type {
  Commitment,
  CreateCommitmentRequest,
  CreateUnplannedCommitmentRequest,
  UpdateCommitmentRequest,
  CommitmentFilters,
  CommitmentLineageResponse,
} from '@/types';

const BASE = '/api/v1/commitments';

export async function getCommitments(
  cycleId: string,
  filters?: CommitmentFilters
): Promise<Commitment[]> {
  const page = await fetchData<{ items: Commitment[]; page: number; size: number; totalElements: number; totalPages: number }>(BASE, {
    cycleId,
    ...filters,
  });
  // NOTE: Pagination data discarded — callers see at most `size` commitments per request
  return page.items;
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
  await apiClient.put(`${BASE}/reorder?cycleId=${cycleId}`, { commitmentIds: orderedIds });
}

export async function createUnplannedCommitment(
  req: CreateUnplannedCommitmentRequest
): Promise<Commitment> {
  const response = await apiClient.post<{ data: Commitment }>(`${BASE}/unplanned`, req);
  return response.data.data;
}

export async function getCommitmentLineage(
  id: string,
  params?: { limit?: number; cursor?: string }
): Promise<CommitmentLineageResponse> {
  const q: Record<string, unknown> = {};
  if (params?.limit != null) q.limit = params.limit;
  if (params?.cursor != null) q.cursor = params.cursor;
  return fetchData<CommitmentLineageResponse>(`${BASE}/${id}/lineage`, q);
}
