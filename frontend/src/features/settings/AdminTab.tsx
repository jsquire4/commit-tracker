import { useState, useMemo, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/hooks/useAuth';
import { useUserList, useCostBands, useCreateUser, useUpdateUser, useArchiveUser, useRestoreUser, useCreateOrg } from '@/hooks/useUsers';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { User, UserRole } from '@/types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'EMPLOYEE', label: 'Individual Contributor' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'VP', label: 'Vice President' },
  { value: 'EXECUTIVE', label: 'Executive' },
];

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: 'IC', ANALYST: 'Analyst', MANAGER: 'Manager',
  DIRECTOR: 'Director', VP: 'VP', EXECUTIVE: 'Exec',
};

// ─── User Form State ──────────────────────────────────────────────────────────

interface UserFormState {
  displayName: string;
  email: string;
  role: UserRole;
  reportsToId: string;
  costBandId: string;
  weeklyCapacityHours: string;
}

function emptyForm(): UserFormState {
  return { displayName: '', email: '', role: 'EMPLOYEE', reportsToId: '', costBandId: '', weeklyCapacityHours: '40' };
}

function formFromUser(user: User): UserFormState {
  return {
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    reportsToId: user.reportsTo ?? '',
    costBandId: user.costBandId ?? '',
    weeklyCapacityHours: String(user.weeklyCapacityHours ?? 40),
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminTab() {
  const { role, userId } = useAuth();
  const isExecutive = role === 'EXECUTIVE';

  const { data: users, isLoading: usersLoading } = useUserList();
  const { data: costBands } = useCostBands();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Archive confirm
  const [archiveTarget, setArchiveTarget] = useState<User | null>(null);

  // Org creation
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTimezone, setOrgTimezone] = useState('America/Chicago');

  // Mutations
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const archiveMutation = useArchiveUser();
  const restoreMutation = useRestoreUser();
  const createOrgMutation = useCreateOrg();

  // Managers list for the reportsTo dropdown
  const managers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) =>
      u.isActive && ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'].includes(u.role),
    ).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [users]);

  // Filtered user list
  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (statusFilter === 'active' && !u.isActive) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [users, search, roleFilter, statusFilter]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openAddUser() {
    setEditingUserId(null);
    setForm(emptyForm());
    setFormError(null);
    setFormOpen(true);
  }

  function openEditUser(user: User) {
    setEditingUserId(user.id);
    setForm(formFromUser(user));
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.displayName.trim()) { setFormError('Display name is required.'); return; }
    if (!editingUserId && !form.email.trim()) { setFormError('Email is required.'); return; }

    const payload = {
      displayName: form.displayName.trim(),
      role: form.role,
      ...(form.reportsToId ? { reportsToId: form.reportsToId } : {}),
      ...(form.costBandId ? { costBandId: form.costBandId } : {}),
      ...(form.weeklyCapacityHours ? { weeklyCapacityHours: parseFloat(form.weeklyCapacityHours) } : {}),
    };

    try {
      if (editingUserId) {
        await updateMutation.mutateAsync({ id: editingUserId, request: payload });
      } else {
        await createMutation.mutateAsync({ ...payload, email: form.email.trim() });
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    await archiveMutation.mutateAsync(archiveTarget.id);
    setArchiveTarget(null);
  }

  async function handleRestore(id: string) {
    await restoreMutation.mutateAsync(id);
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    try {
      await createOrgMutation.mutateAsync({ name: orgName.trim(), timezone: orgTimezone });
      setOrgFormOpen(false);
      setOrgName('');
    } catch {
      // error shown via mutation state
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (usersLoading) {
    return <LoadingSpinner label="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      {/* Executive: Create Org */}
      {isExecutive && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setOrgFormOpen(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            + Create Organization
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'active' | 'all'); }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active Only</option>
          <option value="all">All Users</option>
        </select>
        <button
          type="button"
          onClick={openAddUser}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          + Add User
        </button>
      </div>

      {/* User Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase tracking-wider bg-gray-900/50 border-b border-gray-800">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Reports To</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-800/50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-100">{user.displayName}</td>
                <td className="px-4 py-3 text-gray-400">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    {ROLE_LABEL[user.role] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{user.reportsToDisplayName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400">{user.costBandName ?? '—'}</td>
                <td className="px-4 py-3">
                  {user.isActive ? (
                    <span className="text-xs text-green-400">Active</span>
                  ) : (
                    <span className="text-xs text-red-400">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { openEditUser(user); }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Edit
                    </button>
                    {user.isActive && user.id !== userId ? (
                      <button
                        type="button"
                        onClick={() => { setArchiveTarget(user); }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : !user.isActive ? (
                      <button
                        type="button"
                        onClick={() => { void handleRestore(user.id); }}
                        className="text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        Reactivate
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {search || roleFilter ? 'No users match your filters.' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ─── User Form Slide-Over ──────────────────────────────────────────── */}
      <Transition appear show={formOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={() => { if (!isPending) setFormOpen(false); }}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-start justify-end">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-x-full" enterTo="opacity-100 translate-x-0" leave="ease-in duration-200" leaveFrom="opacity-100 translate-x-0" leaveTo="opacity-0 translate-x-full">
              <Dialog.Panel className="relative h-full w-full max-w-lg bg-gray-900 shadow-xl flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-100">
                    {editingUserId ? 'Edit User' : 'Add User'}
                  </Dialog.Title>
                  <button type="button" onClick={() => { if (!isPending) setFormOpen(false); }} disabled={isPending} className="text-gray-500 hover:text-gray-300 disabled:opacity-50" aria-label="Close">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <form id="user-form" onSubmit={(e) => { void handleSaveUser(e); }} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <div>
                    <label htmlFor="uf-name" className="block text-sm font-medium text-gray-300 mb-1">Display Name <span className="text-red-500">*</span></label>
                    <input id="uf-name" type="text" value={form.displayName} onChange={(e) => { setForm({ ...form, displayName: e.target.value }); }} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="uf-email" className="block text-sm font-medium text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                    <input id="uf-email" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); }} disabled={Boolean(editingUserId)} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="uf-role" className="block text-sm font-medium text-gray-300 mb-1">Role <span className="text-red-500">*</span></label>
                    <select id="uf-role" value={form.role} onChange={(e) => { setForm({ ...form, role: e.target.value as UserRole }); }} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="uf-reports" className="block text-sm font-medium text-gray-300 mb-1">Reports To</label>
                    <select id="uf-reports" value={form.reportsToId} onChange={(e) => { setForm({ ...form, reportsToId: e.target.value }); }} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">None (top-level)</option>
                      {managers.map((m) => <option key={m.id} value={m.id}>{m.displayName} ({ROLE_LABEL[m.role]})</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="uf-band" className="block text-sm font-medium text-gray-300 mb-1">Level / Cost Band</label>
                    <select id="uf-band" value={form.costBandId} onChange={(e) => { setForm({ ...form, costBandId: e.target.value }); }} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Not assigned</option>
                      {(costBands ?? []).map((b) => <option key={b.id} value={b.id}>{b.name} (Tier {b.tier})</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="uf-hours" className="block text-sm font-medium text-gray-300 mb-1">Weekly Capacity (hours)</label>
                    <input id="uf-hours" type="number" step="0.5" min="0" max="168" value={form.weeklyCapacityHours} onChange={(e) => { setForm({ ...form, weeklyCapacityHours: e.target.value }); }} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {formError && <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-3"><p className="text-sm text-red-300">{formError}</p></div>}
                </form>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
                  <button type="button" onClick={() => { if (!isPending) setFormOpen(false); }} disabled={isPending} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50">Cancel</button>
                  <button type="submit" form="user-form" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {editingUserId ? 'Save Changes' : 'Add User'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* ─── Archive Confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => { setArchiveTarget(null); }}
        onConfirm={() => { void handleArchive(); }}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${archiveTarget?.displayName ?? 'this user'}? They will no longer be able to access the platform.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        variant="danger"
        loading={archiveMutation.isPending}
      />

      {/* ─── Create Org Dialog ─────────────────────────────────────────────── */}
      <Transition appear show={orgFormOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={() => { setOrgFormOpen(false); }}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-6">
                <Dialog.Title className="text-lg font-semibold text-gray-100 mb-4">Create Organization</Dialog.Title>
                <form onSubmit={(e) => { void handleCreateOrg(e); }} className="space-y-4">
                  <div>
                    <label htmlFor="org-name" className="block text-sm font-medium text-gray-300 mb-1">Organization Name <span className="text-red-500">*</span></label>
                    <input id="org-name" type="text" value={orgName} onChange={(e) => { setOrgName(e.target.value); }} placeholder="Acme Manufacturing Inc." className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="org-tz" className="block text-sm font-medium text-gray-300 mb-1">Timezone</label>
                    <select id="org-tz" value={orgTimezone} onChange={(e) => { setOrgTimezone(e.target.value); }} className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="America/New_York">Eastern (America/New_York)</option>
                      <option value="America/Chicago">Central (America/Chicago)</option>
                      <option value="America/Denver">Mountain (America/Denver)</option>
                      <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
                      <option value="UTC">UTC</option>
                      <option value="Europe/London">London (Europe/London)</option>
                      <option value="Europe/Berlin">Berlin (Europe/Berlin)</option>
                      <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
                    </select>
                  </div>
                  {createOrgMutation.isError && (
                    <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-3">
                      <p className="text-sm text-red-300">{createOrgMutation.error instanceof Error ? createOrgMutation.error.message : 'Failed to create organization'}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setOrgFormOpen(false); }} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
                    <button type="submit" disabled={createOrgMutation.isPending || !orgName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                      {createOrgMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Create
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
