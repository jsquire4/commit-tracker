// src/api/client.ts
import axios from 'axios';
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});
// Auth interceptor — reads token from AuthContext ref
let getToken = null;
export function setTokenProvider(provider) {
    getToken = provider;
}
apiClient.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// Response interceptor — error normalization
apiClient.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('st6:auth:expired'));
    }
    return Promise.reject(error);
});
// Typed fetch helper — no Zod parsing, just type assertion.
// The backend is ours and TypeScript interfaces are the contract.
export async function fetchData(url, params) {
    const response = await apiClient.get(url, { params });
    return response.data.data;
}
export default apiClient;
