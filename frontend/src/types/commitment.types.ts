import type { CompletionHorizon, CompletionDay, CompletionTimeBlock, ReconciliationStatus } from './enums';

export interface TaskBullet {
  id: string;
  body: string;
  sortOrder: number;
  isCompleted: boolean;
}

export interface RcdoLink {
  rallyCryId: string | null;
  rallyCryTitle: string | null;
  definingObjectiveId: string | null;
  definingObjectiveTitle: string | null;
  outcomeId: string | null;
  outcomeTitle: string | null;
}

export type AssignmentAttribution =
  | { kind: 'SELF_DIRECTED' }
  | { kind: 'ASSIGNED_BY'; assignedById: string; assignedByName: string };

export interface Commitment {
  id: string;
  cycleId: string;
  userId: string;
  userDisplayName: string;
  title: string;
  description: string | null;
  rcdoLink: RcdoLink;
  chessCategoryId: string | null;
  chessCategoryName: string | null;
  completionHorizon: CompletionHorizon;
  completionDay: CompletionDay | null;
  completionTimeBlock: CompletionTimeBlock | null;
  priorityRank: number;
  bullets: TaskBullet[];
  attribution: AssignmentAttribution;
  carriedFromCommitmentId: string | null;
  isUnplanned: boolean;
  estimatedHours: number | null;
  reconciliationStatus: ReconciliationStatus | null;
  reconciliationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommitmentRequest {
  cycleId: string;
  title: string;
  description?: string;
  bullets: string[];
  completionHorizon: CompletionHorizon;
  completionDay?: CompletionDay;
  completionTimeBlock?: CompletionTimeBlock;
  chessCategoryId?: string;
  rallyCryId?: string;
  definingObjectiveId?: string;
  outcomeId?: string;
  assignedBy?: string;
}

export interface UpdateCommitmentRequest extends Partial<CreateCommitmentRequest> {
  id: string;
}

export interface ReorderCommitmentsRequest {
  commitmentIds: string[];
}

export interface CommitmentFilters {
  userId?: string;
  rallyCryId?: string;
  definingObjectiveId?: string;
  chessCategoryId?: string;
  assignedBy?: string;
}
