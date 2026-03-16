import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  getCommitments,
  createCommitment,
  updateCommitment,
  deleteCommitment,
  reorderCommitments,
  createUnplannedCommitment,
} from '@/api/commitments.api';
import type {
  Commitment,
  CreateCommitmentRequest,
  UpdateCommitmentRequest,
  CommitmentFilters,
} from '@/types';

export function useCommitments(cycleId: string, filters?: CommitmentFilters) {
  return useQuery({
    queryKey: ['commitments', cycleId, filters],
    queryFn: () => getCommitments(cycleId, filters),
    staleTime: 30_000,
    enabled: Boolean(cycleId),
  });
}

export function useCreateCommitment(cycleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateCommitmentRequest) => createCommitment(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
    },
  });
}

export function useUpdateCommitment(cycleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateCommitmentRequest }) =>
      updateCommitment(id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
    },
  });
}

export function useDeleteCommitment(cycleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCommitment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
    },
  });
}

interface ReorderVariables {
  cycleId: string;
  orderedIds: string[];
}

export function useReorderCommitments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, orderedIds }: ReorderVariables) =>
      reorderCommitments(cycleId, orderedIds),
    onMutate: async ({ cycleId, orderedIds }: ReorderVariables) => {
      // Cancel in-flight queries so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ['commitments', cycleId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Commitment[]>([
        'commitments',
        cycleId,
      ]);

      // Optimistically reorder
      if (previous) {
        const reordered = orderedIds
          .map((id) => previous.find((c) => c.id === id))
          .filter((c): c is Commitment => c !== undefined);

        queryClient.setQueryData(['commitments', cycleId], reordered);
      }

      return { previous, cycleId };
    },
    onError: (
      _err: unknown,
      _vars: ReorderVariables,
      context: { previous: Commitment[] | undefined; cycleId: string } | undefined
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['commitments', context.cycleId],
          context.previous
        );
      }
    },
    onSettled: (
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      _data: void | undefined,
      _err: unknown,
      variables: ReorderVariables
    ) => {
      void queryClient.invalidateQueries({
        queryKey: ['commitments', variables.cycleId],
      });
    },
  });
}

export function useCreateUnplannedCommitment(cycleId: string) {
  const queryClient: QueryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateCommitmentRequest) => createUnplannedCommitment(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commitments', cycleId] });
      void queryClient.invalidateQueries({ queryKey: ['reconciliation', cycleId] });
    },
  });
}
