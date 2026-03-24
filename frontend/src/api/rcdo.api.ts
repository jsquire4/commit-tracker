import apiClient, { fetchData } from './client';
import type {
  RcdoTree,
  RallyCryNode,
  DefiningObjectiveNode,
  OutcomeNode,
} from '@/types';

const BASE = '/api/v1/rcdo';

// ── Mutation request types ──────────────────────────────────────────────

export interface CreateRallyCryRequest {
  title: string;
  description?: string | undefined;
}

export interface CreateDefiningObjectiveRequest {
  rallyCryId: string;
  title: string;
  description?: string | undefined;
  ownerUserId?: string | undefined;
}

export interface CreateOutcomeRequest {
  definingObjectiveId: string;
  title: string;
  description?: string | undefined;
  ownerUserId?: string | undefined;
}

export interface UpdateRcdoNodeRequest {
  title?: string;
  description?: string | null;
  ownerUserId?: string | null;
}

// ── Mutations ───────────────────────────────────────────────────────────

export async function createRallyCry(
  req: CreateRallyCryRequest
): Promise<RallyCryNode> {
  const response = await apiClient.post<{ data: RallyCryNode }>(
    `${BASE}/rally-cries`,
    req
  );
  return response.data.data;
}

export async function createDefiningObjective(
  req: CreateDefiningObjectiveRequest
): Promise<DefiningObjectiveNode> {
  const response = await apiClient.post<{ data: DefiningObjectiveNode }>(
    `${BASE}/defining-objectives`,
    req
  );
  return response.data.data;
}

export async function createOutcome(
  req: CreateOutcomeRequest
): Promise<OutcomeNode> {
  const response = await apiClient.post<{ data: OutcomeNode }>(
    `${BASE}/outcomes`,
    req
  );
  return response.data.data;
}

export async function updateRcdoNode(
  type: 'rally-cries' | 'defining-objectives' | 'outcomes',
  id: string,
  req: UpdateRcdoNodeRequest
): Promise<void> {
  await apiClient.put(`${BASE}/${type}/${id}`, req);
}

export async function archiveRcdoNode(
  type: 'rally-cries' | 'defining-objectives' | 'outcomes',
  id: string
): Promise<void> {
  await apiClient.delete(`${BASE}/${type}/${id}`);
}

export async function getRcdoTree(): Promise<RcdoTree> {
  return fetchData<RcdoTree>(`${BASE}/tree`);
}

// NOTE: The backend does not support server-side filtering for rally cries (?q is ignored).
// This function fetches all rally cries and filters client-side by title.
export async function searchRallyCries(query: string): Promise<RallyCryNode[]> {
  const all = await fetchData<RallyCryNode[]>(`${BASE}/rally-cries`);
  if (!query) return all;
  const lower = query.toLowerCase();
  return all.filter((rc) => rc.title.toLowerCase().includes(lower));
}

export async function searchDefiningObjectives(
  rallyCryId: string,
  query?: string
): Promise<DefiningObjectiveNode[]> {
  return fetchData<DefiningObjectiveNode[]>(
    `${BASE}/rally-cries/${rallyCryId}/defining-objectives`,
    query ? { q: query } : undefined
  );
}

export async function searchOutcomes(
  definingObjectiveId: string,
  query?: string
): Promise<OutcomeNode[]> {
  return fetchData<OutcomeNode[]>(
    `${BASE}/defining-objectives/${definingObjectiveId}/outcomes`,
    query ? { q: query } : undefined
  );
}
