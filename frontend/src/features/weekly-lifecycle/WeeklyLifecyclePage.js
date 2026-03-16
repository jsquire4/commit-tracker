import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CycleStateIndicator } from './CycleStateIndicator';
import { TransitionActions } from './TransitionActions';
import { CarryForwardPanel } from './CarryForwardPanel';
// Derive transitions from the cycle's audit timestamps.
// The backend does not currently return a transitions log, so we reconstruct
// an approximation from the fields that are available.
function deriveTransitions(cycle) {
    const transitions = [];
    // DRAFT is the initial state, entered at createdAt
    transitions.push({
        fromState: null,
        toState: 'DRAFT',
        transitionedAt: cycle.createdAt,
    });
    // Future states cannot be inferred from Cycle alone — they would require
    // a real transition log endpoint. For now, only the creation entry is shown.
    return transitions;
}
function cycleStateBadgeVariant(state) {
    switch (state) {
        case 'DRAFT':
            return 'blue';
        case 'LOCKED':
            return 'yellow';
        case 'RECONCILING':
            return 'gray';
        case 'RECONCILED':
            return 'green';
    }
}
function formatDateRange(startsAt, endsAt) {
    const fmt = (s) => new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}
// Placeholder — full history would come from a listCycles hook, which is out
// of scope for this component. We render a stub that shows no past cycles yet.
function CycleHistory({ currentCycleId: _currentCycleId }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("section", { className: "rounded-lg border border-gray-200 bg-white", children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), className: "flex w-full items-center justify-between px-5 py-4 text-left", children: [_jsx("span", { className: "text-sm font-semibold text-gray-700", children: "Cycle History" }), _jsx("svg", { className: `h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 9l-7 7-7-7" }) })] }), open && (_jsx("div", { className: "border-t border-gray-100 px-5 py-4", children: _jsx("p", { className: "text-sm text-gray-400", children: "Past cycle history will appear here once previous cycles are available." }) }))] }));
}
// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
export function WeeklyLifecyclePage() {
    const { data: cycle, isLoading: cycleLoading, error: cycleError } = useCurrentCycle();
    const { data: commitments, isLoading: commitmentsLoading, } = useCommitments(cycle?.id ?? '', undefined);
    if (cycleLoading || commitmentsLoading) {
        return (_jsx("div", { className: "flex min-h-[50vh] items-center justify-center", children: _jsx(LoadingSpinner, { size: "lg", label: "Loading cycle\u2026" }) }));
    }
    if (cycleError || !cycle) {
        return (_jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 p-6", children: _jsx("p", { className: "text-sm font-medium text-red-700", children: cycleError instanceof Error
                    ? cycleError.message
                    : 'Failed to load the current cycle. Please try again.' }) }));
    }
    const allCommitments = commitments ?? [];
    const carriedItems = allCommitments.filter((c) => c.carriedFromCommitmentId !== null);
    const transitions = deriveTransitions(cycle);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { title: cycle.label, subtitle: formatDateRange(cycle.startsAt, cycle.endsAt), badge: _jsx(Badge, { variant: cycleStateBadgeVariant(cycle.state), children: cycle.state.charAt(0) + cycle.state.slice(1).toLowerCase() }) }), _jsx(CycleStateIndicator, { currentState: cycle.state, transitions: transitions }), _jsx(TransitionActions, { cycle: cycle, commitmentCount: allCommitments.length }), _jsx(CarryForwardPanel, { carriedItems: carriedItems, cycleId: cycle.id }), _jsx(CycleHistory, { currentCycleId: cycle.id })] }));
}
