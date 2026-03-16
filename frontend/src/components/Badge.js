import { jsx as _jsx } from "react/jsx-runtime";
const variantClasses = {
    strategic: 'bg-purple-100 text-purple-800',
    operational: 'bg-blue-100 text-blue-800',
    defensive: 'bg-red-100 text-red-800',
    capability: 'bg-green-100 text-green-800',
    default: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-700',
};
export function Badge({ children, variant = 'default', className = '' }) {
    return (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`, children: children }));
}
