import { fetchData } from './client';
import type {
  RcdoTree,
  RallyCryNode,
  DefiningObjectiveNode,
  OutcomeNode,
} from '@/types';

const BASE = '/api/v1/rcdo';

export async function getRcdoTree(): Promise<RcdoTree> {
  return fetchData<RcdoTree>(`${BASE}/tree`);
}

export async function searchRallyCries(query: string): Promise<RallyCryNode[]> {
  return fetchData<RallyCryNode[]>(`${BASE}/rally-cries`, { q: query });
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
