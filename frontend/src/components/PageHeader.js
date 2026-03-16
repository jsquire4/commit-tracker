import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PageHeader({ title, subtitle, badge, actions }) {
    return (_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: title }), badge && _jsx("div", { children: badge })] }), subtitle && (_jsx("p", { className: "mt-1 text-sm text-gray-500", children: subtitle }))] }), actions && (_jsx("div", { className: "flex items-center gap-2 ml-4", children: actions }))] }));
}
