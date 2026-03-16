import { fetchData } from './client';
import type { DashboardFilters, DashboardResponse } from '@/types';

const BASE = '/api/v1/dashboard';

export async function getDashboard(
  filters?: DashboardFilters
): Promise<DashboardResponse> {
  return fetchData<DashboardResponse>(BASE, filters as Record<string, unknown>);
}
