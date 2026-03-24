import type { UserRole } from './enums';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  reportsTo: string | null;
  reportsToDisplayName: string | null;
  isActive: boolean;
  costBandId: string | null;
  costBandName: string | null;
  costBandTier: number | null;
  weeklyCapacityHours: number | null; // Backend: BigDecimal — serialized as JSON number
}

export interface TeamMember extends User {
  commitmentCount: number;
  reconciledCount: number;
}

export interface CostBand {
  id: string;
  name: string;
  tier: number;
}

export interface CreateUserRequest {
  displayName: string;
  email: string;
  role: UserRole;
  reportsToId?: string;
  costBandId?: string;
  weeklyCapacityHours?: number;
}

export interface UpdateUserRequest {
  displayName: string;
  role: UserRole;
  reportsToId?: string;
  costBandId?: string;
  weeklyCapacityHours?: number;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface CreateOrgRequest {
  name: string;
  slug?: string;
  timezone?: string;
}
