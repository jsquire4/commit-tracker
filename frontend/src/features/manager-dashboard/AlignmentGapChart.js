import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, } from 'recharts';
const CATEGORY_COLORS = {
    STRATEGIC: '#2563EB',
    OPERATIONAL: '#6B7280',
    DEFENSIVE: '#DC2626',
    CAPABILITY_BUILDING: '#059669',
};
const CATEGORY_LABELS = {
    STRATEGIC: 'Strategic',
    OPERATIONAL: 'Operational',
    DEFENSIVE: 'Defensive',
    CAPABILITY_BUILDING: 'Capability Building',
};
const CATEGORY_KEYS = ['STRATEGIC', 'OPERATIONAL', 'DEFENSIVE', 'CAPABILITY_BUILDING'];
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0)
        return null;
    const row = payload[0]?.payload;
    if (!row)
        return null;
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[220px]", children: [_jsx("p", { className: "font-semibold text-gray-900 mb-2", children: label }), payload.map((entry) => {
                const key = entry.dataKey;
                const pct = row.totalCommitments > 0
                    ? Math.round((entry.value / row.totalCommitments) * 100)
                    : 0;
                return (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "inline-block w-3 h-3 rounded-sm flex-shrink-0", style: { backgroundColor: CATEGORY_COLORS[key] ?? '#ccc' } }), _jsxs("span", { className: "text-gray-700", children: [CATEGORY_LABELS[key] ?? key, ": ", pct, "% (", entry.value, " of ", row.totalCommitments, ")"] })] }, key));
            })] }));
}
function buildChartData(aggregate, members) {
    const teamTotal = {
        name: 'Team Total',
        userId: null,
        isTeamTotal: true,
        STRATEGIC: aggregate.distribution['STRATEGIC']?.count ?? 0,
        OPERATIONAL: aggregate.distribution['OPERATIONAL']?.count ?? 0,
        DEFENSIVE: aggregate.distribution['DEFENSIVE']?.count ?? 0,
        CAPABILITY_BUILDING: aggregate.distribution['CAPABILITY_BUILDING']?.count ?? 0,
        totalCommitments: Object.values(aggregate.distribution).reduce((sum, d) => sum + d.count, 0),
    };
    const memberRows = members.map((m) => ({
        name: m.displayName,
        userId: m.userId,
        isTeamTotal: false,
        STRATEGIC: m.distribution['STRATEGIC']?.count ?? 0,
        OPERATIONAL: m.distribution['OPERATIONAL']?.count ?? 0,
        DEFENSIVE: m.distribution['DEFENSIVE']?.count ?? 0,
        CAPABILITY_BUILDING: m.distribution['CAPABILITY_BUILDING']?.count ?? 0,
        totalCommitments: Object.values(m.distribution).reduce((sum, d) => sum + d.count, 0),
    }));
    return [teamTotal, ...memberRows];
}
export function AlignmentGapChart({ aggregate, members, onSegmentClick, }) {
    const data = buildChartData(aggregate, members);
    const barHeight = 36;
    const teamTotalHeight = 52;
    const chartHeight = Math.max(300, teamTotalHeight + data.length * barHeight + 40);
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-1", children: "Alignment Gap" }), _jsx("p", { className: "text-sm text-gray-500 mb-4", children: "Commitment distribution by chess category across the team" }), _jsx("div", { className: "flex flex-wrap gap-4 mb-4", children: CATEGORY_KEYS.map((key) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-block w-3 h-3 rounded-sm", style: { backgroundColor: CATEGORY_COLORS[key] } }), _jsx("span", { className: "text-xs text-gray-600", children: CATEGORY_LABELS[key] })] }, key))) }), _jsx(ResponsiveContainer, { width: "100%", height: chartHeight, children: _jsxs(BarChart, { data: data, layout: "vertical", margin: { top: 0, right: 16, bottom: 0, left: 96 }, barCategoryGap: "20%", children: [_jsx(XAxis, { type: "number", tickLine: false, axisLine: false, tick: { fontSize: 11, fill: '#6B7280' } }), _jsx(YAxis, { type: "category", dataKey: "name", width: 88, tickLine: false, axisLine: false, tick: ({ x, y, payload }) => {
                                const isTotal = payload.value === 'Team Total';
                                return (_jsx("text", { x: x, y: y, dy: 4, textAnchor: "end", fill: isTotal ? '#1D4ED8' : '#374151', fontWeight: isTotal ? 700 : 400, fontSize: isTotal ? 13 : 12, children: payload.value }));
                            } }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), CATEGORY_KEYS.map((key) => (_jsx(Bar, { dataKey: key, stackId: "alignment", fill: CATEGORY_COLORS[key], cursor: onSegmentClick ? 'pointer' : 'default', ...(key === 'CAPABILITY_BUILDING' ? { radius: [0, 4, 4, 0] } : {}), onClick: (entry) => {
                                if (onSegmentClick) {
                                    onSegmentClick(entry.userId, key);
                                }
                            }, children: data.map((row) => (_jsx(Cell, { fill: CATEGORY_COLORS[key], opacity: row.isTeamTotal ? 1 : 0.8 }, row.userId ?? 'team'))) }, key)))] }) })] }));
}
