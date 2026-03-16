import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useUIStore } from '@/stores/ui.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DashboardFilters } from './DashboardFilters';
import { AlignmentGapChart } from './AlignmentGapChart';
import { AssignmentSignals } from './AssignmentSignals';
import { TeamRollupTable } from './TeamRollupTable';
const ALLOWED_ROLES = ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE', 'ANALYST'];
export function ManagerDashboardPage() {
    const { role } = useAuth();
    const dashboardFilters = useUIStore((s) => s.dashboardFilters);
    const setDashboardFilters = useUIStore((s) => s.setDashboardFilters);
    // Track active cycle ID for the detail expansion — derived from the loaded data
    const [activeCycleId, setActiveCycleId] = useState('');
    const { data, isLoading, isError, error } = useDashboard(dashboardFilters);
    // Role guard
    if (!role || !ALLOWED_ROLES.includes(role)) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8", children: [_jsx("div", { className: "w-12 h-12 bg-red-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 text-red-600", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" }) }) }), _jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "Access Restricted" }), _jsx("p", { className: "text-sm text-gray-500 max-w-sm", children: "The Manager Dashboard is only accessible to managers and above." })] }));
    }
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(LoadingSpinner, { size: "lg", label: "Loading dashboard\u2026" }) }));
    }
    if (isError || !data) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8", children: [_jsx("div", { className: "w-12 h-12 bg-red-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 text-red-600", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }), _jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "Failed to load dashboard" }), _jsx("p", { className: "text-sm text-gray-500 max-w-sm", children: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.' }), _jsx("button", { type: "button", className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors", onClick: () => window.location.reload(), children: "Retry" })] }));
    }
    const { teamRollup, alignmentSignal, assignmentAttribution } = data;
    // Build team member options for the filters dropdown
    const teamMemberOptions = teamRollup.members.map((m) => ({
        id: m.userId,
        displayName: m.displayName,
    }));
    function handleFiltersChange(partial) {
        setDashboardFilters(partial);
    }
    function handleSegmentClick(userId, _category) {
        if (userId) {
            setDashboardFilters({ teamMemberId: userId });
        }
    }
    // Use cycleWeekStart as a stand-in for cycleId when fetching member details.
    // In a real integration the API would return a cycleId; use weekStart or empty string.
    const derivedCycleId = activeCycleId || dashboardFilters.cycleWeekStart || '';
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Manager Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Weekly commitment overview and alignment signals for your team." })] }), _jsx(DashboardFilters, { filters: dashboardFilters, onChange: handleFiltersChange, teamMemberOptions: teamMemberOptions }), _jsx(AlignmentGapChart, { aggregate: alignmentSignal, members: alignmentSignal.byTeamMember, onSegmentClick: handleSegmentClick }), _jsx(AssignmentSignals, { signals: assignmentAttribution }), _jsx(TeamRollupTable, { members: teamRollup.members, cycleId: derivedCycleId, onSelectMember: (id) => {
                    // When a member is selected via the table, update the filter as well
                    setDashboardFilters({ teamMemberId: id });
                    setActiveCycleId(activeCycleId); // keep existing cycle; noop placeholder
                } })] }));
}
