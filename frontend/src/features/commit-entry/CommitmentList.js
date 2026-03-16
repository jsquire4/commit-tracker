import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DndContext, closestCenter, DragOverlay, } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, } from '@dnd-kit/sortable';
import { CommitmentCard } from './CommitmentCard';
import { useDragPriority } from '@/hooks/useDragPriority';
export function CommitmentList({ commitments, cycleState, cycleId, onEdit, onDelete, }) {
    const isDraft = cycleState === 'DRAFT';
    const { sensors, handleDragStart, handleDragEnd, activeId } = useDragPriority({
        cycleId,
        commitments,
    });
    const activeCommitment = activeId
        ? commitments.find((c) => c.id === activeId)
        : null;
    const items = commitments.map((c) => c.id);
    if (!isDraft) {
        // Non-draft: no drag, just render cards
        return (_jsx("div", { className: "space-y-3", "aria-label": "Commitment list", children: commitments.map((commitment) => (_jsx(CommitmentCard, { commitment: commitment, cycleState: cycleState, onEdit: onEdit, onDelete: onDelete }, commitment.id))) }));
    }
    return (_jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: handleDragStart, onDragEnd: handleDragEnd, children: [_jsx(SortableContext, { items: items, strategy: verticalListSortingStrategy, children: _jsx("div", { className: "space-y-3", "aria-label": "Commitment list", role: "list", children: commitments.map((commitment) => (_jsx("div", { role: "listitem", children: _jsx(CommitmentCard, { commitment: commitment, cycleState: cycleState, onEdit: onEdit, onDelete: onDelete }) }, commitment.id))) }) }), _jsx(DragOverlay, { children: activeCommitment ? (_jsx(CommitmentCard, { commitment: activeCommitment, cycleState: cycleState, onEdit: onEdit, onDelete: onDelete })) : null })] }));
}
