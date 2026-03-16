import { createContext, useContext } from 'react';
import type { UserRole } from '@/types';

export interface AuthContextValue {
  userId: string;
  orgId: string;
  token: string;
  role: UserRole | null;
  displayName?: string;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Consumes AuthContext provided by the host app (via AuthContext.Provider in App.tsx).
 * Returns userId, orgId, token, role, and optional displayName.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthContext.Provider');
  }
  return ctx;
}
