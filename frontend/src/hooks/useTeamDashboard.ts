import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/api/dashboard.api';
import type { DashboardFilters } from '@/types';

export function useDashboard(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboard(filters),
    staleTime: 60_000,
  });
}
