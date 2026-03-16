import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { setTokenProvider } from './api/client';

const CommitEntryPage = lazy(() => import('./features/commit-entry/CommitEntryPage').then(m => ({ default: m.CommitEntryPage })));
const WeeklyLifecyclePage = lazy(() => import('./features/weekly-lifecycle/WeeklyLifecyclePage').then(m => ({ default: m.WeeklyLifecyclePage })));
const ReconciliationPage = lazy(() => import('./features/reconciliation/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const ManagerDashboardPage = lazy(() => import('./features/manager-dashboard/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const ChessboardPage = lazy(() => import('./features/chessboard/ChessboardPage').then(m => ({ default: m.ChessboardPage })));

interface AuthContext {
  token: string;
  userId: string;
  orgId: string;
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

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <QueryClientProvider client={queryClient}>
          <Layout>
            <Suspense fallback={<LoadingSpinner size="lg" fullPage />}>
              <Routes>
                <Route path="/" element={<CommitEntryPage />} />
                <Route path="/cycle" element={<WeeklyLifecyclePage />} />
                <Route path="/reconciliation" element={<ReconciliationPage />} />
                <Route path="/dashboard" element={<ManagerDashboardPage />} />
                <Route path="/chessboard" element={<ChessboardPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
