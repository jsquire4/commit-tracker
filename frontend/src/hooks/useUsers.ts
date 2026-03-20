import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMe,
  listUsers,
  listCostBands,
  createUser,
  updateUser,
  archiveUser,
  restoreUser,
  createOrg,
} from '@/api/users.api';
import type { CreateUserRequest, UpdateUserRequest, CreateOrgRequest } from '@/types/user.types';

export function useMe() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: getMe,
    staleTime: 60_000,
  });
}

export function useUserList() {
  return useQuery({
    queryKey: ['users', 'list'],
    queryFn: listUsers,
    staleTime: 30_000,
  });
}

export function useCostBands() {
  return useQuery({
    queryKey: ['users', 'cost-bands'],
    queryFn: listCostBands,
    staleTime: 5 * 60_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUser(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateUserRequest }) =>
      updateUser(id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useArchiveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRestoreUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateOrgRequest) => createOrg(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
