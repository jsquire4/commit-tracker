/**
 * These types match the backend RcdoTreeResponse node types.
 * The tree endpoint returns active (non-archived) items only,
 * so orgId and archivedAt are omitted from the response.
 */
export interface RallyCryNode {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  definingObjectives: DefiningObjectiveNode[];
}

export interface DefiningObjectiveNode {
  id: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  sortOrder: number;
  outcomes: OutcomeNode[];
}

export interface OutcomeNode {
  id: string;
  title: string;
  description: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  sortOrder: number;
}

export interface RcdoTree {
  rallyCries: RallyCryNode[];
}
