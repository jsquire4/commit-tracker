import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { MemberCommitmentDetail } from './MemberCommitmentDetail';
const CYCLE_STATE_LABELS = {
    DRAFT: 'Draft',
    LOCKED: 'Locked',
    RECONCILING: 'Reconciling',
    RECONCILED: 'Reconciled',
};
const CYCLE_STATE_COLORS = {
    DRAFT: 'bg-gray-100 text-gray-700',
    LOCKED: 'bg-blue-100 text-blue-800',
    RECONCILING: 'bg-yellow-100 text-yellow-800',
    RECONCILED: 'bg-green-100 text-green-800',
};
function SortableHeader({ label, sortKey, currentSort, direction, onSort, sticky = false, }) {
    const isActive = currentSort === sortKey;
    return (_jsx("th", { className: `px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-gray-900 ${sticky ? 'sticky left-0 bg-gray-50 z-10' : ''}`, onClick: () => onSort(sortKey), scope: "col", children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [label, _jsxs("span", { className: "inline-flex flex-col leading-none", "aria-hidden": "true", children: [_jsx("svg", { className: `w-2.5 h-2.5 -mb-0.5 ${isActive && direction === 'asc' ? 'text-blue-600' : 'text-gray-300'}`, viewBox: "0 0 10 6", fill: "currentColor", children: _jsx("path", { d: "M5 0L10 6H0L5 0Z" }) }), _jsx("svg", { className: `w-2.5 h-2.5 ${isActive && direction === 'desc' ? 'text-blue-600' : 'text-gray-300'}`, viewBox: "0 0 10 6", fill: "currentColor", children: _jsx("path", { d: "M5 6L0 0H10L5 6Z" }) })] })] }) }));
}
function deriveMember(m) {
    const total = m.totalCommitments || 1;
    const strategicPct = Math.round(((m.categoryBreakdown['STRATEGIC'] ?? 0) / total) * 100);
    const operationalPct = Math.round(((m.categoryBreakdown['OPERATIONAL'] ?? 0) / total) * 100);
    const completionRate = m.totalCommitments > 0 ? Math.round((m.reconciledCount / m.totalCommitments) * 100) : 0;
    const topEntry = Object.entries(m.categoryBreakdown).sort(([, a], [, b]) => b - a)[0];
    const topRcdo = topEntry ? topEntry[0] : '—';
    return { raw: m, strategicPct, operationalPct, completionRate, topRcdo };
}
function sortMembers(members, key, dir) {
    const sorted = [...members].sort((a, b) => {
        let av;
        let bv;
        switch (key) {
            case 'displayName':
                av = a.raw.displayName;
                bv = b.raw.displayName;
                break;
            case 'cycleState':
                av = a.raw.cycleState;
                bv = b.raw.cycleState;
                break;
            case 'totalCommitments':
                av = a.raw.totalCommitments;
                bv = b.raw.totalCommitments;
                break;
            case 'strategicPct':
                av = a.strategicPct;
                bv = b.strategicPct;
                break;
            case 'operationalPct':
                av = a.operationalPct;
                bv = b.operationalPct;
                break;
            case 'completionRate':
                av = a.completionRate;
                bv = b.completionRate;
                break;
            case 'topRcdo':
                av = a.topRcdo;
                bv = b.topRcdo;
                break;
        }
        if (av < bv)
            return dir === 'asc' ? -1 : 1;
        if (av > bv)
            return dir === 'asc' ? 1 : -1;
        return 0;
    });
    return sorted;
}
export function TeamRollupTable({ members, cycleId, onSelectMember, }) {
    const [sortKey, setSortKey] = useState('displayName');
    const [sortDir, setSortDir] = useState('asc');
    const [expandedUserId, setExpandedUserId] = useState(null);
    function handleSort(key) {
        if (key === sortKey) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        }
        else {
            setSortKey(key);
            setSortDir('asc');
        }
    }
    function handleRowClick(userId) {
        setExpandedUserId((prev) => (prev === userId ? null : userId));
        onSelectMember?.(userId);
    }
    const derived = members.map(deriveMember);
    const sorted = sortMembers(derived, sortKey, sortDir);
    if (sorted.length === 0) {
        return (_jsx("div", { className: "bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm", children: "No team members found." }));
    }
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg overflow-hidden", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200", children: "Team Rollup" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[720px] text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-200", children: _jsxs("tr", { children: [_jsx(SortableHeader, { label: "Name", sortKey: "displayName", currentSort: sortKey, direction: sortDir, onSort: handleSort, sticky: true }), _jsx(SortableHeader, { label: "Cycle State", sortKey: "cycleState", currentSort: sortKey, direction: sortDir, onSort: handleSort }), _jsx(SortableHeader, { label: "# Commitments", sortKey: "totalCommitments", currentSort: sortKey, direction: sortDir, onSort: handleSort }), _jsx(SortableHeader, { label: "Strategic %", sortKey: "strategicPct", currentSort: sortKey, direction: sortDir, onSort: handleSort }), _jsx(SortableHeader, { label: "Operational %", sortKey: "operationalPct", currentSort: sortKey, direction: sortDir, onSort: handleSort }), _jsx(SortableHeader, { label: "Completion Rate", sortKey: "completionRate", currentSort: sortKey, direction: sortDir, onSort: handleSort }), _jsx(SortableHeader, { label: "Top Category", sortKey: "topRcdo", currentSort: sortKey, direction: sortDir, onSort: handleSort })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: sorted.map(({ raw, strategicPct, operationalPct, completionRate, topRcdo }) => {
                                const isExpanded = expandedUserId === raw.userId;
                                const stateLabel = CYCLE_STATE_LABELS[raw.cycleState] ?? raw.cycleState;
                                const stateColor = CYCLE_STATE_COLORS[raw.cycleState] ?? 'bg-gray-100 text-gray-700';
                                return (_jsxs(_Fragment, { children: [_jsxs("tr", { className: `hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : ''}`, onClick: () => handleRowClick(raw.userId), "aria-expanded": isExpanded, children: [_jsx("td", { className: "sticky left-0 px-4 py-3 font-medium text-gray-900 bg-inherit whitespace-nowrap", children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: `transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-90' : ''}`, "aria-hidden": "true", children: "\u25B6" }), raw.displayName] }) }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap", children: _jsx("span", { className: `inline-flex px-2 py-0.5 rounded text-xs font-medium ${stateColor}`, children: stateLabel }) }), _jsx("td", { className: "px-4 py-3 text-gray-700 text-right tabular-nums", children: raw.totalCommitments }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums", children: _jsxs("span", { className: strategicPct >= 50 ? 'text-blue-700 font-semibold' : 'text-gray-700', children: [strategicPct, "%"] }) }), _jsxs("td", { className: "px-4 py-3 text-right tabular-nums text-gray-700", children: [operationalPct, "%"] }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums", children: _jsxs("span", { className: completionRate >= 80
                                                            ? 'text-green-700 font-semibold'
                                                            : completionRate >= 50
                                                                ? 'text-yellow-700'
                                                                : 'text-red-600', children: [completionRate, "%"] }) }), _jsx("td", { className: "px-4 py-3 text-gray-600 whitespace-nowrap", children: topRcdo })] }, raw.userId), isExpanded && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "bg-blue-50 border-t border-blue-100", children: _jsx(MemberCommitmentDetail, { userId: raw.userId, cycleId: cycleId }) }) }, `${raw.userId}-detail`))] }));
                            }) })] }) })] }));
}
