import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { setTokenProvider } from './api/client';
import { AuthContext as AuthCtx } from './hooks/useAuth';
import type { AuthContextValue } from './hooks/useAuth';

// 3-view architecture
const MyWeekPage = lazy(() => import('./features/my-week/MyWeekPage').then(m => ({ default: m.MyWeekPage })));
const MyTeamPage = lazy(() => import('./features/my-team/MyTeamPage').then(m => ({ default: m.MyTeamPage })));
const BriefingView = lazy(() => import('./features/briefing/BriefingView').then(m => ({ default: m.BriefingView })));

export interface AuthContext {
  token: string;
  userId: string;
  orgId: string;
  role?: string;
  displayName?: string;
}

interface AppProps {
  basename: string;
  authContext: AuthContext;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export default function App({ basename, authContext }: AppProps) {
  setTokenProvider(() => authContext.token);

  const authValue = useMemo<AuthContextValue>(() => ({
    userId: authContext.userId,
    orgId: authContext.orgId,
    token: authContext.token,
    role: (authContext.role as AuthContextValue['role']) ?? null,
    ...(authContext.displayName != null ? { displayName: authContext.displayName } : {}),
  }), [authContext.userId, authContext.orgId, authContext.token, authContext.role, authContext.displayName]);

  return (
    <ErrorBoundary>
      <AuthCtx.Provider value={authValue}>
        <BrowserRouter basename={basename}>
          <QueryClientProvider client={queryClient}>
            <Layout>
              <Suspense fallback={<LoadingSpinner size="lg" fullPage />}>
                <Routes>
                  {/* 3-view architecture */}
                  <Route path="/" element={<MyWeekPage />} />
                  <Route path="/team" element={<MyTeamPage />} />
                  <Route path="/briefing" element={<BriefingView />} />

                  {/* Backward-compat redirects */}
                  <Route path="/cycle" element={<Navigate to="/" replace />} />
                  <Route path="/reconciliation" element={<Navigate to="/" replace />} />
                  <Route path="/reconciliation/:cycleId" element={<Navigate to="/" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/team" replace />} />
                  <Route path="/observatory" element={<Navigate to="/briefing" replace />} />
                  <Route path="/observatory/team/:managerId" element={<Navigate to="/briefing" replace />} />
                  <Route path="/observatory/config" element={<Navigate to="/briefing?mode=config" replace />} />
                  <Route path="/observatory/portfolio" element={<Navigate to="/briefing" replace />} />
                  <Route path="/strategy" element={<Navigate to="/briefing?mode=strategy" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </QueryClientProvider>
        </BrowserRouter>
      </AuthCtx.Provider>
    </ErrorBoundary>
  );
}
