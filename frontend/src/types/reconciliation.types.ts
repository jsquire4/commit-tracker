import type { CompletionHorizon, ReconciliationStatus } from './enums';

export interface ReconciliationRecord {
  id: string;
  commitmentId: string;
  cycleId: string;
  status: ReconciliationStatus;
  notes: string | null;
  plannedHorizon: CompletionHorizon | null;
  reconciledAt: string;
  reconciledByUserId: string;
  displacementCategory: import('./observatory.types').DisplacementCategory | null;
  displacementDetail: string | null;
  displacingCommitmentId: string | null;
  displacingCommitmentTitle: string | null;
}

export interface ReconcileCommitmentRequest {
  status: ReconciliationStatus;
  completionNotes?: string;
  carryForward: boolean;
  bulletStatuses: BulletStatus[];
  displacementCategory?: import('./observatory.types').DisplacementCategory;
  displacementDetail?: string;
  displacingCommitmentId?: string;
}

export interface BulletStatus {
  bulletId: string;
  done: boolean;
}

/** Mirrors backend ReconciliationViewResponse */
export interface ReconciliationViewResponse {
  cycle: import('./cycle.types').Cycle;
  commitments: CommitmentReconciliationDetail[];
  summary: ReconciliationSummary;
  /** True when every user in the org has reconciled all their commitments (org-wide gate). */
  allReconciled: boolean;
}

export interface CommitmentReconciliationDetail {
  commitment: import('./commitment.types').Commitment;
  reconciliation: ReconciliationRecord | null;
}

export interface ReconciliationSummary {
  totalCommitments: number;
  reconciledCount: number;
  completedCount: number;
  partiallyCompletedCount: number;
  notStartedCount: number;
  carriedForwardCount: number;
  completionRate: number;
  bulletCompletionRate: number;
}
