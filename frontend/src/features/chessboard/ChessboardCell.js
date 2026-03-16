import { jsx as _jsx } from "react/jsx-runtime";
import { ChessboardCommitmentChip } from './ChessboardCommitmentChip';
/** Converts a hex color string to a Tailwind-compatible inline style for the left accent */
function accentStyle(colorHex) {
    return colorHex
        ? { borderLeftColor: colorHex, borderLeftWidth: '4px', borderLeftStyle: 'solid' }
        : { borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#d1d5db' };
}
export function ChessboardCell({ commitments, category, priorityTier }) {
    const isEmpty = commitments.length === 0;
    return (_jsx("div", { "aria-label": `${category.name} — ${priorityTier}`, className: [
            'rounded-md p-2 min-h-[72px] flex flex-col gap-1.5 transition-colors',
            isEmpty
                ? 'border border-dashed border-gray-300 bg-gray-50'
                : 'border border-gray-200 bg-white',
        ].join(' '), style: accentStyle(category.colorHex), children: isEmpty ? (_jsx("span", { className: "text-xs text-gray-400 italic m-auto", children: "No commitments" })) : (commitments.map((c) => (_jsx(ChessboardCommitmentChip, { commitment: c }, c.id)))) }));
}
