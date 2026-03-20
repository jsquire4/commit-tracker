import { useMemo, useRef } from 'react';
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
import { useStagger } from '@/hooks/useMotion';
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
  const containerRef = useRef<HTMLDivElement>(null);
  useStagger(containerRef);

  const { sensors, handleDragStart, handleDragEnd, activeId } = useDragPriority({
    cycleId,
    commitments,
  });

  const activeCommitment = activeId
    ? commitments.find((c) => c.id === activeId)
    : null;

  // Separate assigned vs own commitments
  const assignedItems = useMemo(
    () => commitments.filter((c) => c.attribution.kind === 'ASSIGNED_BY'),
    [commitments],
  );
  const ownItems = useMemo(
    () => commitments.filter((c) => c.attribution.kind !== 'ASSIGNED_BY'),
    [commitments],
  );

  const items = commitments.map((c) => c.id);

  const renderCards = (list: Commitment[], isAssigned: boolean) =>
    list.map((commitment, i) => (
      <div
        key={commitment.id}
        role="listitem"
        className="animate-fade-up"
        style={{ animationDelay: `${i * 40}ms` }}
      >
        <CommitmentCard
          commitment={commitment}
          cycleState={cycleState}
          onEdit={onEdit}
          onDelete={onDelete}
          isAssigned={isAssigned}
        />
      </div>
    ));

  if (!isDraft) {
    return (
      <div ref={containerRef}>
        {assignedItems.length > 0 && (
          <>
            <h3 className="font-serif text-[1.125rem] font-normal text-on-surface mb-2">
              Assigned to You
            </h3>
            <div className="flex flex-col gap-3 mb-6" aria-label="Assigned commitments">
              {renderCards(assignedItems, true)}
            </div>
          </>
        )}

        {ownItems.length > 0 && (
          <>
            <h3 className="font-serif text-[1.125rem] font-normal text-on-surface mb-2">
              My Commitments
            </h3>
            <div className="flex flex-col gap-3" aria-label="Own commitments">
              {renderCards(ownItems, false)}
            </div>
          </>
        )}
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
        <div ref={containerRef}>
          {assignedItems.length > 0 && (
            <>
              <h3 className="font-serif text-[1.125rem] font-normal text-on-surface mb-2">
                Assigned to You
              </h3>
              <div className="flex flex-col gap-3 mb-6" aria-label="Assigned commitments" role="list">
                {renderCards(assignedItems, true)}
              </div>
            </>
          )}

          {ownItems.length > 0 && (
            <>
              <h3 className="font-serif text-[1.125rem] font-normal text-on-surface mb-2">
                My Commitments
              </h3>
              <div className="flex flex-col gap-3" aria-label="Own commitments" role="list">
                {renderCards(ownItems, false)}
              </div>
            </>
          )}
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
