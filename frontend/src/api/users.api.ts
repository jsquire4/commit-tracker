import apiClient, { fetchData } from './client';
import type { User, CostBand, CreateUserRequest, UpdateUserRequest, OrgInfo, CreateOrgRequest } from '@/types/user.types';

const BASE = '/api/v1/users';

export async function getMe(): Promise<User> {
  return fetchData<User>(`${BASE}/me`);
}

export async function getTeam(): Promise<User[]> {
  return fetchData<User[]>(`${BASE}/team`);
}

export async function getAssigners(): Promise<User[]> {
  return fetchData<User[]>(`${BASE}/assigners`);
}

export async function getOrgTree(): Promise<User[]> {
  return fetchData<User[]>(`${BASE}/tree`);
}

export async function listUsers(): Promise<User[]> {
  return fetchData<User[]>(BASE);
}

export async function createUser(request: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<{ data: User }>(BASE, request);
  return response.data.data;
}

export async function updateUser(id: string, request: UpdateUserRequest): Promise<User> {
  const response = await apiClient.put<{ data: User }>(`${BASE}/${id}`, request);
  return response.data.data;
}

export async function archiveUser(id: string): Promise<void> {
  await apiClient.post(`${BASE}/${id}/archive`);
}

export async function restoreUser(id: string): Promise<void> {
  await apiClient.post(`${BASE}/${id}/restore`);
}

export async function listCostBands(): Promise<CostBand[]> {
  return fetchData<CostBand[]>(`${BASE}/cost-bands`);
}

export async function createOrg(request: CreateOrgRequest): Promise<OrgInfo> {
  const response = await apiClient.post<{ data: OrgInfo }>(`${BASE}/orgs`, request);
  return response.data.data;
}
