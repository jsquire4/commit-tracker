// src/api/client.ts
import axios from 'axios';
import type { ApiResponse } from '@/types/api.types';

const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor — reads token from AuthContext ref
let getToken: (() => string | null) | null = null;

export function setTokenProvider(provider: () => string | null) {
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
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('compass:auth:expired'));
      }
      // Extract ProblemDetail message from response body
      const detail = error.response?.data?.detail as string | undefined;
      if (detail) {
        return Promise.reject(new Error(detail));
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

// Typed fetch helper — no Zod parsing, just type assertion.
// The backend is ours and TypeScript interfaces are the contract.
export async function fetchData<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export default apiClient;
