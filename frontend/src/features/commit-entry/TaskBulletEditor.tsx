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
          className="flex-shrink-0 text-muted hover:text-on-surface cursor-grab active:cursor-grabbing touch-none focus:outline-none transition-colors duration-[150ms]"
          aria-label={`Drag to reorder bullet ${String(index + 1)}`}
        >
          <span className="text-base leading-none select-none" aria-hidden="true">&#10303;</span>
        </button>
      )}

      {/* Numbered indicator */}
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-container text-on-surface-variant text-small flex items-center justify-center font-medium tabular-nums">
        {index + 1}
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        disabled={disabled}
        placeholder="What's involved?"
        aria-label={`Task bullet ${String(index + 1)}`}
        className="flex-1 border-0 border-b border-b-outline-variant bg-transparent px-0 py-1.5 text-body text-on-surface placeholder:text-muted focus:outline-none focus:border-b-accent transition-colors duration-[200ms] disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove bullet ${String(index + 1)}`}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-sm text-muted hover:text-error hover:bg-error/[0.08] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none transition-colors duration-[150ms]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
  const ids = bullets.map((_, i) => `bullet-${String(i)}`);

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
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {bullets.map((bullet, index) => (
            <BulletItem
              key={ids[index] ?? `bullet-${String(index)}`}
              id={ids[index] ?? `bullet-${String(index)}`}
              value={bullet}
              index={index}
              canRemove={bullets.length > min}
              disabled={disabled}
              onChange={(value) => { handleChange(index, value); }}
              onRemove={() => { handleRemove(index); }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={bullets.length >= max}
          className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent hover:text-accent-dark disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none transition-colors duration-[150ms] mt-1"
        >
          <span aria-hidden="true">+</span>
          Add subtask
        </button>
      )}
    </div>
  );
}
