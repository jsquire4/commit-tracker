import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useReconciliationView, useCompleteReconciliation, } from '@/hooks/useReconciliation';
import { PlannedVsActualTable } from './PlannedVsActualTable';
import { UnplannedWorkEntry } from './UnplannedWorkEntry';
export function ReconciliationPage() {
    const navigate = useNavigate();
    const { data: cycle, isLoading: cycleLoading } = useCurrentCycle();
    // Redirect if not in RECONCILING state
    useEffect(() => {
        if (!cycleLoading && cycle && cycle.state !== 'RECONCILING') {
            navigate('/');
        }
    }, [cycle, cycleLoading, navigate]);
    const cycleId = cycle?.id ?? '';
    const { data: view, isLoading: viewLoading, isError: viewError, refetch, } = useReconciliationView(cycleId);
    const completeMutation = useCompleteReconciliation(cycleId);
    // Loading states
    if (cycleLoading || (!cycle && !cycleLoading)) {
        return (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx("p", { className: "text-gray-500", children: "Loading cycle\u2026" }) }));
    }
    if (viewLoading) {
        return (_jsx("div", { className: "flex items-center justify-center py-16", children: _jsx("p", { className: "text-gray-500", children: "Loading reconciliation view\u2026" }) }));
    }
    if (viewError || !view) {
        return (_jsxs("div", { className: "flex flex-col items-center gap-3 py-16", children: [_jsx("p", { className: "text-red-600", children: "Failed to load reconciliation data." }), _jsx("button", { type: "button", onClick: () => void refetch(), className: "text-sm text-blue-600 hover:underline", children: "Retry" })] }));
    }
    const { commitments, summary } = view;
    const allReconciled = summary.reconciledCount >= summary.totalCommitments && summary.totalCommitments > 0;
    async function handleSubmit() {
        if (!allReconciled)
            return;
        try {
            await completeMutation.mutateAsync();
            navigate('/');
        }
        catch {
            // Error state handled below
        }
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: "Reconciliation" }), _jsxs("p", { className: "text-sm text-gray-500 mt-0.5", children: [cycle?.label, " \u2014 Review your planned commitments and mark actual outcomes."] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("span", { className: "text-sm text-gray-500", children: [summary.reconciledCount, " / ", summary.totalCommitments, " reconciled"] }) })] }), _jsx(PlannedVsActualTable, { commitments: commitments, cycleId: cycleId }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-700 mb-2", children: "Unplanned Work" }), _jsx(UnplannedWorkEntry, { cycleId: cycleId, onAdd: () => void refetch() })] }), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-700 mb-3", children: "Summary" }), _jsxs("dl", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: [_jsx(SummaryItem, { label: "Completed", value: summary.completedCount, colorClass: "text-green-700 bg-green-50" }), _jsx(SummaryItem, { label: "Partial", value: summary.partiallyCompletedCount, colorClass: "text-yellow-700 bg-yellow-50" }), _jsx(SummaryItem, { label: "Not Started", value: summary.notStartedCount, colorClass: "text-red-700 bg-red-50" }), _jsx(SummaryItem, { label: "Carried Forward", value: summary.carriedForwardCount, colorClass: "text-blue-700 bg-blue-50" })] }), summary.totalCommitments > 0 && (_jsxs("div", { className: "mt-3 pt-3 border-t border-gray-100 flex gap-6 text-sm text-gray-600", children: [_jsxs("span", { children: ["Completion rate:", ' ', _jsxs("strong", { className: "text-gray-900", children: [Math.round(summary.completionRate * 100), "%"] })] }), _jsxs("span", { children: ["Bullet completion:", ' ', _jsxs("strong", { className: "text-gray-900", children: [Math.round(summary.bulletCompletionRate * 100), "%"] })] })] }))] }), _jsxs("div", { className: "flex items-center justify-between gap-4 pt-2 pb-8", children: [!allReconciled && (_jsxs("p", { className: "text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2", children: ["Reconcile all ", summary.totalCommitments - summary.reconciledCount, " remaining commitment", summary.totalCommitments - summary.reconciledCount !== 1 ? 's' : '', " before submitting."] })), allReconciled && (_jsx("p", { className: "text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2", children: "All commitments reconciled \u2014 ready to submit." })), _jsx("button", { type: "button", onClick: () => void handleSubmit(), disabled: !allReconciled || completeMutation.isPending, className: [
                            'ml-auto px-6 py-2.5 text-sm font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                            allReconciled && !completeMutation.isPending
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                        ].join(' '), children: completeMutation.isPending ? 'Submitting…' : 'Submit Reconciliation' })] }), completeMutation.isError && (_jsx("p", { role: "alert", className: "text-sm text-red-600 -mt-4", children: "Failed to submit reconciliation. Please try again." }))] }));
}
function SummaryItem({ label, value, colorClass }) {
    return (_jsxs("div", { className: `rounded-lg p-3 ${colorClass}`, children: [_jsx("dt", { className: "text-xs font-medium uppercase tracking-wide opacity-75", children: label }), _jsx("dd", { className: "text-2xl font-bold mt-0.5", children: value })] }));
}
