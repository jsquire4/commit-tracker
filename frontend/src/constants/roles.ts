import type { UserRole } from '@/types/enums';

export const MANAGER_AND_ABOVE = new Set<UserRole>(['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE']);
export const DIRECTOR_AND_ABOVE = new Set<UserRole>(['DIRECTOR', 'VP', 'EXECUTIVE']);
export const VP_AND_ABOVE = new Set<UserRole>(['VP', 'EXECUTIVE']);
