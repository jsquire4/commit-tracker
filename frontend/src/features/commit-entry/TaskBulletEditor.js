import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove, } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
function BulletItem({ id, value, index, canRemove, disabled, onChange, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (_jsxs("div", { ref: setNodeRef, style: style, className: "flex items-center gap-2", children: [!disabled && (_jsx("button", { type: "button", ...attributes, ...listeners, className: "flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none focus:outline-none", "aria-label": `Drag to reorder bullet ${index + 1}`, children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) }) })), _jsx("input", { type: "text", value: value, onChange: (e) => onChange(e.target.value), disabled: disabled, placeholder: "What's involved?", "aria-label": `Task bullet ${index + 1}`, className: "flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500" }), !disabled && (_jsx("button", { type: "button", onClick: onRemove, disabled: !canRemove, "aria-label": `Remove bullet ${index + 1}`, className: "flex-shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none transition-colors", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) }))] }));
}
export function TaskBulletEditor({ bullets, onChange, disabled = false, min = 2, max = 5, }) {
    // Each bullet needs a stable id for dnd-kit
    const ids = bullets.map((_, i) => `bullet-${i}`);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1)
            return;
        onChange(arrayMove(bullets, oldIndex, newIndex));
    }
    function handleChange(index, value) {
        const next = [...bullets];
        next[index] = value;
        onChange(next);
    }
    function handleRemove(index) {
        if (bullets.length <= min)
            return;
        const next = bullets.filter((_, i) => i !== index);
        onChange(next);
    }
    function handleAdd() {
        if (bullets.length >= max)
            return;
        onChange([...bullets, '']);
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: _jsx(SortableContext, { items: ids, strategy: verticalListSortingStrategy, children: bullets.map((bullet, index) => (_jsx(BulletItem, { id: ids[index] ?? `bullet-${index}`, value: bullet, index: index, canRemove: bullets.length > min, disabled: disabled, onChange: (value) => handleChange(index, value), onRemove: () => handleRemove(index) }, ids[index] ?? `bullet-${index}`))) }) }), !disabled && (_jsxs("button", { type: "button", onClick: handleAdd, disabled: bullets.length >= max, className: "flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none transition-colors", children: [_jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }), "Add bullet"] }))] }));
}
