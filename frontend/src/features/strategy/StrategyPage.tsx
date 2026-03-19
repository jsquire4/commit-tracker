import { useState, useCallback, useRef, useEffect } from 'react';
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
  User,
} from '@/types';

// ── Constants ───────────────────────────────────────────────────────────

const RCDO_TREE_KEY = ['rcdo', 'tree'];
const ALLOWED_ROLES = new Set(['VP', 'EXECUTIVE']);

// ── Owner dropdown ──────────────────────────────────────────────────────

function OwnerSelect({
  value,
  onChange,
  members,
}: {
  value: string;
  onChange: (v: string) => void;
  members: User[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => { onChange(e.target.value); }}
      className="mt-1 block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm
        dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
    >
      <option value="">No owner</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.displayName}
        </option>
      ))}
    </select>
  );
}

// ── Inline add form ─────────────────────────────────────────────────────

function InlineAddForm({
  placeholder,
  showOwner,
  members,
  isPending,
  onSave,
  onCancel,
}: {
  placeholder: string;
  showOwner: boolean;
  members: User[];
  isPending: boolean;
  onSave: (title: string, description: string, ownerUserId: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), description.trim(), ownerUserId);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); }}
        placeholder={placeholder}
        className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm
          dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      <textarea
        value={description}
        onChange={(e) => { setDescription(e.target.value); }}
        placeholder="Description (optional)"
        rows={2}
        className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm
          dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      {showOwner && (
        <OwnerSelect value={ownerUserId} onChange={setOwnerUserId} members={members} />
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!title.trim() || isPending}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white
            hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-sm text-gray-500 hover:text-gray-700
            dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Inline edit field ───────────────────────────────────────────────────

function InlineEditField({
  initialTitle,
  initialDescription,
  initialOwnerUserId,
  showOwner,
  members,
  isPending,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  initialDescription: string;
  initialOwnerUserId: string;
  showOwner: boolean;
  members: User[];
  isPending: boolean;
  onSave: (title: string, description: string | null, ownerUserId: string | null) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [ownerUserId, setOwnerUserId] = useState(initialOwnerUserId);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(
      title.trim(),
      description.trim() || null,
      ownerUserId || null
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); }}
        className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold
          dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      <textarea
        value={description}
        onChange={(e) => { setDescription(e.target.value); }}
        placeholder="Description (optional)"
        rows={2}
        className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm
          dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      />
      {showOwner && (
        <OwnerSelect value={ownerUserId} onChange={setOwnerUserId} members={members} />
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!title.trim() || isPending}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white
            hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1 text-sm text-gray-500 hover:text-gray-700
            dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Archive confirm button ──────────────────────────────────────────────

function ArchiveButton({
  label,
  onConfirm,
  isPending,
}: {
  label: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="text-red-600 dark:text-red-400">Archive {label}?</span>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="font-medium text-red-600 underline hover:text-red-800
            dark:text-red-400 dark:hover:text-red-300"
        >
          {isPending ? 'Archiving...' : 'Yes'}
        </button>
        <button
          onClick={() => { setConfirming(false); }}
          className="text-gray-500 underline hover:text-gray-700
            dark:text-gray-400 dark:hover:text-gray-200"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => { setConfirming(true); }}
      title={`Archive ${label}`}
      className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// ── Outcome item ────────────────────────────────────────────────────────

function OutcomeItem({
  outcome,
  members,
}: {
  outcome: OutcomeNode;
  members: User[];
}) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (req: UpdateRcdoNodeRequest) =>
      updateRcdoNode('outcomes', outcome.id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setEditing(false);
    },
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveRcdoNode('outcomes', outcome.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
    },
  });

  if (editing) {
    return (
      <li className="py-1">
        <InlineEditField
          initialTitle={outcome.title}
          initialDescription={outcome.description ?? ''}
          initialOwnerUserId={outcome.ownerUserId ?? ''}
          showOwner
          members={members}
          isPending={updateMut.isPending}
          onSave={(title, description, ownerUserId) => {
            updateMut.mutate({ title, description, ownerUserId });
          }}
          onCancel={() => { setEditing(false); }}
        />
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-2 py-1">
      <span className="mt-1 text-gray-400 dark:text-gray-500">&bull;</span>
      <div className="flex-1 min-w-0">
        <button
          onClick={() => { setEditing(true); }}
          className="text-left text-sm text-gray-800 hover:text-blue-600
            dark:text-gray-200 dark:hover:text-blue-400"
        >
          {outcome.title}
        </button>
        {outcome.ownerDisplayName && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            &mdash; {outcome.ownerDisplayName}
          </span>
        )}
        {outcome.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{outcome.description}</p>
        )}
      </div>
      <span className="opacity-0 transition-opacity group-hover:opacity-100">
        <ArchiveButton
          label="outcome"
          onConfirm={() => { archiveMut.mutate(); }}
          isPending={archiveMut.isPending}
        />
      </span>
    </li>
  );
}

