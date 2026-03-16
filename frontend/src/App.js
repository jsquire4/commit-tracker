import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { setTokenProvider } from './api/client';
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
    return (_jsx(ErrorBoundary, { children: _jsx(BrowserRouter, { basename: basename, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx("div", { className: "p-4", children: "Commit Entry \u2014 coming soon" }) }), _jsx(Route, { path: "/cycle", element: _jsx("div", { className: "p-4", children: "Weekly Lifecycle \u2014 coming soon" }) }), _jsx(Route, { path: "/reconciliation", element: _jsx("div", { className: "p-4", children: "Reconciliation \u2014 coming soon" }) }), _jsx(Route, { path: "/dashboard", element: _jsx("div", { className: "p-4", children: "Manager Dashboard \u2014 coming soon" }) }), _jsx(Route, { path: "/chessboard", element: _jsx("div", { className: "p-4", children: "Chessboard \u2014 coming soon" }) })] }) }) }) }) }));
}
