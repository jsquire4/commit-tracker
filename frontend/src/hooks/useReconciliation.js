import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReconciliationView, reconcileCommitment, completeReconciliation, } from '@/api/reconciliation.api';
export function useReconciliationView(cycleId) {
    return useQuery({
        queryKey: ['reconciliation', cycleId],
        queryFn: () => getReconciliationView(cycleId),
        staleTime: 30_000,
        enabled: Boolean(cycleId),
    });
}
export function useReconcileCommitment(cycleId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, req, }) => reconcileCommitment(id, req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation', cycleId] });
        },
    });
}
export function useCompleteReconciliation(cycleId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => completeReconciliation(cycleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation', cycleId] });
            queryClient.invalidateQueries({ queryKey: ['cycle', 'current'] });
        },
    });
}
