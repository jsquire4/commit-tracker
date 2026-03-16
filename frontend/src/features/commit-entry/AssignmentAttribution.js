import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { getTeam } from '@/api/users.api';
export function AssignmentAttribution({ value, onChange, disabled = false }) {
    const isSelf = value.kind === 'SELF_DIRECTED';
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['users', 'team'],
        queryFn: getTeam,
        staleTime: 5 * 60_000,
        enabled: !isSelf,
    });
    const selectedAssigner = value.kind === 'ASSIGNED_BY'
        ? teamMembers.find((m) => m.id === value.assignedById) ?? null
        : null;
    function handleToggle(kind) {
        if (kind === 'SELF_DIRECTED') {
            onChange({ kind: 'SELF_DIRECTED' });
        }
        else {
            onChange({
                kind: 'ASSIGNED_BY',
                assignedById: selectedAssigner?.id ?? '',
                assignedByName: selectedAssigner?.displayName ?? '',
            });
        }
    }
    function handleAssignerSelect(userId) {
        const member = teamMembers.find((m) => m.id === userId);
        if (member) {
            onChange({ kind: 'ASSIGNED_BY', assignedById: member.id, assignedByName: member.displayName });
        }
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex rounded-md shadow-sm", role: "group", "aria-label": "Assignment attribution", children: [_jsx("button", { type: "button", disabled: disabled, onClick: () => handleToggle('SELF_DIRECTED'), "aria-pressed": isSelf, className: [
                            'flex-1 px-4 py-2 text-sm font-medium border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors',
                            isSelf
                                ? 'bg-blue-600 text-white border-blue-600 z-10'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ]
                            .filter(Boolean)
                            .join(' '), children: "Self-directed" }), _jsx("button", { type: "button", disabled: disabled, onClick: () => handleToggle('ASSIGNED_BY'), "aria-pressed": !isSelf, className: [
                            'flex-1 px-4 py-2 text-sm font-medium border -ml-px rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors',
                            !isSelf
                                ? 'bg-blue-600 text-white border-blue-600 z-10'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ]
                            .filter(Boolean)
                            .join(' '), children: "Assigned by..." })] }), !isSelf && (_jsx(Listbox, { value: selectedAssigner?.id ?? '', onChange: handleAssignerSelect, disabled: disabled, children: _jsxs("div", { className: "relative", children: [_jsxs(Listbox.Button, { className: "relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx("span", { className: "block truncate text-gray-700", children: selectedAssigner ? selectedAssigner.displayName : 'Select assigner...' }), _jsx("span", { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2", children: _jsx("svg", { className: "h-5 w-5 text-gray-400", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { fillRule: "evenodd", d: "M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z", clipRule: "evenodd" }) }) })] }), _jsx(Transition, { as: Fragment, leave: "transition ease-in duration-100", leaveFrom: "opacity-100", leaveTo: "opacity-0", children: _jsx(Listbox.Options, { className: "absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm", children: teamMembers.length === 0 ? (_jsx("li", { className: "px-4 py-2 text-gray-400 text-sm", children: "No team members found" })) : (teamMembers.map((member) => (_jsx(Listbox.Option, { value: member.id, className: ({ active }) => `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`, children: ({ selected }) => (_jsxs(_Fragment, { children: [_jsx("span", { className: `block truncate ${selected ? 'font-medium' : 'font-normal'}`, children: member.displayName }), selected && (_jsx("span", { className: "absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600", children: _jsx("svg", { className: "h-4 w-4", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }) }))] })) }, member.id)))) }) })] }) }))] }));
}
