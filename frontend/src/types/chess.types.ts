export interface ChessCategory {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
}
