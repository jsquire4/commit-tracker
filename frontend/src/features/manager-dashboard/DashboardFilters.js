import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '@/stores/ui.store';
const CATEGORY_OPTIONS = [
    { value: 'STRATEGIC', label: 'Strategic' },
    { value: 'OPERATIONAL', label: 'Operational' },
    { value: 'DEFENSIVE', label: 'Defensive' },
    { value: 'CAPABILITY_BUILDING', label: 'Capability Building' },
];
/** Build a Partial<DashboardFilters> that strips undefined keys entirely
 *  to satisfy exactOptionalPropertyTypes. */
function filtersWithout(...keys) {
    const partial = {};
    void keys; // keys just indicate what NOT to include — we return an empty object
    return partial;
}
export function DashboardFilters({ filters, onChange, teamMemberOptions = [], rcdoOptions = [], }) {
    const resetDashboardFilters = useUIStore((s) => s.resetDashboardFilters);
    function handleReset() {
        resetDashboardFilters();
        // Pass an empty object — the store reset handles clearing all keys
        onChange(filtersWithout('cycleWeekStart', 'teamMemberId', 'rcdoId', 'includeSubtree'));
    }
    function handleMemberChange(value) {
        if (value) {
            onChange({ teamMemberId: value });
        }
        else {
            const partial = {};
            // Remove the key by omitting it, then the store merge will leave it absent
            onChange(partial);
        }
    }
    function handleRcdoChange(value) {
        if (value) {
            onChange({ rcdoId: value });
        }
        else {
            onChange({});
        }
    }
    function handleWeekChange(value) {
        if (value) {
            onChange({ cycleWeekStart: value });
        }
        else {
            onChange({});
        }
    }
    function handleCategoryToggle(catValue) {
        if (filters.rcdoId === catValue) {
            onChange({});
        }
        else {
            onChange({ rcdoId: catValue });
        }
    }
    function handleSubtreeChange(checked) {
        if (checked) {
            onChange({ includeSubtree: true });
        }
        else {
            onChange({});
        }
    }
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end", children: [_jsxs("div", { className: "flex flex-col gap-1 min-w-[180px]", children: [_jsx("label", { htmlFor: "filter-member", className: "text-xs font-medium text-gray-600 uppercase tracking-wide", children: "Team Member" }), _jsxs("select", { id: "filter-member", className: "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", value: filters.teamMemberId ?? '', onChange: (e) => handleMemberChange(e.target.value), children: [_jsx("option", { value: "", children: "All members" }), teamMemberOptions.map((m) => (_jsx("option", { value: m.id, children: m.displayName }, m.id)))] })] }), _jsxs("div", { className: "flex flex-col gap-1 min-w-[200px]", children: [_jsx("label", { htmlFor: "filter-rcdo", className: "text-xs font-medium text-gray-600 uppercase tracking-wide", children: "Rally Cry / Objective" }), _jsxs("select", { id: "filter-rcdo", className: "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", value: filters.rcdoId ?? '', onChange: (e) => handleRcdoChange(e.target.value), children: [_jsx("option", { value: "", children: "All objectives" }), rcdoOptions.map((r) => (_jsx("option", { value: r.id, children: r.title }, r.id)))] })] }), _jsxs("div", { className: "flex flex-col gap-1 min-w-[160px]", children: [_jsx("label", { htmlFor: "filter-week", className: "text-xs font-medium text-gray-600 uppercase tracking-wide", children: "Week Starting" }), _jsx("input", { id: "filter-week", type: "date", className: "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", value: filters.cycleWeekStart ?? '', onChange: (e) => handleWeekChange(e.target.value) })] }), _jsxs("div", { className: "flex flex-col gap-1 min-w-[180px]", children: [_jsx("label", { className: "text-xs font-medium text-gray-600 uppercase tracking-wide", children: "Category" }), _jsx("div", { className: "flex flex-wrap gap-2", children: CATEGORY_OPTIONS.map((cat) => (_jsx("button", { type: "button", className: `px-2 py-1 rounded text-xs font-medium border transition-colors ${filters.rcdoId === cat.value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`, onClick: () => handleCategoryToggle(cat.value), children: cat.label }, cat.value))) })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-600 uppercase tracking-wide", children: "Include Subtree" }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500", checked: filters.includeSubtree ?? false, onChange: (e) => handleSubtreeChange(e.target.checked) }), _jsx("span", { className: "text-sm text-gray-700", children: "Include org subtree" })] })] }), _jsx("div", { className: "flex flex-col justify-end", children: _jsx("button", { type: "button", onClick: handleReset, className: "px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors", children: "Reset" }) })] }));
}