// ── Objective card ──────────────────────────────────────────────────────

function ObjectiveCard({
  objective,
  members,
}: {
  objective: DefiningObjectiveNode;
  members: User[];
}) {
  const [editing, setEditing] = useState(false);
  const [addingOutcome, setAddingOutcome] = useState(false);
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (req: UpdateRcdoNodeRequest) =>
      updateRcdoNode('defining-objectives', objective.id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setEditing(false);
    },
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveRcdoNode('defining-objectives', objective.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
    },
  });

  const createOutcomeMut = useMutation({
    mutationFn: (req: CreateOutcomeRequest) => createOutcome(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setAddingOutcome(false);
    },
  });

  return (
    <div className="ml-4 mt-3 rounded-lg border-l-4 border-l-green-500 bg-gray-50 p-4
      dark:bg-gray-800/50">
      {editing ? (
        <InlineEditField
          initialTitle={objective.title}
          initialDescription={objective.description ?? ''}
          initialOwnerUserId={objective.ownerUserId ?? ''}
          showOwner
          members={members}
          isPending={updateMut.isPending}
          onSave={(title, description, ownerUserId) => {
            updateMut.mutate({ title, description, ownerUserId });
          }}
          onCancel={() => { setEditing(false); }}
        />
      ) : (
        <div className="group flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => { setEditing(true); }}
              className="text-left text-sm font-semibold text-gray-800 hover:text-green-600
                dark:text-gray-200 dark:hover:text-green-400"
            >
              {objective.title}
            </button>
            {objective.ownerDisplayName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Owner: {objective.ownerDisplayName}
              </p>
            )}
            {objective.description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {objective.description}
              </p>
            )}
          </div>
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            <ArchiveButton
              label="objective"
              onConfirm={() => { archiveMut.mutate(); }}
              isPending={archiveMut.isPending}
            />
          </span>
        </div>
      )}

      {/* Outcomes list */}
      <ul className="mt-2 space-y-0.5">
        {objective.outcomes.map((oc) => (
          <OutcomeItem key={oc.id} outcome={oc} members={members} />
        ))}
      </ul>

      {/* Add outcome */}
      {addingOutcome ? (
        <InlineAddForm
          placeholder="Outcome title"
          showOwner
          members={members}
          isPending={createOutcomeMut.isPending}
          onSave={(title, description, ownerUserId) => {
            createOutcomeMut.mutate({
              definingObjectiveId: objective.id,
              title,
              description: description || undefined,
              ownerUserId: ownerUserId || undefined,
            });
          }}
          onCancel={() => { setAddingOutcome(false); }}
        />
      ) : (
        <button
          onClick={() => { setAddingOutcome(true); }}
          className="mt-2 text-xs text-gray-400 hover:text-green-600
            dark:text-gray-500 dark:hover:text-green-400"
        >
          + Add Outcome
        </button>
      )}
    </div>
  );
}

// ── Rally Cry card ──────────────────────────────────────────────────────

