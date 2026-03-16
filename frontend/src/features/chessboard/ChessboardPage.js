import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useAuth } from '@/hooks/useAuth';
import { getTeam } from '@/api/users.api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ChessboardGrid } from './ChessboardGrid';
const MANAGER_ROLES = new Set(['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE']);
/** Derive distinct ChessCategory objects from a list of commitments */
function deriveCategoriesFromCommitments(commitments) {
    const seen = new Map();
    commitments.forEach((c) => {
        if (c.chessCategoryId && !seen.has(c.chessCategoryId)) {
            seen.set(c.chessCategoryId, {
                id: c.chessCategoryId,
                orgId: '',
                name: c.chessCategoryName ?? c.chessCategoryId,
                description: null,
                colorHex: null,
                sortOrder: seen.size,
                isActive: true,
            });
        }
    });
    return Array.from(seen.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}
export function ChessboardPage() {
    const { userId, role } = useAuth();
    const isManager = role !== null && MANAGER_ROLES.has(role);
    const [selectedUserId, setSelectedUserId] = useState(userId);
    const cycleQuery = useCurrentCycle();
    const cycleId = cycleQuery.data?.id ?? '';
    const commitmentsQuery = useCommitments(cycleId, {
        userId: selectedUserId,
    });
    const teamQuery = useQuery({
        queryKey: ['users', 'team'],
        queryFn: getTeam,
        enabled: isManager,
        staleTime: 60_000,
    });
    const isLoading = cycleQuery.isLoading || commitmentsQuery.isLoading;
    const isError = cycleQuery.isError || commitmentsQuery.isError;
    const commitments = commitmentsQuery.data ?? [];
    const categories = deriveCategoriesFromCommitments(commitments);
    // Resolve the display name for the selected user
    const selectedUserName = selectedUserId === userId
        ? 'My Commitments'
        : (teamQuery.data?.find((m) => m.id === selectedUserId)?.displayName ?? 'Team Member');
    return (_jsxs("div", { className: "p-6 max-w-full", children: [_jsx(PageHeader, { title: "Chessboard View", ...(cycleQuery.data
                    ? { subtitle: `${cycleQuery.data.label} · ${cycleQuery.data.state}` }
                    : {}), actions: isManager && teamQuery.data && teamQuery.data.length > 0 ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { htmlFor: "chessboard-user-select", className: "text-sm font-medium text-gray-700 whitespace-nowrap", children: "Viewing:" }), _jsxs("select", { id: "chessboard-user-select", className: [
                                'text-sm border border-gray-300 rounded-md px-3 py-1.5',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'bg-white text-gray-900',
                            ].join(' '), value: selectedUserId, onChange: (e) => setSelectedUserId(e.target.value), children: [_jsx("option", { value: userId, children: "My Commitments" }), teamQuery.data.map((member) => (_jsx("option", { value: member.id, children: member.displayName }, member.id)))] })] })) : null }), isLoading && (_jsx(LoadingSpinner, { fullPage: true, label: "Loading commitments\u2026" })), !isLoading && isError && (_jsx("div", { className: "rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700", children: "Failed to load chessboard data. Please refresh and try again." })), !isLoading && !isError && commitments.length === 0 && (_jsx(EmptyState, { title: "No commitments yet", description: selectedUserId === userId
                    ? 'Add commitments in the Commit Entry view to see them here.'
                    : `${selectedUserName} has no commitments for this cycle.` })), !isLoading && !isError && commitments.length > 0 && (_jsx(_Fragment, { children: _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "flex flex-col gap-3 pt-8 shrink-0 w-16", children: ['High', 'Medium', 'Low'].map((tier) => (_jsx("div", { className: "flex items-center justify-end min-h-[72px]", children: _jsx("span", { className: [
                                        'text-xs font-semibold uppercase tracking-wide rotate-0',
                                        tier === 'High' ? 'text-red-600' : '',
                                        tier === 'Medium' ? 'text-yellow-600' : '',
                                        tier === 'Low' ? 'text-green-600' : '',
                                    ].join(' '), children: tier }) }, tier))) }), _jsx("div", { className: "flex-1 min-w-0", children: _jsx(ChessboardGrid, { commitments: commitments, categories: categories }) })] }) }))] }));
}
