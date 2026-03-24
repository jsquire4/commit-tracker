export interface GrowthArea {
  id: string;
  label: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrowthAreaRequest {
  label: string;
  description?: string;
}

export interface UpdateGrowthAreaRequest {
  label?: string;
  description?: string;
  sortOrder?: number;
}
