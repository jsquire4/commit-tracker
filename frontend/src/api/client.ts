import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor — will be wired to host app's auth context
let getToken: (() => string) | null = null;

export function setTokenProvider(provider: () => string): void {
  getToken = provider;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn('ST6: Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
