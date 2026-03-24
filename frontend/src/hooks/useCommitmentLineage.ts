import { useInfiniteQuery } from '@tanstack/react-query';
import { getCommitmentLineage } from '@/api/commitments.api';

/**
 * Paginated lineage: first page 7 nodes, subsequent pages 12 (matches backend caps).
 */
export function useCommitmentLineage(commitmentId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['commitment-lineage', commitmentId],
    enabled: enabled && Boolean(commitmentId),
    initialPageParam: undefined as string | undefined,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const limit = cursor ? 12 : 7;
      return getCommitmentLineage(commitmentId!, { limit, ...(cursor ? { cursor } : {}) });
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });
}
