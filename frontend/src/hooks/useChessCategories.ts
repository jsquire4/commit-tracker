import { useQuery } from '@tanstack/react-query';
import { getChessCategories } from '@/api/chess-categories.api';
import type { ChessCategory } from '@/types';

export function useChessCategories() {
  return useQuery<ChessCategory[]>({
    queryKey: ['chess-categories'],
    queryFn: getChessCategories,
    staleTime: 10 * 60_000, // 10 minutes — categories rarely change
  });
}
