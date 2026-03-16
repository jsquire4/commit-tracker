import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/Badge';
const HORIZON_LABELS = {
    MORNING: 'Morning',
    MIDDAY: 'Midday',
    AFTERNOON: 'Afternoon',
    EOD: 'EOD',
    EOW: 'EOW',
};
const CATEGORY_VARIANTS = {
    STRATEGIC: 'strategic',
    OPERATIONAL: 'operational',
    DEFENSIVE: 'defensive',
    CAPABILITY_BUILDING: 'capability',
};
const CATEGORY_LABELS = {
    STRATEGIC: 'Strategic',
    OPERATIONAL: 'Operational',
    DEFENSIVE: 'Defensive',
    CAPABILITY_BUILDING: 'Capability Building',
};
export function CommitmentCard({ commitment, cycleState, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const isDraft = cycleState === 'DRAFT';
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, } = useSortable({ id: commitment.id, disabled: !isDraft });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const categoryKey = commitment.chessCategoryName;
    return (_jsx("div", { ref: setNodeRef, style: style, className: [
            'bg-white rounded-lg border shadow-sm transition-shadow',
            isDragging ? 'shadow-lg opacity-70 border-blue-300' : 'border-gray-200 hover:shadow-md',
        ].join(' '), children: _jsx("div", { className: "p-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [isDraft && (_jsx("button", { type: "button", ...attributes, ...listeners, className: "flex-shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none focus:outline-none", "aria-label": "Drag to reorder", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) }) })), _jsx("div", { className: "flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center", children: _jsx("span", { className: "text-xs font-semibold text-gray-500", children: commitment.priorityRank }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("button", { type: "button", onClick: () => setExpanded((prev) => !prev), className: "w-full text-left focus:outline-none", children: _jsx("h3", { className: "text-sm font-semibold text-gray-900 leading-snug", children: commitment.title }) }), commitment.rcdoLink.rallyCryId && (_jsxs("p", { className: "mt-0.5 text-xs text-gray-400 truncate", children: [commitment.rcdoLink.rallyCryId, commitment.rcdoLink.definingObjectiveId && ` › ${commitment.rcdoLink.definingObjectiveId}`, commitment.rcdoLink.outcomeId && ` › ${commitment.rcdoLink.outcomeId}`] })), _jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: [categoryKey && CATEGORY_VARIANTS[categoryKey] && (_jsx(Badge, { variant: CATEGORY_VARIANTS[categoryKey], children: CATEGORY_LABELS[categoryKey] })), _jsx(Badge, { variant: "blue", children: HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon }), commitment.attribution.kind === 'ASSIGNED_BY' && (_jsxs(Badge, { variant: "yellow", children: ["Assigned by ", commitment.attribution.assignedByName] })), commitment.isUnplanned && (_jsx(Badge, { variant: "gray", children: "Unplanned" }))] }), expanded && commitment.bullets.length > 0 && (_jsx("ul", { className: "mt-3 space-y-1 border-t border-gray-100 pt-3", children: commitment.bullets.map((bullet) => (_jsxs("li", { className: "flex items-start gap-2 text-xs text-gray-600", children: [_jsx("span", { className: `flex-shrink-0 mt-0.5 w-3 h-3 rounded-full border ${bullet.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}` }), _jsx("span", { className: bullet.isCompleted ? 'line-through text-gray-400' : '', children: bullet.body })] }, bullet.id))) }))] }), isDraft && (_jsxs("div", { className: "flex-shrink-0 flex items-center gap-1 ml-1", children: [_jsx("button", { type: "button", onClick: () => onEdit(commitment.id), className: "p-1 text-gray-400 hover:text-blue-600 focus:outline-none rounded transition-colors", "aria-label": "Edit commitment", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }) }), _jsx("button", { type: "button", onClick: () => onDelete(commitment.id), className: "p-1 text-gray-400 hover:text-red-600 focus:outline-none rounded transition-colors", "aria-label": "Delete commitment", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) }), commitment.bullets.length > 0 && (_jsx("button", { type: "button", onClick: () => setExpanded((prev) => !prev), className: "p-1 text-gray-400 hover:text-gray-600 focus:outline-none rounded transition-colors", "aria-label": expanded ? 'Collapse bullets' : 'Expand bullets', "aria-expanded": expanded, children: _jsx("svg", { className: `w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) }) }))] })), !isDraft && commitment.bullets.length > 0 && (_jsx("button", { type: "button", onClick: () => setExpanded((prev) => !prev), className: "flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 focus:outline-none rounded transition-colors", "aria-label": expanded ? 'Collapse bullets' : 'Expand bullets', "aria-expanded": expanded, children: _jsx("svg", { className: `w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) }) }))] }) }) }));
}
