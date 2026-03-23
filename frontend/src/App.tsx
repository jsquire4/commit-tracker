import { lazy, Suspense, useMemo, useState } from 'react';
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
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

// New pages
const StrategyPage = lazy(() => import('./features/strategy/StrategyPage').then(m => ({ default: m.StrategyPage })));
const PortfolioPage = lazy(() => import('./features/portfolio/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const ObservatoryPage = lazy(() => import('./features/observatory/ObservatoryPage').then(m => ({ default: m.ObservatoryPage })));
const MethodologyPage = lazy(() => import('./features/methodology/MethodologyPage').then(m => ({ default: m.MethodologyPage })));
const LandingPage = lazy(() => import('./features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const ArchitecturePage = lazy(() => import('./features/architecture/ArchitecturePage').then(m => ({ default: m.ArchitecturePage })));

export interface AuthContext {
  token: string;
  userId: string;
  orgId: string;
  role?: string;
  displayName?: string;
  orgName?: string;
}

interface AppProps {
  basename: string;
  authContext: AuthContext;
}

export default function App({ basename, authContext }: AppProps) {
  // QueryClient inside the component ensures one instance per mount (not per module load).
  // Prevents stale cache surviving HMR and is SSR-safe.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  }));

  setTokenProvider(() => authContext.token);

  const authValue = useMemo<AuthContextValue>(() => ({
    userId: authContext.userId,
    orgId: authContext.orgId,
    token: authContext.token,
    role: (authContext.role as AuthContextValue['role']) ?? null,
    ...(authContext.displayName != null ? { displayName: authContext.displayName } : {}),
    ...(authContext.orgName != null ? { orgName: authContext.orgName } : {}),
  }), [authContext.userId, authContext.orgId, authContext.token, authContext.role, authContext.displayName, authContext.orgName]);

  return (
    <ErrorBoundary>
      <AuthCtx.Provider value={authValue}>
        <BrowserRouter basename={basename}>
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={<LoadingSpinner size="lg" fullPage />}>
              <Routes>
                {/* Standalone pages — outside Layout (no nav shell) */}
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/architecture" element={<ArchitecturePage />} />

                {/* App pages — inside Layout */}
                <Route path="/*" element={
                  <Layout>
                    <Routes>
                      {/* Core views */}
                      <Route path="/" element={<MyWeekPage />} />
                      <Route path="/team" element={<MyTeamPage />} />
                      <Route path="/briefing" element={<BriefingView />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/strategy" element={<StrategyPage />} />
                      <Route path="/portfolio" element={<PortfolioPage />} />

                      {/* Observatory — VP/EXECUTIVE only */}
                      <Route path="/observatory" element={<ObservatoryPage />} />
                      <Route path="/methodology" element={<MethodologyPage />} />

                      {/* Backward-compat redirects */}
                      <Route path="/cycle" element={<Navigate to="/" replace />} />
                      <Route path="/reconciliation" element={<Navigate to="/" replace />} />
                      <Route path="/reconciliation/:cycleId" element={<Navigate to="/" replace />} />
                      <Route path="/dashboard" element={<Navigate to="/team" replace />} />
                      <Route path="/observatory/team/:managerId" element={<Navigate to="/observatory" replace />} />
                      <Route path="/observatory/config" element={<Navigate to="/settings" replace />} />
                      <Route path="/observatory/portfolio" element={<Navigate to="/portfolio" replace />} />
                    </Routes>
                  </Layout>
                } />
              </Routes>
            </Suspense>
          </QueryClientProvider>
        </BrowserRouter>
      </AuthCtx.Provider>
    </ErrorBoundary>
  );
}
