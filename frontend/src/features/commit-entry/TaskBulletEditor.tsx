import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BulletItemProps {
  id: string;
  value: string;
  index: number;
  canRemove: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}

function BulletItem({ id, value, index, canRemove, disabled, onChange, onRemove }: BulletItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none focus:outline-none"
          aria-label={`Drag to reorder bullet ${index + 1}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="What's involved?"
        aria-label={`Task bullet ${index + 1}`}
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove bullet ${index + 1}`}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface TaskBulletEditorProps {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export function TaskBulletEditor({
  bullets,
  onChange,
  disabled = false,
  min = 2,
  max = 5,
}: TaskBulletEditorProps) {
  // Each bullet needs a stable id for dnd-kit
  const ids = bullets.map((_, i) => `bullet-${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(bullets, oldIndex, newIndex));
  }

  function handleChange(index: number, value: string) {
    const next = [...bullets];
    next[index] = value;
    onChange(next);
  }

  function handleRemove(index: number) {
    if (bullets.length <= min) return;
    const next = bullets.filter((_, i) => i !== index);
    onChange(next);
  }

  function handleAdd() {
    if (bullets.length >= max) return;
    onChange([...bullets, '']);
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {bullets.map((bullet, index) => (
            <BulletItem
              key={ids[index] ?? `bullet-${index}`}
              id={ids[index] ?? `bullet-${index}`}
              value={bullet}
              index={index}
              canRemove={bullets.length > min}
              disabled={disabled}
              onChange={(value) => handleChange(index, value)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={bullets.length >= max}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add bullet
        </button>
      )}
    </div>
  );
}
