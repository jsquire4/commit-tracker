import { useQuery } from '@tanstack/react-query';
import { getPortfolioData } from '@/api/portfolio.api';
import type { PortfolioData } from '@/types/portfolio.types';

export function usePortfolio() {
  return useQuery<PortfolioData>({
    queryKey: ['portfolio', 'current'],
    queryFn: () => getPortfolioData(),
    staleTime: 5 * 60_000,
  });
}
