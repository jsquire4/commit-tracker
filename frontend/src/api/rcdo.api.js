import { fetchData } from './client';
const BASE = '/api/v1/rcdo';
export async function getRcdoTree() {
    return fetchData(`${BASE}/tree`);
}
export async function searchRallyCries(query) {
    return fetchData(`${BASE}/rally-cries`, { q: query });
}
export async function searchDefiningObjectives(rallyCryId, query) {
    return fetchData(`${BASE}/rally-cries/${rallyCryId}/defining-objectives`, query ? { q: query } : undefined);
}
export async function searchOutcomes(definingObjectiveId, query) {
    return fetchData(`${BASE}/defining-objectives/${definingObjectiveId}/outcomes`, query ? { q: query } : undefined);
}
