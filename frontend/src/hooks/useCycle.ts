import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentCycle,
  getCycle,
  transitionCycle,
} from '@/api/cycles.api';
import type { TransitionRequest } from '@/types';

export function useCurrentCycle() {
  return useQuery({
    queryKey: ['cycle', 'current'],
    queryFn: getCurrentCycle,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCycle(id: string) {
  return useQuery({
    queryKey: ['cycle', id],
    queryFn: () => getCycle(id),
    enabled: Boolean(id),
  });
}

export function useTransitionCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: TransitionRequest }) =>
      transitionCycle(id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cycle'] });
      void queryClient.invalidateQueries({ queryKey: ['commitments'] });
    },
  });
}
