import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { setTokenProvider } from './api/client';
import { CommitEntryPage } from './features/commit-entry/CommitEntryPage';
import { WeeklyLifecyclePage } from './features/weekly-lifecycle/WeeklyLifecyclePage';
import { ReconciliationPage } from './features/reconciliation/ReconciliationPage';
import { ManagerDashboardPage } from './features/manager-dashboard/ManagerDashboardPage';
import { ChessboardPage } from './features/chessboard/ChessboardPage';

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
            <Routes>
              <Route path="/" element={<CommitEntryPage />} />
              <Route path="/cycle" element={<WeeklyLifecyclePage />} />
              <Route path="/reconciliation" element={<ReconciliationPage />} />
              <Route path="/dashboard" element={<ManagerDashboardPage />} />
              <Route path="/chessboard" element={<ChessboardPage />} />
            </Routes>
          </Layout>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
