import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChessboardCell } from './ChessboardCell';
const PRIORITY_TIERS = [
    { label: 'High', key: 'high', test: (rank) => rank >= 1 && rank <= 2 },
    { label: 'Medium', key: 'medium', test: (rank) => rank >= 3 && rank <= 4 },
    { label: 'Low', key: 'low', test: (rank) => rank >= 5 },
];
export function ChessboardGrid({ commitments, categories }) {
    /** Sorted categories — respect the backend sortOrder */
    const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    /** Commitments with no category go into a synthetic "Uncategorized" column */
    const uncategorizedCommitments = commitments.filter((c) => c.chessCategoryId === null);
    const hasUncategorized = uncategorizedCommitments.length > 0;
    const allColumns = [
        ...sortedCategories,
        ...(hasUncategorized
            ? [
                {
                    id: '__uncategorized__',
                    orgId: '',
                    name: 'Uncategorized',
                    description: null,
                    colorHex: null,
                    sortOrder: 9999,
                    isActive: true,
                },
            ]
            : []),
    ];
    function getCellCommitments(categoryId, tier) {
        return commitments.filter((c) => {
            const matchesCategory = categoryId === '__uncategorized__'
                ? c.chessCategoryId === null
                : c.chessCategoryId === categoryId;
            return matchesCategory && tier.test(c.priorityRank);
        });
    }
    return (_jsxs("div", { className: "overflow-x-auto", children: [_jsxs("div", { className: "grid gap-3", style: {
                    gridTemplateColumns: `repeat(${allColumns.length}, minmax(0, 1fr))`,
                }, children: [_jsx("div", { className: "contents", role: "row", children: allColumns.map((cat) => (_jsx("div", { role: "columnheader", className: "px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-600", style: cat.colorHex ? { color: cat.colorHex } : undefined, children: cat.name }, cat.id))) }), PRIORITY_TIERS.map((tier) => (_jsx("div", { className: "contents", role: "row", children: allColumns.map((cat) => (_jsx(ChessboardCell, { commitments: getCellCommitments(cat.id, tier), category: cat, priorityTier: tier.label }, `${tier.key}-${cat.id}`))) }, tier.key)))] }), _jsx("div", { className: "mt-4 flex gap-6 text-xs text-gray-500", children: PRIORITY_TIERS.map((tier) => (_jsxs("span", { children: [_jsx("span", { className: "font-semibold text-gray-700", children: tier.label }), tier.key === 'high' && ' — rank 1–2', tier.key === 'medium' && ' — rank 3–4', tier.key === 'low' && ' — rank 5+'] }, tier.key))) })] }));
}
