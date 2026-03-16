import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCycle, getCycle, transitionCycle, } from '@/api/cycles.api';
export function useCurrentCycle() {
    return useQuery({
        queryKey: ['cycle', 'current'],
        queryFn: getCurrentCycle,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });
}
export function useCycle(id) {
    return useQuery({
        queryKey: ['cycle', id],
        queryFn: () => getCycle(id),
        enabled: Boolean(id),
    });
}
export function useTransitionCycle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, req }) => transitionCycle(id, req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cycle'] });
            queryClient.invalidateQueries({ queryKey: ['commitments'] });
        },
    });
}
