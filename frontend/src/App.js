import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
        },
    },
});
export default function App({ basename, authContext }) {
    setTokenProvider(() => authContext.token);
    return (_jsx(ErrorBoundary, { children: _jsx(BrowserRouter, { basename: basename, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(CommitEntryPage, {}) }), _jsx(Route, { path: "/cycle", element: _jsx(WeeklyLifecyclePage, {}) }), _jsx(Route, { path: "/reconciliation", element: _jsx(ReconciliationPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(ManagerDashboardPage, {}) }), _jsx(Route, { path: "/chessboard", element: _jsx(ChessboardPage, {}) })] }) }) }) }) }));
}
