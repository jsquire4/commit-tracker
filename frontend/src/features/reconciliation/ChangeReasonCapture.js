import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const MAX_CHARS = 500;
export function ChangeReasonCapture({ value, onChange, required, disabled = false, }) {
    const remaining = MAX_CHARS - value.length;
    const isOverLimit = remaining < 0;
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("label", { className: "text-sm font-medium text-gray-700", children: ["What changed and why?", required && (_jsx("span", { className: "ml-1 text-red-500", "aria-label": "required", children: "*" }))] }), _jsx("textarea", { value: value, onChange: (e) => onChange(e.target.value), disabled: disabled, required: required, maxLength: MAX_CHARS, rows: 3, placeholder: "Describe what happened and the reason for any deviation from plan\u2026", className: [
                    'w-full rounded border px-3 py-2 text-sm resize-y',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white text-gray-900',
                    isOverLimit ? 'border-red-400' : 'border-gray-300',
                ].join(' '), "aria-describedby": "change-reason-counter" }), _jsxs("p", { id: "change-reason-counter", className: [
                    'text-xs text-right',
                    isOverLimit ? 'text-red-500 font-medium' : 'text-gray-500',
                ].join(' '), children: [remaining, " characters remaining"] })] }));
}
