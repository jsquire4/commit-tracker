import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function SignalCard({ label, value, isAmber = false, sublabel }) {
    return (_jsxs("div", { className: `flex flex-col gap-1 rounded-lg border p-4 flex-1 min-w-[200px] transition-colors ${isAmber
            ? 'bg-amber-50 border-amber-300'
            : 'bg-white border-gray-200'}`, children: [_jsx("p", { className: `text-xs font-medium uppercase tracking-wide ${isAmber ? 'text-amber-700' : 'text-gray-500'}`, children: label }), _jsx("p", { className: `text-2xl font-bold ${isAmber ? 'text-amber-800' : 'text-gray-900'}`, children: value }), sublabel && (_jsx("p", { className: `text-xs ${isAmber ? 'text-amber-600' : 'text-gray-400'}`, children: sublabel })), isAmber && (_jsxs("span", { className: "mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700", children: [_jsx("svg", { className: "w-3.5 h-3.5", fill: "currentColor", viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }), "Concentration risk"] }))] }));
}
export function AssignmentSignals({ signals }) {
    const topConcentration = signals.concentrationRisks[0] ?? null;
    const topConcentrationPct = topConcentration?.percentageOfTotal ?? 0;
    const isConcentrationRisk = topConcentrationPct > 60;
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Assignment Signals" }), _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsx(SignalCard, { label: "Manager-assigned work", value: `${Math.round(signals.managerAssignedPercentage)}%`, sublabel: `${signals.managerAssignedCount} of ${signals.totalCommitments} total commitments`, isAmber: signals.managerAssignedPercentage > 60 }), _jsx(SignalCard, { label: "Top assignee", value: topConcentration
                            ? `${topConcentration.assignedToName} — ${Math.round(topConcentrationPct)}%`
                            : 'None', sublabel: topConcentration
                            ? `${topConcentration.assignmentCount} assignments (dependency risk)`
                            : 'No assignments recorded', isAmber: isConcentrationRisk }), _jsx(SignalCard, { label: "Total assignments this week", value: String(signals.managerAssignedCount), sublabel: `${signals.totalCommitments} total commitments across team` })] })] }));
}
