import apiClient, { fetchData } from './client';
import type {
  ReconciliationViewResponse,
  ReconcileCommitmentRequest,
  ReconciliationRecord,
} from '@/types';
import type { Cycle } from '@/types/cycle.types';

const BASE = '/api/v1/reconciliation';

export async function getReconciliationView(
  cycleId: string
): Promise<ReconciliationViewResponse> {
  return fetchData<ReconciliationViewResponse>(`${BASE}/cycles/${cycleId}`);
}

export async function reconcileCommitment(
  id: string,
  req: ReconcileCommitmentRequest
): Promise<ReconciliationRecord> {
  const response = await apiClient.put<{ data: ReconciliationRecord }>(
    `${BASE}/commitments/${id}`,
    req
  );
  return response.data.data;
}

export async function completeReconciliation(cycleId: string): Promise<Cycle> {
  const response = await apiClient.post<{ data: Cycle }>(
    `${BASE}/cycles/${cycleId}/complete`
  );
  return response.data.data;
}
