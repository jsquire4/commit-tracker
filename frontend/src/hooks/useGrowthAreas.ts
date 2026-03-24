import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyGrowthAreas,
  createGrowthArea,
  updateGrowthArea,
  deleteGrowthArea,
} from '@/api/growth-areas.api';
import type { CreateGrowthAreaRequest, UpdateGrowthAreaRequest } from '@/types';

const QUERY_KEY = ['growth-areas', 'me'] as const;

export function useGrowthAreas() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getMyGrowthAreas,
    staleTime: 60_000,
  });
}

export function useCreateGrowthArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateGrowthAreaRequest) => createGrowthArea(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateGrowthArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateGrowthAreaRequest }) =>
      updateGrowthArea(id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteGrowthArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGrowthArea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
