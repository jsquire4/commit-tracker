import { useQuery } from '@tanstack/react-query';
import { getPortfolioData } from '@/api/portfolio.api';
import type { PortfolioData } from '@/types/portfolio.types';

export function usePortfolio(cycleId?: string) {
  return useQuery<PortfolioData>({
    queryKey: ['portfolio', cycleId ?? 'current'],
    queryFn: () => getPortfolioData(cycleId),
    staleTime: 5 * 60_000,
  });
}
