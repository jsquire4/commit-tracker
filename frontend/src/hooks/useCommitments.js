import { useQuery, useMutation, useQueryClient, } from '@tanstack/react-query';
import { getCommitments, createCommitment, updateCommitment, deleteCommitment, reorderCommitments, createUnplannedCommitment, } from '@/api/commitments.api';
export function useCommitments(cycleId, filters) {
    return useQuery({
        queryKey: ['commitments', cycleId, filters],
        queryFn: () => getCommitments(cycleId, filters),
        staleTime: 30_000,
        enabled: Boolean(cycleId),
    });
}
export function useCreateCommitment(cycleId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req) => createCommitment(req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
        },
    });
}
export function useUpdateCommitment(cycleId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, req }) => updateCommitment(id, req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
        },
    });
}
export function useDeleteCommitment(cycleId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => deleteCommitment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
        },
    });
}
export function useReorderCommitments() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ cycleId, orderedIds }) => reorderCommitments(cycleId, orderedIds),
        onMutate: async ({ cycleId, orderedIds }) => {
            // Cancel in-flight queries so they don't overwrite the optimistic update
            await queryClient.cancelQueries({ queryKey: ['commitments', cycleId] });
            // Snapshot previous value
            const previous = queryClient.getQueryData([
                'commitments',
                cycleId,
            ]);
            // Optimistically reorder
            if (previous) {
                const reordered = orderedIds
                    .map((id) => previous.find((c) => c.id === id))
                    .filter((c) => c !== undefined);
                queryClient.setQueryData(['commitments', cycleId], reordered);
            }
            return { previous, cycleId };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['commitments', context.cycleId], context.previous);
            }
        },
        onSettled: (_data, _err, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['commitments', variables.cycleId],
            });
        },
    });
}
export function useCreateUnplannedCommitment(cycleId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req) => createUnplannedCommitment(req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation', cycleId] });
        },
    });
}
