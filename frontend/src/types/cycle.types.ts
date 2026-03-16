export type CycleState = 'DRAFT' | 'LOCKED' | 'RECONCILING' | 'RECONCILED';

export interface Cycle {
  id: string;
  orgId: string;
  label: string;
  state: CycleState;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  commitmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CycleTransitionRequest {
  targetState: CycleState;
  reason?: string;
}

/** Alias used in API module signatures */
export type TransitionRequest = CycleTransitionRequest;

export interface CycleFilters {
  state?: CycleState;
  dateFrom?: string;
  dateTo?: string;
}
