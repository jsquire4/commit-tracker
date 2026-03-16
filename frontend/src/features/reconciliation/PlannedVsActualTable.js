import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
import { ChangeReasonCapture } from './ChangeReasonCapture';
import { useReconcileCommitment } from '@/hooks/useReconciliation';
function buildReconcileRequest(status, notes, bulletStatuses) {
    const base = {
        status,
        carryForward: status === 'CARRIED_FORWARD',
        bulletStatuses,
    };
    if (notes.trim().length > 0) {
        return { ...base, completionNotes: notes };
    }
    return base;
}
const HORIZON_LABELS = {
    MORNING: 'Morning',
    MIDDAY: 'Midday',
    AFTERNOON: 'Afternoon',
    EOD: 'End of Day',
    EOW: 'End of Week',
};
function buildInitialRowState(detail) {
    const bulletStatuses = {};
    for (const bullet of detail.commitment.bullets) {
        bulletStatuses[bullet.id] = bullet.isCompleted;
    }
    return {
        status: detail.reconciliation?.status ?? null,
        notes: detail.reconciliation?.notes ?? '',
        bulletStatuses,
        saving: false,
        saveError: null,
    };
}
function CommitmentRow({ detail, cycleId }) {
    const { commitment, reconciliation } = detail;
    const [row, setRow] = useState(() => buildInitialRowState(detail));
    const reconcileMutation = useReconcileCommitment(cycleId);
    const handleStatusChange = useCallback(async (status) => {
        const next = { ...row, status, saving: true, saveError: null };
        setRow(next);
        const bulletStatusArray = commitment.bullets.map((b) => ({
            bulletId: b.id,
            done: next.bulletStatuses[b.id] ?? b.isCompleted,
        }));
        try {
            await reconcileMutation.mutateAsync({
                id: commitment.id,
                req: buildReconcileRequest(status, next.notes, bulletStatusArray),
            });
            setRow((prev) => ({ ...prev, saving: false }));
        }
        catch {
            setRow((prev) => ({ ...prev, saving: false, saveError: 'Save failed. Try again.' }));
        }
    }, [row, commitment, reconcileMutation]);
    const handleNotesChange = useCallback((notes) => {
        setRow((prev) => ({ ...prev, notes }));
    }, []);
    const handleNotesBlur = useCallback(async () => {
        if (!row.status)
            return;
        if (row.notes === (reconciliation?.notes ?? ''))
            return;
        setRow((prev) => ({ ...prev, saving: true, saveError: null }));
        const bulletStatusArray = commitment.bullets.map((b) => ({
            bulletId: b.id,
            done: row.bulletStatuses[b.id] ?? b.isCompleted,
        }));
        try {
            await reconcileMutation.mutateAsync({
                id: commitment.id,
                req: buildReconcileRequest(row.status, row.notes, bulletStatusArray),
            });
            setRow((prev) => ({ ...prev, saving: false }));
        }
        catch {
            setRow((prev) => ({ ...prev, saving: false, saveError: 'Save failed. Try again.' }));
        }
    }, [row, commitment, reconciliation, reconcileMutation]);
    const handleBulletToggle = useCallback(async (bulletId, done) => {
        const nextBulletStatuses = { ...row.bulletStatuses, [bulletId]: done };
        setRow((prev) => ({ ...prev, bulletStatuses: nextBulletStatuses, saving: true, saveError: null }));
        if (!row.status) {
            setRow((prev) => ({ ...prev, saving: false }));
            return;
        }
        const bulletStatusArray = commitment.bullets.map((b) => ({
            bulletId: b.id,
            done: nextBulletStatuses[b.id] ?? b.isCompleted,
        }));
        try {
            await reconcileMutation.mutateAsync({
                id: commitment.id,
                req: buildReconcileRequest(row.status, row.notes, bulletStatusArray),
            });
            setRow((prev) => ({ ...prev, saving: false }));
        }
        catch {
            setRow((prev) => ({
                ...prev,
                bulletStatuses: { ...nextBulletStatuses, [bulletId]: !done },
                saving: false,
                saveError: 'Save failed. Try again.',
            }));
        }
    }, [row, commitment, reconcileMutation]);
    const isReasonRequired = row.status !== null && row.status !== 'COMPLETED';
    return (_jsx("div", { className: "border border-gray-200 rounded-lg overflow-hidden", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200", children: [_jsxs("div", { className: "p-4 bg-gray-50", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-900 leading-snug", children: [commitment.title, commitment.isUnplanned && (_jsx("span", { className: "ml-2 text-xs font-normal text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5", children: "Unplanned" }))] }), _jsx("span", { className: "shrink-0 text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-0.5", children: HORIZON_LABELS[commitment.completionHorizon] ?? commitment.completionHorizon })] }), commitment.rcdoLink.rallyCryId && (_jsxs("p", { className: "text-xs text-gray-500 mb-2", children: ["RC: ", _jsx("span", { className: "text-gray-700", children: commitment.rcdoLink.rallyCryId })] })), commitment.bullets.length > 0 && (_jsx("ul", { className: "space-y-1 mt-2", children: commitment.bullets.map((bullet) => (_jsxs("li", { className: "flex items-start gap-2 text-sm text-gray-700", children: [_jsx("span", { className: "mt-0.5 shrink-0 w-4 h-4 rounded-sm border border-gray-300 bg-white", "aria-hidden": "true" }), bullet.body] }, bullet.id))) }))] }), _jsx("div", { className: "p-4 bg-white", children: _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5", children: "Reconciliation Status" }), _jsx(CommitmentStatusMarker, { value: row.status, onChange: handleStatusChange, disabled: row.saving })] }), commitment.bullets.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5", children: "Bullet Status" }), _jsx("ul", { className: "space-y-1.5", children: commitment.bullets.map((bullet) => (_jsxs("li", { className: "flex items-start gap-2", children: [_jsx("input", { type: "checkbox", id: `bullet-${bullet.id}`, checked: row.bulletStatuses[bullet.id] ?? bullet.isCompleted, onChange: (e) => handleBulletToggle(bullet.id, e.target.checked), disabled: row.saving, className: "mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" }), _jsx("label", { htmlFor: `bullet-${bullet.id}`, className: "text-sm text-gray-700 cursor-pointer leading-snug", children: bullet.body })] }, bullet.id))) })] })), row.status !== null && (_jsx(ChangeReasonCapture, { value: row.notes, onChange: handleNotesChange, required: isReasonRequired, disabled: row.saving })), row.status !== null && row.notes !== (reconciliation?.notes ?? '') && (_jsx("button", { type: "button", onClick: handleNotesBlur, disabled: row.saving, className: "self-start text-xs text-blue-600 hover:underline disabled:opacity-50", children: row.saving ? 'Saving…' : 'Save notes' })), row.saveError && (_jsx("p", { role: "alert", className: "text-xs text-red-600", children: row.saveError })), row.saving && !row.saveError && (_jsx("p", { className: "text-xs text-gray-400 italic", children: "Saving\u2026" }))] }) })] }) }));
}
export function PlannedVsActualTable({ commitments, cycleId }) {
    if (commitments.length === 0) {
        return (_jsx("p", { className: "text-sm text-gray-500 py-4", children: "No commitments to reconcile." }));
    }
    return (_jsx("div", { className: "flex flex-col gap-4", children: commitments.map((detail) => (_jsx(CommitmentRow, { detail: detail, cycleId: cycleId }, detail.commitment.id))) }));
}
