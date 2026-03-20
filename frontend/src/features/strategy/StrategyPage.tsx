import { useState, useCallback } from 'react';
import {
  useMutation,
  useQueryClient,
  useQuery,
} from '@tanstack/react-query';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useAuth } from '@/hooks/useAuth';
import { getOrgTree } from '@/api/users.api';
import {
  createRallyCry,
  createDefiningObjective,
  createOutcome,
  updateRcdoNode,
  archiveRcdoNode,
} from '@/api/rcdo.api';
import type {
  CreateRallyCryRequest,
  CreateDefiningObjectiveRequest,
  CreateOutcomeRequest,
  UpdateRcdoNodeRequest,
} from '@/api/rcdo.api';
import type {
  RallyCryNode,
  DefiningObjectiveNode,
  OutcomeNode,
} from '@/types';
import { RallyCryColumn } from './RallyCryColumn';
import { StrategyModal, type StrategyModalMode, type BreadcrumbPart } from './StrategyModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// ── Constants ───────────────────────────────────────────────────────────

const RCDO_TREE_KEY = ['rcdo', 'tree'];
const ALLOWED_ROLES = new Set(['VP', 'EXECUTIVE']);

// ── Modal state types ───────────────────────────────────────────────────

interface ModalState {
  open: boolean;
  mode: StrategyModalMode;
  /** For edit: the id of the node being edited */
  editId: string | null;
  /** For edit: the type path segment */
  editType: 'rally-cries' | 'defining-objectives' | 'outcomes' | null;
  /** Parent context IDs */
  rallyCryId: string | null;
  objectiveId: string | null;
  /** Breadcrumb parts */
  breadcrumb: BreadcrumbPart[];
  /** Pre-filled values for edit */
  initialTitle: string;
  initialDescription: string;
  initialOwnerUserId: string;
}

function emptyModal(): ModalState {
  return {
    open: false,
    mode: 'rallycry',
    editId: null,
    editType: null,
    rallyCryId: null,
    objectiveId: null,
    breadcrumb: [],
    initialTitle: '',
    initialDescription: '',
    initialOwnerUserId: '',
  };
}

// ── Main page ───────────────────────────────────────────────────────────

