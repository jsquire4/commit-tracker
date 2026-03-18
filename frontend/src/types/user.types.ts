import type { UserRole } from './enums';

export interface User {
  id: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  reportsToId: string | null;
  isActive: boolean;
  costBandId: string | null;
  costBandName: string | null;
  costBandTier: number | null;
  weeklyCapacityHours: number | null;
}

export interface TeamMember extends User {
  commitmentCount: number;
  reconciledCount: number;
}
