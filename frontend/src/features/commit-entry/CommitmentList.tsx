import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CommitmentCard } from './CommitmentCard';
import { useDragPriority } from '@/hooks/useDragPriority';
import type { Commitment, CycleState } from '@/types';

interface CommitmentListProps {
  commitments: Commitment[];
  cycleState: CycleState;
  cycleId: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CommitmentList({
  commitments,
  cycleState,
  cycleId,
  onEdit,
  onDelete,
}: CommitmentListProps) {
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
    return (
      <div className="space-y-3" aria-label="Commitment list">
        {commitments.map((commitment) => (
          <CommitmentCard
            key={commitment.id}
            commitment={commitment}
            cycleState={cycleState}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3" aria-label="Commitment list" role="list">
          {commitments.map((commitment) => (
            <div key={commitment.id} role="listitem">
              <CommitmentCard
                commitment={commitment}
                cycleState={cycleState}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeCommitment ? (
          <CommitmentCard
            commitment={activeCommitment}
            cycleState={cycleState}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
