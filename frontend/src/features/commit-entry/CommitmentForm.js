import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Transition } from '@headlessui/react';
import { CreateCommitmentFormSchema } from '@/lib/validation';
import { useCreateCommitment, useUpdateCommitment, useCommitments, } from '@/hooks/useCommitments';
import { HorizonSelector } from './HorizonSelector';
import { CategorySelector } from './CategorySelector';
import { AssignmentAttribution } from './AssignmentAttribution';
import { TaskBulletEditor } from './TaskBulletEditor';
import { RcdoAutocomplete } from './RcdoAutocomplete';
const DEFAULT_BULLETS = ['', ''];
export function CommitmentForm({ open, commitmentId, cycleId, onClose }) {
    const isEdit = Boolean(commitmentId);
    const { data: commitments = [] } = useCommitments(cycleId, undefined);
    const existingCommitment = commitmentId
        ? commitments.find((c) => c.id === commitmentId)
        : undefined;
    const createMutation = useCreateCommitment(cycleId);
    const updateMutation = useUpdateCommitment(cycleId);
    const isPending = createMutation.isPending || updateMutation.isPending;
    const { register, handleSubmit, control, reset, formState: { errors }, } = useForm({
        resolver: zodResolver(CreateCommitmentFormSchema),
        defaultValues: {
            title: '',
            description: '',
            bullets: DEFAULT_BULLETS,
            completionHorizon: 'EOD',
            chessCategoryId: undefined,
            rallyCryId: undefined,
            definingObjectiveId: undefined,
            outcomeId: undefined,
            assignedBy: undefined,
        },
    });
    // Populate form when editing
    useEffect(() => {
        if (open && existingCommitment) {
            reset({
                title: existingCommitment.title,
                description: existingCommitment.description ?? '',
                bullets: existingCommitment.bullets.map((b) => b.body),
                completionHorizon: existingCommitment.completionHorizon,
                chessCategoryId: existingCommitment.chessCategoryId ?? undefined,
                rallyCryId: existingCommitment.rcdoLink.rallyCryId ?? undefined,
                definingObjectiveId: existingCommitment.rcdoLink.definingObjectiveId ?? undefined,
                outcomeId: existingCommitment.rcdoLink.outcomeId ?? undefined,
                assignedBy: existingCommitment.attribution.kind === 'ASSIGNED_BY'
                    ? existingCommitment.attribution.assignedById
                    : undefined,
            });
        }
        else if (open && !existingCommitment) {
            reset({
                title: '',
                description: '',
                bullets: DEFAULT_BULLETS,
                completionHorizon: 'EOD',
                chessCategoryId: undefined,
                rallyCryId: undefined,
                definingObjectiveId: undefined,
                outcomeId: undefined,
                assignedBy: undefined,
            });
        }
    }, [open, existingCommitment, reset]);
    function handleClose() {
        if (!isPending) {
            onClose();
        }
    }
    async function onSubmit(data) {
        try {
            // Build payload, omitting undefined optional fields to satisfy exactOptionalPropertyTypes
            const payload = {
                title: data.title,
                bullets: data.bullets,
                completionHorizon: data.completionHorizon,
                ...(data.description !== undefined && { description: data.description }),
                ...(data.chessCategoryId !== undefined && { chessCategoryId: data.chessCategoryId }),
                ...(data.rallyCryId !== undefined && { rallyCryId: data.rallyCryId }),
                ...(data.definingObjectiveId !== undefined && { definingObjectiveId: data.definingObjectiveId }),
                ...(data.outcomeId !== undefined && { outcomeId: data.outcomeId }),
                ...(data.assignedBy !== undefined && { assignedBy: data.assignedBy }),
            };
            if (isEdit && commitmentId) {
                await updateMutation.mutateAsync({
                    id: commitmentId,
                    req: { id: commitmentId, ...payload },
                });
            }
            else {
                await createMutation.mutateAsync(payload);
            }
            onClose();
        }
        catch {
            // Error displayed via mutation state
        }
    }
    const apiError = createMutation.error instanceof Error
        ? createMutation.error.message
        : updateMutation.error instanceof Error
            ? updateMutation.error.message
            : null;
    return (_jsx(Transition, { appear: true, show: open, as: Fragment, children: _jsxs(Dialog, { as: "div", className: "relative z-40", onClose: handleClose, children: [_jsx(Transition.Child, { as: Fragment, enter: "ease-out duration-200", enterFrom: "opacity-0", enterTo: "opacity-100", leave: "ease-in duration-150", leaveFrom: "opacity-100", leaveTo: "opacity-0", children: _jsx("div", { className: "fixed inset-0 bg-black/40", "aria-hidden": "true" }) }), _jsx("div", { className: "fixed inset-0 flex items-start justify-end", children: _jsx(Transition.Child, { as: Fragment, enter: "ease-out duration-300", enterFrom: "opacity-0 translate-x-full", enterTo: "opacity-100 translate-x-0", leave: "ease-in duration-200", leaveFrom: "opacity-100 translate-x-0", leaveTo: "opacity-0 translate-x-full", children: _jsxs(Dialog.Panel, { className: "relative h-full w-full max-w-lg bg-white shadow-xl flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-200", children: [_jsx(Dialog.Title, { className: "text-lg font-semibold text-gray-900", children: isEdit ? 'Edit Commitment' : 'Add Commitment' }), _jsx("button", { type: "button", onClick: handleClose, disabled: isPending, className: "text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50", "aria-label": "Close", children: _jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("form", { id: "commitment-form", onSubmit: handleSubmit(onSubmit), className: "flex-1 overflow-y-auto px-6 py-5 space-y-6", children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: "title", className: "block text-sm font-medium text-gray-700 mb-1", children: ["Title ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { id: "title", type: "text", ...register('title'), placeholder: "What do you commit to this week?", className: "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" }), errors.title && (_jsx("p", { className: "mt-1 text-xs text-red-500", children: errors.title.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Strategic Link" }), _jsx(Controller, { name: "rallyCryId", control: control, render: ({ field: rcField }) => (_jsx(Controller, { name: "definingObjectiveId", control: control, render: ({ field: doField }) => (_jsx(Controller, { name: "outcomeId", control: control, render: ({ field: ocField }) => (_jsx(RcdoAutocomplete, { value: {
                                                                    rallyCryId: rcField.value ?? null,
                                                                    definingObjectiveId: doField.value ?? null,
                                                                    outcomeId: ocField.value ?? null,
                                                                }, onChange: (link) => {
                                                                    rcField.onChange(link.rallyCryId ?? undefined);
                                                                    doField.onChange(link.definingObjectiveId ?? undefined);
                                                                    ocField.onChange(link.outcomeId ?? undefined);
                                                                } })) })) })) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Category ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Controller, { name: "chessCategoryId", control: control, render: ({ field }) => (_jsx(CategorySelector, { value: (field.value ?? null), onChange: (c) => field.onChange(c) })) }), errors.chessCategoryId && (_jsx("p", { className: "mt-1 text-xs text-red-500", children: errors.chessCategoryId.message }))] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Completion Horizon ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx(Controller, { name: "completionHorizon", control: control, render: ({ field }) => (_jsx(HorizonSelector, { value: field.value, onChange: field.onChange })) }), errors.completionHorizon && (_jsx("p", { className: "mt-1 text-xs text-red-500", children: errors.completionHorizon.message }))] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Task Bullets ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("p", { className: "text-xs text-gray-500 mb-2", children: "Minimum 2, maximum 5 bullets" }), _jsx(Controller, { name: "bullets", control: control, render: ({ field }) => (_jsx(TaskBulletEditor, { bullets: field.value, onChange: field.onChange })) }), errors.bullets && (_jsx("p", { className: "mt-1 text-xs text-red-500", children: typeof errors.bullets.message === 'string'
                                                        ? errors.bullets.message
                                                        : 'At least 2 bullets required' }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Attribution" }), _jsx(Controller, { name: "assignedBy", control: control, render: ({ field }) => (_jsx(AssignmentAttribution, { value: field.value
                                                            ? { kind: 'ASSIGNED_BY', assignedById: field.value, assignedByName: '' }
                                                            : { kind: 'SELF_DIRECTED' }, onChange: (a) => {
                                                            field.onChange(a.kind === 'ASSIGNED_BY' ? a.assignedById : undefined);
                                                        } })) })] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "description", className: "block text-sm font-medium text-gray-700 mb-1", children: ["Notes ", _jsx("span", { className: "text-gray-400 font-normal", children: "(optional)" })] }), _jsx("textarea", { id: "description", ...register('description'), rows: 3, placeholder: "Additional context...", className: "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" }), errors.description && (_jsx("p", { className: "mt-1 text-xs text-red-500", children: errors.description.message }))] }), apiError && (_jsx("div", { className: "rounded-md bg-red-50 border border-red-200 px-4 py-3", children: _jsx("p", { className: "text-sm text-red-700", children: apiError }) }))] }), _jsxs("div", { className: "flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: handleClose, disabled: isPending, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50", children: "Cancel" }), _jsxs("button", { type: "submit", form: "commitment-form", disabled: isPending, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2", children: [isPending && (_jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" })), isEdit ? 'Save Changes' : 'Add Commitment'] })] })] }) }) })] }) }));
}
