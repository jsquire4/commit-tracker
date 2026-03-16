import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReconciliationView,
  reconcileCommitment,
  completeReconciliation,
} from '@/api/reconciliation.api';
import type { ReconcileCommitmentRequest } from '@/types';

export function useReconciliationView(cycleId: string) {
  return useQuery({
    queryKey: ['reconciliation', cycleId],
    queryFn: () => getReconciliationView(cycleId),
    staleTime: 30_000,
    enabled: Boolean(cycleId),
  });
}

export function useReconcileCommitment(cycleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      req,
    }: {
      id: string;
      req: ReconcileCommitmentRequest;
    }) => reconcileCommitment(id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reconciliation', cycleId] });
    },
  });
}

export function useCompleteReconciliation(cycleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => completeReconciliation(cycleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reconciliation', cycleId] });
      void queryClient.invalidateQueries({ queryKey: ['cycle', 'current'] });
    },
  });
}
