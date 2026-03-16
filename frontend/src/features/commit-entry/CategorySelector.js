import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const CATEGORIES = [
    {
        value: 'STRATEGIC',
        label: 'Strategic',
        description: 'Drives long-term objectives',
        colorClass: 'border-purple-300 bg-purple-50',
        dotClass: 'bg-purple-500',
    },
    {
        value: 'OPERATIONAL',
        label: 'Operational',
        description: 'Day-to-day execution',
        colorClass: 'border-blue-300 bg-blue-50',
        dotClass: 'bg-blue-500',
    },
    {
        value: 'DEFENSIVE',
        label: 'Defensive',
        description: 'Risk mitigation and maintenance',
        colorClass: 'border-red-300 bg-red-50',
        dotClass: 'bg-red-500',
    },
    {
        value: 'CAPABILITY_BUILDING',
        label: 'Capability Building',
        description: 'Growing skills and capacity',
        colorClass: 'border-green-300 bg-green-50',
        dotClass: 'bg-green-500',
    },
];
export function CategorySelector({ value, onChange, disabled = false }) {
    return (_jsx("div", { className: "grid grid-cols-2 gap-2", role: "radiogroup", "aria-label": "Category", children: CATEGORIES.map((category) => {
            const isSelected = value === category.value;
            return (_jsx("button", { type: "button", role: "radio", "aria-checked": isSelected, disabled: disabled, onClick: () => onChange(category.value), className: [
                    'relative flex items-start p-3 rounded-md border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isSelected ? category.colorClass + ' border-opacity-100' : 'border-gray-200 bg-white hover:border-gray-300',
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ]
                    .filter(Boolean)
                    .join(' '), children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${isSelected ? category.dotClass : 'bg-gray-300'}` }), _jsxs("div", { children: [_jsx("p", { className: `text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`, children: category.label }), _jsx("p", { className: "text-xs text-gray-500", children: category.description })] })] }) }, category.value));
        }) }));
}
