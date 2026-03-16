import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/api/dashboard.api';
export function useDashboard(filters) {
    return useQuery({
        queryKey: ['dashboard', filters],
        queryFn: () => getDashboard(filters),
        staleTime: 60_000,
    });
}
