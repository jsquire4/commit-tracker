import { createContext, useContext } from 'react';
export const AuthContext = createContext(null);
/**
 * Consumes AuthContext provided by the host app (via AuthContext.Provider in App.tsx).
 * Returns userId, orgId, token, role, and optional displayName.
 */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthContext.Provider');
    }
    return ctx;
}
