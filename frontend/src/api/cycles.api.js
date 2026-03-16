import apiClient, { fetchData } from './client';
const BASE = '/api/v1/cycles';
export async function getCurrentCycle() {
    return fetchData(`${BASE}/current`);
}
export async function getCycle(id) {
    return fetchData(`${BASE}/${id}`);
}
export async function listCycles(filters) {
    return fetchData(BASE, filters);
}
export async function transitionCycle(id, req) {
    const response = await apiClient.post(`${BASE}/${id}/transition`, req);
    return response.data.data;
}