function RallyCryCard({
  rallyCry,
  members,
  defaultExpanded,
}: {
  rallyCry: RallyCryNode;
  members: User[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [addingObjective, setAddingObjective] = useState(false);
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (req: UpdateRcdoNodeRequest) =>
      updateRcdoNode('rally-cries', rallyCry.id, req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setEditing(false);
    },
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveRcdoNode('rally-cries', rallyCry.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
    },
  });

  const createDoMut = useMutation({
    mutationFn: (req: CreateDefiningObjectiveRequest) =>
      createDefiningObjective(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setAddingObjective(false);
    },
  });

  const objectiveCount = rallyCry.definingObjectives.length;

  return (
    <div className="rounded-xl border border-gray-200 border-l-4 border-l-blue-500 bg-white p-5
      shadow-sm dark:border-gray-700 dark:border-l-blue-400 dark:bg-gray-900">
      {editing ? (
        <InlineEditField
          initialTitle={rallyCry.title}
          initialDescription={rallyCry.description ?? ''}
          initialOwnerUserId=""
          showOwner={false}
          members={members}
          isPending={updateMut.isPending}
          onSave={(title, description) => {
            updateMut.mutate({ title, description });
          }}
          onCancel={() => { setEditing(false); }}
        />
      ) : (
        <div className="group flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setExpanded(!expanded); }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => { setEditing(true); }}
                className="text-left text-base font-bold text-gray-900 hover:text-blue-600
                  dark:text-gray-100 dark:hover:text-blue-400"
              >
                {rallyCry.title}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {objectiveCount} objective{objectiveCount !== 1 ? 's' : ''}
              </span>
            </div>
            {rallyCry.description && (
              <p className="ml-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
                {rallyCry.description}
              </p>
            )}
          </div>
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            <ArchiveButton
              label="rally cry"
              onConfirm={() => { archiveMut.mutate(); }}
              isPending={archiveMut.isPending}
            />
          </span>
        </div>
      )}

      {expanded && !editing && (
        <div className="mt-3">
          {rallyCry.definingObjectives.map((doNode) => (
            <ObjectiveCard key={doNode.id} objective={doNode} members={members} />
          ))}

          {addingObjective ? (
            <div className="ml-4 mt-3">
              <InlineAddForm
                placeholder="Objective title"
                showOwner
                members={members}
                isPending={createDoMut.isPending}
                onSave={(title, description, ownerUserId) => {
                  createDoMut.mutate({
                    rallyCryId: rallyCry.id,
                    title,
                    description: description || undefined,
                    ownerUserId: ownerUserId || undefined,
                  });
                }}
                onCancel={() => { setAddingObjective(false); }}
              />
            </div>
          ) : (
            <button
              onClick={() => { setAddingObjective(true); }}
              className="ml-4 mt-3 text-xs text-gray-400 hover:text-blue-600
                dark:text-gray-500 dark:hover:text-blue-400"
            >
              + Add Objective
            </button>
          )}
        </div>
      )}
    </div>
  );
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

  const [addingRallyCry, setAddingRallyCry] = useState(false);

  const createRcMut = useMutation({
    mutationFn: (req: CreateRallyCryRequest) => createRallyCry(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RCDO_TREE_KEY });
      setAddingRallyCry(false);
    },
  });

  const handleAddRallyCry = useCallback(
    (title: string, description: string) => {
      createRcMut.mutate({
        title,
        description: description || undefined,
      });
    },
    [createRcMut]
  );

  // Access guard — hooks are already called above
  if (!role || !ALLOWED_ROLES.has(role)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          You do not have access to manage strategy. VP or Executive role required.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading strategy...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-600 dark:text-red-400">
          Failed to load strategy tree. Please try again.
        </p>
      </div>
    );
  }

  const rallyCries = tree?.rallyCries ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Strategy</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage rally cries, defining objectives, and outcomes.
        </p>
      </div>

      <div className="space-y-4">
        {rallyCries.map((rc, i) => (
          <RallyCryCard
            key={rc.id}
            rallyCry={rc}
            members={orgMembers}
            defaultExpanded={i === 0}
          />
        ))}
      </div>

      {addingRallyCry ? (
        <div className="mt-4">
          <InlineAddForm
            placeholder="Rally cry title"
            showOwner={false}
            members={[]}
            isPending={createRcMut.isPending}
            onSave={(title, description) => { handleAddRallyCry(title, description); }}
            onCancel={() => { setAddingRallyCry(false); }}
          />
        </div>
      ) : (
        <button
          onClick={() => { setAddingRallyCry(true); }}
          className="mt-4 text-sm text-gray-400 hover:text-blue-600
            dark:text-gray-500 dark:hover:text-blue-400"
        >
          + Add Rally Cry
        </button>
      )}
    </div>
  );
}
