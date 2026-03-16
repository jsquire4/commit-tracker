import { useQuery } from '@tanstack/react-query';
import { getRcdoTree, searchRallyCries, searchDefiningObjectives, searchOutcomes, } from '@/api/rcdo.api';
export function useRcdoTree() {
    return useQuery({
        queryKey: ['rcdo', 'tree'],
        queryFn: getRcdoTree,
        staleTime: 5 * 60_000, // 5 minutes
    });
}
export function useRcdoSearch(level, parentId, query) {
    return useQuery({
        queryKey: ['rcdo', 'search', level, parentId, query],
        queryFn: () => {
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
        placeholderData: (prev) => prev,
        enabled: query.length >= 1,
    });
}
