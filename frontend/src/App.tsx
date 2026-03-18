import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { setTokenProvider } from './api/client';
import { AuthContext as AuthCtx } from './hooks/useAuth';
import type { AuthContextValue } from './hooks/useAuth';

const CommitEntryPage = lazy(() => import('./features/commit-entry/CommitEntryPage').then(m => ({ default: m.CommitEntryPage })));
const WeeklyLifecyclePage = lazy(() => import('./features/weekly-lifecycle/WeeklyLifecyclePage').then(m => ({ default: m.WeeklyLifecyclePage })));
const ReconciliationPage = lazy(() => import('./features/reconciliation/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const ManagerDashboardPage = lazy(() => import('./features/manager-dashboard/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const ChessboardPage = lazy(() => import('./features/chessboard/ChessboardPage').then(m => ({ default: m.ChessboardPage })));
const ExecutiveHealthPage = lazy(() => import('./features/observatory/ExecutiveHealthPage').then(m => ({ default: m.ExecutiveHealthPage })));
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
                  <Route path="/" element={<CommitEntryPage />} />
                  <Route path="/cycle" element={<WeeklyLifecyclePage />} />
                  <Route path="/reconciliation" element={<ReconciliationPage />} />
                  <Route path="/reconciliation/:cycleId" element={<ReconciliationPage />} />
                  <Route path="/dashboard" element={<ManagerDashboardPage />} />
                  <Route path="/chessboard" element={<ChessboardPage />} />
                  <Route path="/observatory" element={<ExecutiveHealthPage />} />
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
