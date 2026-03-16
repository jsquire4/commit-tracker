import { useState } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useReorderCommitments } from './useCommitments';
import { useUIStore } from '@/stores/ui.store';
import type { Commitment } from '@/types';

interface UseDragPriorityOptions {
  cycleId: string;
  commitments: Commitment[];
}

export function useDragPriority({ cycleId, commitments }: UseDragPriorityOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { setActiveDrag, setDragOverIndex } = useUIStore();
  const reorderMutation = useReorderCommitments();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    setActiveDrag(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);
    setActiveDrag(null);
    setDragOverIndex(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = commitments.findIndex((c) => c.id === String(active.id));
    const newIndex = commitments.findIndex((c) => c.id === String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(commitments, oldIndex, newIndex);
    const orderedIds = reordered.map((c) => c.id);

    reorderMutation.mutate({ cycleId, orderedIds });
  }

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    activeId,
  };
}
