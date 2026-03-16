import { useQuery } from '@tanstack/react-query';
import {
  getRcdoTree,
  searchRallyCries,
  searchDefiningObjectives,
  searchOutcomes,
} from '@/api/rcdo.api';
import type {
  RallyCryNode,
  DefiningObjectiveNode,
  OutcomeNode,
} from '@/types';

export function useRcdoTree() {
  return useQuery({
    queryKey: ['rcdo', 'tree'],
    queryFn: getRcdoTree,
    staleTime: 5 * 60_000, // 5 minutes
  });
}

type RcdoSearchLevel = 'rallyCry' | 'definingObjective' | 'outcome';
type RcdoSearchResult = RallyCryNode[] | DefiningObjectiveNode[] | OutcomeNode[];

export function useRcdoSearch(
  level: RcdoSearchLevel,
  parentId: string | null,
  query: string
) {
  return useQuery<RcdoSearchResult>({
    queryKey: ['rcdo', 'search', level, parentId, query],
    queryFn: (): Promise<RcdoSearchResult> => {
      if (level === 'rallyCry') {
        return searchRallyCries(query);
      }
      if (level === 'definingObjective' && parentId) {
        return searchDefiningObjectives(parentId, query);
      }
      if (level === 'outcome' && parentId) {
        return searchOutcomes(parentId, query);
      }
      return Promise.resolve([]);
    },
    staleTime: 60_000,
    placeholderData: (prev: RcdoSearchResult | undefined) => prev,
    enabled: query.length >= 1,
  });
}
