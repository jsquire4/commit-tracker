import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useCreateUnplannedCommitment } from '@/hooks/useCommitments';
import { useQuery } from '@tanstack/react-query';
import { getRcdoTree } from '@/api/rcdo.api';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
const HORIZON_OPTIONS = [
    { value: 'MORNING', label: 'Morning' },
    { value: 'MIDDAY', label: 'Midday' },
    { value: 'AFTERNOON', label: 'Afternoon' },
    { value: 'EOD', label: 'End of Day' },
    { value: 'EOW', label: 'End of Week' },
];
const EMPTY_FORM = {
    title: '',
    bullets: ['', ''],
    completionHorizon: 'EOW',
    rallyCryId: '',
    reconciliationStatus: null,
};
export function UnplannedWorkEntry({ cycleId, onAdd }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState(null);
    const createMutation = useCreateUnplannedCommitment(cycleId);
    const { data: rcdoTree } = useQuery({
        queryKey: ['rcdo', 'tree'],
        queryFn: getRcdoTree,
        staleTime: 60_000,
        enabled: open,
    });
    function handleBulletChange(idx, val) {
        setForm((prev) => {
            const next = [...prev.bullets];
            next[idx] = val;
            return { ...prev, bullets: next };
        });
    }
    function addBullet() {
        if (form.bullets.length >= 5)
            return;
        setForm((prev) => ({ ...prev, bullets: [...prev.bullets, ''] }));
    }
    function removeBullet(idx) {
        if (form.bullets.length <= 2)
            return;
        setForm((prev) => ({
            ...prev,
            bullets: prev.bullets.filter((_, i) => i !== idx),
        }));
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        if (!form.title.trim()) {
            setError('Title is required.');
            return;
        }
        const filledBullets = form.bullets.filter((b) => b.trim().length > 0);
        if (filledBullets.length < 2) {
            setError('At least 2 bullet items are required.');
            return;
        }
        if (!form.reconciliationStatus) {
            setError('Reconciliation status is required for unplanned work.');
            return;
        }
        if (!form.rallyCryId) {
            setError('RCDO linking (Rally Cry) is required.');
            return;
        }
        try {
            await createMutation.mutateAsync({
                title: form.title.trim(),
                bullets: filledBullets,
                completionHorizon: form.completionHorizon,
                rallyCryId: form.rallyCryId,
            });
            setForm(EMPTY_FORM);
            setOpen(false);
            onAdd();
        }
        catch {
            setError('Failed to add unplanned work. Please try again.');
        }
    }
    function handleCancel() {
        setForm(EMPTY_FORM);
        setError(null);
        setOpen(false);
    }
    if (!open) {
        return (_jsxs("button", { type: "button", onClick: () => setOpen(true), className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors", children: [_jsx("span", { "aria-hidden": "true", children: "+" }), "Add unplanned work"] }));
    }
    return (_jsxs("div", { className: "rounded-lg border border-blue-200 bg-blue-50 p-4", children: [_jsx("h3", { className: "text-sm font-semibold text-blue-800 mb-3", children: "Add Unplanned Work" }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4", noValidate: true, children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("label", { htmlFor: "unplanned-title", className: "text-sm font-medium text-gray-700", children: ["Title ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { id: "unplanned-title", type: "text", value: form.title, onChange: (e) => setForm((prev) => ({ ...prev, title: e.target.value })), placeholder: "What did you work on?", maxLength: 500, className: "rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("span", { className: "text-sm font-medium text-gray-700", children: ["Bullet items ", _jsx("span", { className: "text-red-500", children: "*" }), ' ', _jsx("span", { className: "text-gray-400 font-normal", children: "(min 2, max 5)" })] }), form.bullets.map((bullet, idx) => (_jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("input", { type: "text", value: bullet, onChange: (e) => handleBulletChange(idx, e.target.value), placeholder: `Bullet ${idx + 1}`, className: "flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" }), form.bullets.length > 2 && (_jsx("button", { type: "button", onClick: () => removeBullet(idx), "aria-label": `Remove bullet ${idx + 1}`, className: "text-gray-400 hover:text-red-500 text-lg leading-none px-1", children: "\u00D7" }))] }, idx))), form.bullets.length < 5 && (_jsx("button", { type: "button", onClick: addBullet, className: "self-start text-xs text-blue-600 hover:underline mt-1", children: "+ Add bullet" }))] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { htmlFor: "unplanned-horizon", className: "text-sm font-medium text-gray-700", children: "Completion Horizon" }), _jsx("select", { id: "unplanned-horizon", value: form.completionHorizon, onChange: (e) => setForm((prev) => ({ ...prev, completionHorizon: e.target.value })), className: "rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white", children: HORIZON_OPTIONS.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("label", { htmlFor: "unplanned-rcdo", className: "text-sm font-medium text-gray-700", children: ["Rally Cry ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsxs("select", { id: "unplanned-rcdo", value: form.rallyCryId, onChange: (e) => setForm((prev) => ({ ...prev, rallyCryId: e.target.value })), className: "rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white", children: [_jsx("option", { value: "", children: "\u2014 Select Rally Cry \u2014" }), rcdoTree?.rallyCries.map((rc) => (_jsx("option", { value: rc.id, children: rc.title }, rc.id)))] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("span", { className: "text-sm font-medium text-gray-700", children: ["Reconciliation Status ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(CommitmentStatusMarker, { value: form.reconciliationStatus, onChange: (s) => setForm((prev) => ({ ...prev, reconciliationStatus: s })) })] }), error && (_jsx("p", { role: "alert", className: "text-sm text-red-600", children: error })), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsx("button", { type: "submit", disabled: createMutation.isPending, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors", children: createMutation.isPending ? 'Saving…' : 'Add Work' }), _jsx("button", { type: "button", onClick: handleCancel, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors", children: "Cancel" })] })] })] }));
}
