import { fetchData } from './client';
const BASE = '/api/v1/users';
export async function getMe() {
    return fetchData(`${BASE}/me`);
}
export async function getTeam() {
    return fetchData(`${BASE}/team`);
}
export async function getOrgTree() {
    return fetchData(`${BASE}/org-tree`);
}
