import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { useRcdoSearch } from '@/hooks/useRcdo';
import { useAuth } from '@/hooks/useAuth';
const RECENT_KEY = (userId, orgId) => `rcdo-recent:${orgId}:${userId}`;
const NO_LINK_VALUE = '__NO_LINK__';
function useRecentRcdo(userId, orgId) {
    const key = RECENT_KEY(userId, orgId);
    function getRecent() {
        try {
            return JSON.parse(localStorage.getItem(key) ?? '[]');
        }
        catch {
            return [];
        }
    }
    function addRecent(entry) {
        const existing = getRecent().filter((r) => r.rallyCryId !== entry.rallyCryId ||
            r.definingObjectiveId !== entry.definingObjectiveId ||
            r.outcomeId !== entry.outcomeId);
        const next = [entry, ...existing].slice(0, 5);
        localStorage.setItem(key, JSON.stringify(next));
    }
    return { getRecent, addRecent };
}
function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
export function RcdoAutocomplete({ value, onChange, disabled = false }) {
    const { userId, orgId } = useAuth();
    const { getRecent, addRecent } = useRecentRcdo(userId, orgId);
    const [rcQuery, setRcQuery] = useState('');
    const [doQuery, setDoQuery] = useState('');
    const [ocQuery, setOcQuery] = useState('');
    const [rcDisplay, setRcDisplay] = useState('');
    const [doDisplay, setDoDisplay] = useState('');
    const [ocDisplay, setOcDisplay] = useState('');
    const debouncedRc = useDebounce(rcQuery);
    const debouncedDo = useDebounce(doQuery);
    const debouncedOc = useDebounce(ocQuery);
    const { data: rallyCries = [] } = useRcdoSearch('rallyCry', null, debouncedRc || ' ');
    const { data: definingObjectives = [] } = useRcdoSearch('definingObjective', value.rallyCryId, debouncedDo || ' ');
    const { data: outcomes = [] } = useRcdoSearch('outcome', value.definingObjectiveId, debouncedOc || ' ');
    // Cast to correct types
    const rcList = rallyCries;
    const doList = definingObjectives;
    const ocList = outcomes;
    const recent = getRecent();
    function handleRallyCrySelect(item) {
        if (item === NO_LINK_VALUE) {
            onChange({ rallyCryId: null, definingObjectiveId: null, outcomeId: null });
            setRcDisplay('');
            setDoDisplay('');
            setOcDisplay('');
            return;
        }
        setRcDisplay(item.title);
        setRcQuery('');
        setDoDisplay('');
        setDoQuery('');
        setOcDisplay('');
        setOcQuery('');
        onChange({ rallyCryId: item.id, definingObjectiveId: null, outcomeId: null });
    }
    function handleDefiningObjectiveSelect(item) {
        if (item === NO_LINK_VALUE) {
            onChange({ ...value, definingObjectiveId: null, outcomeId: null });
            setDoDisplay('');
            setOcDisplay('');
            return;
        }
        setDoDisplay(item.title);
        setDoQuery('');
        setOcDisplay('');
        setOcQuery('');
        onChange({ ...value, definingObjectiveId: item.id, outcomeId: null });
    }
    function handleOutcomeSelect(item) {
        if (item === NO_LINK_VALUE) {
            onChange({ ...value, outcomeId: null });
            setOcDisplay('');
            return;
        }
        setOcDisplay(item.title);
        setOcQuery('');
        const updated = { ...value, outcomeId: item.id };
        onChange(updated);
        // Save to recent
        const rc = rcList.find((r) => r.id === value.rallyCryId);
        const doItem = doList.find((d) => d.id === value.definingObjectiveId);
        addRecent({
            rallyCryId: value.rallyCryId,
            rallyCryTitle: rc?.title ?? null,
            definingObjectiveId: value.definingObjectiveId,
            definingObjectiveTitle: doItem?.title ?? null,
            outcomeId: item.id,
            outcomeTitle: item.title,
        });
    }
    const isLinked = Boolean(value.rallyCryId);
    return (_jsxs("div", { className: "space-y-3", children: [recent.length > 0 && !isLinked && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 mb-1 font-medium", children: "Recent" }), _jsx("div", { className: "flex flex-wrap gap-1", children: recent.slice(0, 3).map((r, i) => (_jsxs("button", { type: "button", disabled: disabled, onClick: () => {
                                onChange({
                                    rallyCryId: r.rallyCryId,
                                    definingObjectiveId: r.definingObjectiveId,
                                    outcomeId: r.outcomeId,
                                });
                                setRcDisplay(r.rallyCryTitle ?? '');
                                setDoDisplay(r.definingObjectiveTitle ?? '');
                                setOcDisplay(r.outcomeTitle ?? '');
                            }, className: "text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors disabled:opacity-50", children: [r.rallyCryTitle ?? 'Unknown', r.definingObjectiveTitle ? ` › ${r.definingObjectiveTitle}` : '', r.outcomeTitle ? ` › ${r.outcomeTitle}` : ''] }, i))) })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Rally Cry" }), _jsx(Combobox, { value: value.rallyCryId ? (rcList.find((r) => r.id === value.rallyCryId) ?? null) : null, onChange: (item) => {
                            if (item)
                                handleRallyCrySelect(item);
                        }, disabled: disabled, children: _jsxs("div", { className: "relative", children: [_jsx(Combobox.Input, { className: "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500", displayValue: () => rcDisplay || (value.rallyCryId ? '...' : ''), onChange: (e) => setRcQuery(e.target.value), placeholder: "Search rally cries..." }), _jsx(Transition, { as: Fragment, leave: "transition ease-in duration-100", leaveFrom: "opacity-100", leaveTo: "opacity-0", children: _jsxs(Combobox.Options, { className: "absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm", children: [_jsx(Combobox.Option, { value: NO_LINK_VALUE, className: ({ active }) => `cursor-pointer select-none py-2 px-3 italic ${active ? 'bg-gray-100' : 'text-gray-400'}`, children: "No strategic link (operational/other)" }), rcList.map((rc) => (_jsx(Combobox.Option, { value: rc, className: ({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`, children: rc.title }, rc.id)))] }) })] }) })] }), value.rallyCryId && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Defining Objective" }), _jsx(Combobox, { value: value.definingObjectiveId
                            ? (doList.find((d) => d.id === value.definingObjectiveId) ?? null)
                            : null, onChange: (item) => {
                            if (item)
                                handleDefiningObjectiveSelect(item);
                        }, disabled: disabled, children: _jsxs("div", { className: "relative", children: [_jsx(Combobox.Input, { className: "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500", displayValue: () => doDisplay || (value.definingObjectiveId ? '...' : ''), onChange: (e) => setDoQuery(e.target.value), placeholder: "Search defining objectives..." }), _jsx(Transition, { as: Fragment, leave: "transition ease-in duration-100", leaveFrom: "opacity-100", leaveTo: "opacity-0", children: _jsxs(Combobox.Options, { className: "absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm", children: [_jsx(Combobox.Option, { value: NO_LINK_VALUE, className: ({ active }) => `cursor-pointer select-none py-2 px-3 italic ${active ? 'bg-gray-100' : 'text-gray-400'}`, children: "No defining objective" }), doList.map((doItem) => (_jsx(Combobox.Option, { value: doItem, className: ({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`, children: doItem.title }, doItem.id)))] }) })] }) })] })), value.definingObjectiveId && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Outcome" }), _jsx(Combobox, { value: value.outcomeId ? (ocList.find((o) => o.id === value.outcomeId) ?? null) : null, onChange: (item) => {
                            if (item)
                                handleOutcomeSelect(item);
                        }, disabled: disabled, children: _jsxs("div", { className: "relative", children: [_jsx(Combobox.Input, { className: "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500", displayValue: () => ocDisplay || (value.outcomeId ? '...' : ''), onChange: (e) => setOcQuery(e.target.value), placeholder: "Search outcomes..." }), _jsx(Transition, { as: Fragment, leave: "transition ease-in duration-100", leaveFrom: "opacity-100", leaveTo: "opacity-0", children: _jsxs(Combobox.Options, { className: "absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm", children: [_jsx(Combobox.Option, { value: NO_LINK_VALUE, className: ({ active }) => `cursor-pointer select-none py-2 px-3 italic ${active ? 'bg-gray-100' : 'text-gray-400'}`, children: "No outcome" }), ocList.map((oc) => (_jsx(Combobox.Option, { value: oc, className: ({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}`, children: oc.title }, oc.id)))] }) })] }) })] }))] }));
}
