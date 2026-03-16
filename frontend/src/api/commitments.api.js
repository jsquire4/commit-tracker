import apiClient, { fetchData } from './client';
const BASE = '/api/v1/commitments';
export async function getCommitments(cycleId, filters) {
    return fetchData(`${BASE}`, {
        cycleId,
        ...filters,
    });
}
export async function createCommitment(req) {
    const response = await apiClient.post(BASE, req);
    return response.data.data;
}
export async function updateCommitment(id, req) {
    const response = await apiClient.put(`${BASE}/${id}`, req);
    return response.data.data;
}
export async function deleteCommitment(id) {
    await apiClient.delete(`${BASE}/${id}`);
}
export async function reorderCommitments(cycleId, orderedIds) {
    await apiClient.put(`${BASE}/reorder`, { cycleId, commitmentIds: orderedIds });
}
export async function createUnplannedCommitment(req) {
    const response = await apiClient.post(`${BASE}/unplanned`, req);
    return response.data.data;
}
