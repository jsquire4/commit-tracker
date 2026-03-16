import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { useDeleteCommitment } from '@/hooks/useCommitments';
function RcdoBreadcrumb({ commitment }) {
    const { rallyCryId, definingObjectiveId, outcomeId } = commitment.rcdoLink;
    const parts = [];
    if (rallyCryId)
        parts.push('Rally Cry');
    if (definingObjectiveId)
        parts.push('Objective');
    if (outcomeId)
        parts.push('Outcome');
    if (parts.length === 0) {
        return _jsx("span", { className: "text-xs text-gray-400 italic", children: "No RCDO link" });
    }
    return (_jsx("span", { className: "flex flex-wrap items-center gap-1 text-xs text-gray-500", children: parts.map((part, i) => (_jsxs("span", { className: "flex items-center gap-1", children: [i > 0 && _jsx("span", { className: "text-gray-300", children: "\u203A" }), part] }, part))) }));
}
function CarryCount({ count }) {
    if (count <= 0)
        return null;
    return (_jsxs(Badge, { variant: "yellow", children: ["Carried ", count, " ", count === 1 ? 'time' : 'times'] }));
}
function CarriedItemRow({ commitment, cycleId }) {
    const [declining, setDeclining] = useState(false);
    const [declineState, setDeclineState] = useState({
        commitmentId: commitment.id,
        reason: '',
    });
    const { mutate: deleteCommitment, isPending } = useDeleteCommitment(cycleId);
    // Estimate carry count by checking if carriedFromCommitmentId exists
    // (The actual count would come from the API; we surface it when available via description heuristic)
    const carryCountMatch = commitment.description?.match(/carried (\d+) time/i);
    const carryCount = carryCountMatch ? parseInt(carryCountMatch[1] ?? '0', 10) : 1;
    function handleAccept() {
        // "Accept" is a no-op — the item already exists in the current cycle.
        // Nothing to do; the item stays.
    }
    function handleDeclineSubmit() {
        deleteCommitment(commitment.id);
        setDeclining(false);
    }
    return (_jsxs("li", { className: "flex flex-col gap-2 rounded-md border border-gray-100 bg-white p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium text-gray-900", children: commitment.title }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2", children: [_jsx(RcdoBreadcrumb, { commitment: commitment }), _jsx(CarryCount, { count: carryCount })] })] }), !declining && (_jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx("button", { type: "button", onClick: handleAccept, className: "rounded-md border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1", children: "Accept" }), _jsx("button", { type: "button", onClick: () => setDeclining(true), disabled: isPending, className: "rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50", children: "Decline" })] }))] }), declining && (_jsxs("div", { className: "rounded-md border border-red-100 bg-red-50 p-3", children: [_jsx("label", { htmlFor: `decline-reason-${commitment.id}`, className: "mb-1 block text-xs font-medium text-red-700", children: "Reason for declining (optional)" }), _jsx("input", { id: `decline-reason-${commitment.id}`, type: "text", value: declineState.reason, onChange: (e) => setDeclineState((prev) => ({ ...prev, reason: e.target.value })), placeholder: "e.g. no longer relevant", className: "w-full rounded border border-red-200 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400" }), _jsxs("div", { className: "mt-2 flex items-center justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setDeclining(false), className: "text-xs text-gray-500 hover:text-gray-700", children: "Cancel" }), _jsx("button", { type: "button", onClick: handleDeclineSubmit, disabled: isPending, className: "rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50", children: isPending ? 'Removing…' : 'Confirm Decline' })] })] }))] }));
}
export function CarryForwardPanel({ carriedItems, cycleId }) {
    if (carriedItems.length === 0) {
        return (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-5", children: [_jsx("h2", { className: "mb-1 text-sm font-semibold text-gray-700", children: "Carried Forward" }), _jsx("p", { className: "text-sm text-gray-400", children: "No items carried forward from previous cycle." })] }));
    }
    return (_jsxs("section", { className: "rounded-lg border border-amber-200 bg-amber-50 p-5", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx("svg", { className: "h-5 w-5 text-amber-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" }) }), _jsxs("h2", { className: "text-sm font-semibold text-amber-800", children: ["Carried Forward (", carriedItems.length, ")"] })] }), _jsx("ul", { className: "flex flex-col gap-2", children: carriedItems.map((item) => (_jsx(CarriedItemRow, { commitment: item, cycleId: cycleId }, item.id))) })] }));
}
