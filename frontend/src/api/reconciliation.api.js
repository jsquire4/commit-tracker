import apiClient, { fetchData } from './client';
const BASE = '/api/v1/reconciliation';
export async function getReconciliationView(cycleId) {
    return fetchData(`${BASE}/cycles/${cycleId}`);
}
export async function reconcileCommitment(id, req) {
    const response = await apiClient.put(`${BASE}/commitments/${id}`, req);
    return response.data.data;
}
export async function completeReconciliation(cycleId) {
    const response = await apiClient.post(`${BASE}/cycles/${cycleId}/complete`);
    return response.data.data;
}
