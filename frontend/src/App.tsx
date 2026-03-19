import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { setTokenProvider } from './api/client';
import { AuthContext as AuthCtx } from './hooks/useAuth';
import type { AuthContextValue } from './hooks/useAuth';

// Primary navigation pages
const ThisWeekPage = lazy(() => import('./features/this-week/ThisWeekPage').then(m => ({ default: m.ThisWeekPage })));
const MyTeamPage = lazy(() => import('./features/team/MyTeamPage').then(m => ({ default: m.MyTeamPage })));
const BriefingPage = lazy(() => import('./features/briefing/BriefingPage').then(m => ({ default: m.BriefingPage })));

// Drill-down and secondary pages
const ReconciliationPage = lazy(() => import('./features/reconciliation/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const TeamDrillDown = lazy(() => import('./features/observatory/TeamDrillDown').then(m => ({ default: m.TeamDrillDown })));
const ObservatoryConfigPage = lazy(() => import('./features/observatory/ObservatoryConfigPage').then(m => ({ default: m.ObservatoryConfigPage })));
const PortfolioPage = lazy(() => import('./features/observatory/PortfolioPage').then(m => ({ default: m.PortfolioPage })));

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
                  {/* Primary navigation */}
                  <Route path="/" element={<ThisWeekPage />} />
                  <Route path="/team" element={<MyTeamPage />} />
                  <Route path="/briefing" element={<BriefingPage />} />

                  {/* Workflow pages */}
                  <Route path="/reconciliation" element={<ReconciliationPage />} />
                  <Route path="/reconciliation/:cycleId" element={<ReconciliationPage />} />
                  <Route path="/observatory/team/:managerId" element={<TeamDrillDown />} />
                  <Route path="/observatory/config" element={<ObservatoryConfigPage />} />
                  <Route path="/observatory/portfolio" element={<PortfolioPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </QueryClientProvider>
        </BrowserRouter>
      </AuthCtx.Provider>
    </ErrorBoundary>
  );
}