export function StrategyPage() {
  const { role } = useAuth();
  const { data: tree, isLoading, isError } = useRcdoTree();
  const queryClient = useQueryClient();

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['users', 'org-tree'],
    queryFn: getOrgTree,
    staleTime: 10 * 60_000,
  });

  const [modal, setModal] = useState<ModalState>(emptyModal);
  const [archiveTarget, setArchiveTarget] = useState<{
    type: 'rally-cries' | 'defining-objectives' | 'outcomes';
    id: string;
    label: string;
  } | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────────

  const createRcMut = useMutation({
    mutationFn: (req: CreateRallyCryRequest) => createRallyCry(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setModal(emptyModal());
    },
  });

  const createDoMut = useMutation({
    mutationFn: (req: CreateDefiningObjectiveRequest) => createDefiningObjective(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setModal(emptyModal());
    },
  });

  const createOutcomeMut = useMutation({
    mutationFn: (req: CreateOutcomeRequest) => createOutcome(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setModal(emptyModal());
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ type, id, req }: { type: string; id: string; req: UpdateRcdoNodeRequest }) =>
      updateRcdoNode(type as 'rally-cries' | 'defining-objectives' | 'outcomes', id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setModal(emptyModal());
    },
  });

  const archiveMut = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      archiveRcdoNode(type as 'rally-cries' | 'defining-objectives' | 'outcomes', id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setArchiveTarget(null);
    },
  });

  const isPending = createRcMut.isPending || createDoMut.isPending || createOutcomeMut.isPending || updateMut.isPending;

  // ── Modal openers ─────────────────────────────────────────────────────

  const openAddRallyCry = useCallback(() => {
    setModal({
      ...emptyModal(),
      open: true,
      mode: 'rallycry',
    });
  }, []);

  const openAddObjective = useCallback((rc: RallyCryNode) => {
    setModal({
      ...emptyModal(),
      open: true,
      mode: 'objective',
      rallyCryId: rc.id,
      breadcrumb: [{ label: 'Rally Cry', value: rc.title }],
    });
  }, []);

  const openAddOutcome = useCallback((obj: DefiningObjectiveNode, rc: RallyCryNode) => {
    setModal({
      ...emptyModal(),
      open: true,
      mode: 'outcome',
      rallyCryId: rc.id,
      objectiveId: obj.id,
      breadcrumb: [
        { label: 'Rally Cry', value: rc.title },
        { label: 'Objective', value: obj.title },
      ],
    });
  }, []);

  const openEditRallyCry = useCallback((rc: RallyCryNode) => {
    setModal({
      ...emptyModal(),
      open: true,
      mode: 'rallycry',
      editId: rc.id,
      editType: 'rally-cries',
      initialTitle: rc.title,
      initialDescription: rc.description ?? '',
    });
  }, []);

  const openEditObjective = useCallback((obj: DefiningObjectiveNode, rc: RallyCryNode) => {
    setModal({
      ...emptyModal(),
      open: true,
      mode: 'objective',
      editId: obj.id,
      editType: 'defining-objectives',
      rallyCryId: rc.id,
      breadcrumb: [{ label: 'Rally Cry', value: rc.title }],
      initialTitle: obj.title,
      initialDescription: obj.description ?? '',
      initialOwnerUserId: obj.ownerUserId ?? '',
    });
  }, []);

  const openEditOutcome = useCallback((oc: OutcomeNode, obj: DefiningObjectiveNode, rc: RallyCryNode) => {
    setModal({
      ...emptyModal(),
      open: true,
      mode: 'outcome',
      editId: oc.id,
      editType: 'outcomes',
      rallyCryId: rc.id,
      objectiveId: obj.id,
      breadcrumb: [
        { label: 'Rally Cry', value: rc.title },
        { label: 'Objective', value: obj.title },
      ],
      initialTitle: oc.title,
      initialDescription: oc.description ?? '',
      initialOwnerUserId: oc.ownerUserId ?? '',
    });
  }, []);

  // ── Save handler ──────────────────────────────────────────────────────

  const handleModalSave = useCallback(
    (title: string, description: string, ownerUserId: string) => {
      // Edit mode
      if (modal.editId && modal.editType) {
        updateMut.mutate({
          type: modal.editType,
          id: modal.editId,
          req: {
            title,
            description: description || null,
            ownerUserId: ownerUserId || null,
          },
        });
        return;
      }

      // Create mode
      if (modal.mode === 'rallycry') {
        createRcMut.mutate({
          title,
          description: description || undefined,
        });
      } else if (modal.mode === 'objective' && modal.rallyCryId) {
        createDoMut.mutate({
          rallyCryId: modal.rallyCryId,
          title,
          description: description || undefined,
          ownerUserId: ownerUserId || undefined,
        });
      } else if (modal.mode === 'outcome' && modal.objectiveId) {
        createOutcomeMut.mutate({
          definingObjectiveId: modal.objectiveId,
          title,
          description: description || undefined,
          ownerUserId: ownerUserId || undefined,
        });
      }
    },
    [modal, createRcMut, createDoMut, createOutcomeMut, updateMut],
  );

  // ── Access guard ──────────────────────────────────────────────────────

  if (!role || !ALLOWED_ROLES.has(role)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-on-surface-variant">
          You do not have access to manage strategy. VP or Executive role required.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted">Loading strategy...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-error">
          Failed to load strategy tree. Please try again.
        </p>
      </div>
    );
  }

  const rallyCries = tree?.rallyCries ?? [];
  const totalObjectives = rallyCries.reduce((s, rc) => s + rc.definingObjectives.length, 0);
  const totalOutcomes = rallyCries.reduce(
    (s, rc) => s + rc.definingObjectives.reduce((os, d) => os + d.outcomes.length, 0),
    0,
  );

  return (
    <div className="min-h-screen bg-surface">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6 max-w-[1280px] mx-auto animate-fade-in">
          <div>
            <h1 className="font-serif text-headline text-on-surface">Strategic Framework</h1>
            <p className="mt-1 text-body text-on-surface-variant">
              Define rally cries, objectives, and outcomes. All commitments link back to this tree.
            </p>
          </div>
          <div className="text-[0.8125rem] text-muted whitespace-nowrap mt-1 tabular-nums">
            {rallyCries.length} rally {rallyCries.length === 1 ? 'cry' : 'cries'} &middot;{' '}
            {totalObjectives} objective{totalObjectives !== 1 ? 's' : ''} &middot;{' '}
            {totalOutcomes} outcome{totalOutcomes !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Strategy Board — horizontal scroll Kanban */}
        <div
          className="flex gap-8 overflow-x-auto pb-4 scroll-smooth
            [-webkit-overflow-scrolling:touch]
            [&::-webkit-scrollbar]:h-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-surface-container-high
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb:hover]:bg-muted"
        >
          {rallyCries.map((rc) => (
            <RallyCryColumn
              key={rc.id}
              rallyCry={rc}
              onEditRallyCry={() => { openEditRallyCry(rc); }}
              onArchiveRallyCry={() => {
                setArchiveTarget({ type: 'rally-cries', id: rc.id, label: rc.title });
              }}
              onEditObjective={(obj) => { openEditObjective(obj, rc); }}
              onArchiveObjective={(obj) => {
                setArchiveTarget({ type: 'defining-objectives', id: obj.id, label: obj.title });
              }}
              onAddObjective={() => { openAddObjective(rc); }}
              onEditOutcome={(oc, obj) => { openEditOutcome(oc, obj, rc); }}
              onArchiveOutcome={(oc) => {
                setArchiveTarget({ type: 'outcomes', id: oc.id, label: oc.title });
              }}
              onAddOutcome={(obj) => { openAddOutcome(obj, rc); }}
            />
          ))}

          {/* Add Rally Cry — dashed column button */}
          <button
            type="button"
            onClick={openAddRallyCry}
            className="min-w-[340px] max-w-[440px] flex-[1_0_340px]
              flex items-center justify-center gap-2
              px-5 py-5 text-[0.9375rem] font-medium text-accent
              bg-transparent border-[1.5px] border-dashed border-outline-variant rounded-sm
              cursor-pointer self-stretch
              transition-all duration-[150ms]
              hover:bg-accent/[0.04] hover:border-accent
              active:translate-y-px
              animate-fade-up
              relative
              [&]:before:content-[''] [&]:before:absolute [&]:before:-left-4
              [&]:before:top-0 [&]:before:bottom-0 [&]:before:w-px
              [&]:before:bg-outline-variant/15"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Rally Cry
          </button>
        </div>
      </div>

      {/* Strategy Modal — create/edit */}
      <StrategyModal
        open={modal.open}
        mode={modal.mode}
        breadcrumb={modal.breadcrumb}
        members={orgMembers}
        isPending={isPending}
        isEdit={modal.editId !== null}
        initialTitle={modal.initialTitle}
        initialDescription={modal.initialDescription}
        initialOwnerUserId={modal.initialOwnerUserId}
        onSave={handleModalSave}
        onClose={() => { setModal(emptyModal()); }}
      />

      {/* Archive confirmation */}
      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => { setArchiveTarget(null); }}
        onConfirm={() => {
          if (archiveTarget) {
            archiveMut.mutate({ type: archiveTarget.type, id: archiveTarget.id });
          }
        }}
        title={`Archive "${archiveTarget?.label ?? ''}"?`}
        description="This will archive the item. Linked commitments will not be deleted."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="danger"
        loading={archiveMut.isPending}
      />
    </div>
  );
}
