import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
/** Returns a Tailwind bg color class based on horizon — darker means longer horizon */
function horizonBgClass(horizon) {
    switch (horizon) {
        case 'MORNING':
            return 'bg-blue-100 text-blue-800';
        case 'MIDDAY':
            return 'bg-blue-200 text-blue-900';
        case 'AFTERNOON':
            return 'bg-blue-300 text-blue-900';
        case 'EOD':
            return 'bg-blue-400 text-blue-950';
        case 'EOW':
            return 'bg-blue-600 text-white';
    }
}
/** Returns a Tailwind bg color class for the horizon indicator dot */
function horizonDotClass(horizon) {
    switch (horizon) {
        case 'MORNING':
            return 'bg-blue-300';
        case 'MIDDAY':
            return 'bg-blue-400';
        case 'AFTERNOON':
            return 'bg-blue-500';
        case 'EOD':
            return 'bg-blue-600';
        case 'EOW':
            return 'bg-blue-800';
    }
}
function horizonLabel(horizon) {
    switch (horizon) {
        case 'MORNING':
            return 'Morning';
        case 'MIDDAY':
            return 'Midday';
        case 'AFTERNOON':
            return 'Afternoon';
        case 'EOD':
            return 'End of Day';
        case 'EOW':
            return 'End of Week';
    }
}
function truncate(str, maxLen) {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
function buildRcdoBreadcrumb(commitment) {
    const parts = [];
    if (commitment.rcdoLink.rallyCryId)
        parts.push('Rally Cry');
    if (commitment.rcdoLink.definingObjectiveId)
        parts.push('DO');
    if (commitment.rcdoLink.outcomeId)
        parts.push('Outcome');
    return parts.length > 0 ? parts.join(' › ') : null;
}
export function ChessboardCommitmentChip({ commitment }) {
    const [popoverVisible, setPopoverVisible] = useState(false);
    const rcdoBreadcrumb = buildRcdoBreadcrumb(commitment);
    return (_jsxs("div", { className: "relative", onMouseEnter: () => setPopoverVisible(true), onMouseLeave: () => setPopoverVisible(false), onFocus: () => setPopoverVisible(true), onBlur: () => setPopoverVisible(false), children: [_jsxs("div", { tabIndex: 0, role: "button", "aria-label": commitment.title, className: [
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default',
                    'border border-transparent transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-400',
                    horizonBgClass(commitment.completionHorizon),
                ].join(' '), children: [_jsx("span", { className: [
                            'inline-block w-2 h-2 rounded-full flex-shrink-0',
                            horizonDotClass(commitment.completionHorizon),
                        ].join(' '), "aria-hidden": "true" }), _jsx("span", { className: "truncate max-w-[180px]", children: truncate(commitment.title, 30) })] }), popoverVisible && (_jsxs("div", { role: "tooltip", className: [
                    'absolute z-50 bottom-full left-0 mb-2 w-72',
                    'bg-white border border-gray-200 rounded-lg shadow-lg p-3',
                    'text-sm text-gray-700',
                ].join(' '), children: [_jsx("p", { className: "font-semibold text-gray-900 mb-1", children: commitment.title }), rcdoBreadcrumb && (_jsx("p", { className: "text-xs text-blue-600 mb-2", children: rcdoBreadcrumb })), _jsxs("p", { className: "text-xs text-gray-500 mb-2", children: ["Horizon: ", _jsx("span", { className: "font-medium", children: horizonLabel(commitment.completionHorizon) })] }), commitment.bullets.length > 0 && (_jsx("ul", { className: "list-disc list-inside space-y-0.5 text-xs text-gray-600", children: commitment.bullets.map((bullet) => (_jsx("li", { className: bullet.isCompleted ? 'line-through text-gray-400' : '', children: bullet.body }, bullet.id))) }))] }))] }));
}
