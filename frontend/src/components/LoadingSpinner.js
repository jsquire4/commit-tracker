import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
};
export function LoadingSpinner({ size = 'md', fullPage = false, label }) {
    const spinner = (_jsxs("div", { className: "flex flex-col items-center gap-3", role: "status", "aria-label": label ?? 'Loading', children: [_jsx("div", { className: `${sizeClasses[size]} rounded-full border-gray-200 border-t-blue-600 animate-spin` }), label && _jsx("span", { className: "text-sm text-gray-500", children: label })] }));
    if (fullPage) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[50vh]", children: spinner }));
    }
    return spinner;
}
