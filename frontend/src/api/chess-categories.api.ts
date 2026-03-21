import { fetchData } from './client';
import type { ChessCategory } from '@/types';

export function getChessCategories(): Promise<ChessCategory[]> {
  return fetchData<ChessCategory[]>('/api/dev/chess-categories');
}
