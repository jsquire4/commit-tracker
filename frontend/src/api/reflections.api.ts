import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { fetchData } from './client';
import type { ApiResponse } from '@/types/api.types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PersonalReflectionRequest {
  cycleId: string;
  alignmentSignal: 'CLOSER' | 'SAME' | 'FURTHER';
  learningNote?: string;
}

export interface PersonalReflectionResponse {
  id: string;
  cycleId: string;
  alignmentSignal: string;
  learningNote: string | null;
  createdAt: string;
}

// ── API functions ──────────────────────────────────────────────────────────

export async function saveReflection(
  req: PersonalReflectionRequest
): Promise<PersonalReflectionResponse> {
  const response = await apiClient.post<ApiResponse<PersonalReflectionResponse>>(
    '/api/v1/my-week/reflection',
    req
  );
  return response.data.data;
}

export async function getReflection(
  cycleId: string
): Promise<PersonalReflectionResponse | null> {
  try {
    return await fetchData<PersonalReflectionResponse>(
      '/api/v1/my-week/reflection',
      { cycleId }
    );
  } catch (err: unknown) {
    if (err instanceof Error && 'status' in err && ((err as { status: number }).status === 404 || (err as { status: number }).status === 204)) {
      return null;
    }
    // For fetch errors where response is not ok, check the message
    if (err instanceof Error && err.message?.includes('404')) return null;
    throw err;
  }
}

// ── React Query hooks ──────────────────────────────────────────────────────

export function useSaveReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveReflection,
    onSuccess: (data) => {
      queryClient.setQueryData(['reflection', data.cycleId], data);
    },
  });
}

export function useReflection(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['reflection', cycleId],
    queryFn: () => getReflection(cycleId!),
    enabled: Boolean(cycleId),
    staleTime: 5 * 60_000,
  });
}
