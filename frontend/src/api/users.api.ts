import { fetchData } from './client';
import type { User } from '@/types';

const BASE = '/api/v1/users';

export async function getMe(): Promise<User> {
  return fetchData<User>(`${BASE}/me`);
}

export async function getTeam(): Promise<User[]> {
  return fetchData<User[]>(`${BASE}/team`);
}

export async function getOrgTree(): Promise<User[]> {
  return fetchData<User[]>(`${BASE}/org-tree`);
}
