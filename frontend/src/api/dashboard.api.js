import { fetchData } from './client';
const BASE = '/api/v1/dashboard';
export async function getDashboard(filters) {
    return fetchData(BASE, filters);
}
