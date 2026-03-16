import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { setTokenProvider } from './api/client';

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
              <Route path="/" element={<div className="p-4">Commit Entry — coming soon</div>} />
              <Route path="/cycle" element={<div className="p-4">Weekly Lifecycle — coming soon</div>} />
              <Route path="/reconciliation" element={<div className="p-4">Reconciliation — coming soon</div>} />
              <Route path="/dashboard" element={<div className="p-4">Manager Dashboard — coming soon</div>} />
              <Route path="/chessboard" element={<div className="p-4">Chessboard — coming soon</div>} />
            </Routes>
          </Layout>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
