import { useState, useMemo, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/hooks/useAuth';
import { useUserList, useCostBands, useCreateUser, useUpdateUser, useArchiveUser, useRestoreUser, useCreateOrg } from '@/hooks/useUsers';
import { useStagger } from '@/hooks/useMotion';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Badge } from '@/components/Badge';
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
}

function emptyForm(): UserFormState {
  return { displayName: '', email: '', role: 'EMPLOYEE', reportsToId: '', costBandId: '' };
}

function formFromUser(user: User): UserFormState {
  return {
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    reportsToId: user.reportsTo ?? '',
    costBandId: user.costBandId ?? '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminTab() {
  const { role, userId } = useAuth();
  const isExecutive = role === 'EXECUTIVE';

  const { data: users, isLoading: usersLoading } = useUserList();
  const { data: costBands } = useCostBands();

  // Stagger ref for table rows
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

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

  // Managers list for the reportsTo dropdown.
  // When editing an archived user, include their current manager even if inactive,
  // so the dropdown reflects the existing assignment.
  const managers = useMemo(() => {
    if (!users) return [];
    const activeManagers = users.filter((u) =>
      u.isActive && ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'].includes(u.role),
    );
    // If editing, ensure the user's current manager appears even if inactive
    if (editingUserId && form.reportsToId) {
      const currentManagerIncluded = activeManagers.some((m) => m.id === form.reportsToId);
      if (!currentManagerIncluded) {
        const inactiveManager = users.find((u) => u.id === form.reportsToId);
        if (inactiveManager) {
          return [...activeManagers, inactiveManager].sort((a, b) => a.displayName.localeCompare(b.displayName));
        }
      }
    }
    return activeManagers.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [users, editingUserId, form.reportsToId]);

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

  // Apply stagger to table rows
  useStagger(tbodyRef);

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
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
    } catch {
      // Error is surfaced via mutation state
    } finally {
      setArchiveTarget(null);
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreMutation.mutateAsync(id);
    } catch {
      // Error is surfaced via mutation state
    }
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
          <Button variant="dashed" onClick={() => { setOrgFormOpen(true); }}>
            + Create Organization
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] bg-transparent border-0 border-b border-outline-variant px-0 py-2 text-body text-on-surface placeholder:text-muted focus:outline-none focus:border-b-accent transition-colors duration-[150ms]"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); }}
          className="bg-surface-lowest border-0 border-b border-outline-variant px-0 py-2 pr-6 text-[0.8125rem] text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[150ms]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0 center',
          }}
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'active' | 'all'); }}
          className="bg-surface-lowest border-0 border-b border-outline-variant px-0 py-2 pr-6 text-[0.8125rem] text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[150ms]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0 center',
          }}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
        </select>
        <Button variant="primary" onClick={openAddUser}>
          + Add User
        </Button>
      </div>

      {/* User Table */}
      <div className="bg-surface-lowest rounded-sm overflow-hidden">
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Name</th>
              <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Email</th>
              <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Role</th>
              <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Reports To</th>
              <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Cost Band</th>
              <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Status</th>
              <th className="px-4 py-3 text-right text-[0.6875rem] font-medium uppercase tracking-[0.05rem] text-muted">Actions</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {filtered.map((user) => (
              <tr
                key={user.id}
                className={[
                  'border-b border-outline-variant/15',
                  'animate-fade-up',
                  'transition-colors duration-[150ms] hover:bg-surface',
                  !user.isActive ? 'text-muted' : '',
                ].join(' ')}
                style={{ animationDelay: `calc(var(--stagger-index, 0) * 40ms)` }}
              >
                <td className="px-4 py-3 font-medium text-on-surface">{user.displayName}</td>
                <td className="px-4 py-3 text-on-surface-variant">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge size="sm">{ROLE_LABEL[user.role] ?? user.role}</Badge>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{user.reportsToDisplayName ?? '\u2014'}</td>
                <td className="px-4 py-3 text-on-surface-variant">{user.costBandName ?? '\u2014'}</td>
                <td className="px-4 py-3">
                  {user.isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-[0.75rem]">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-on-surface-variant">Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[0.75rem]">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted" />
                      <span className="text-muted">Inactive</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { openEditUser(user); }}
                      className="text-[0.75rem] font-medium text-navy bg-transparent border-0 cursor-pointer relative transition-colors duration-[150ms] hover:text-accent-dark after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-0 after:h-px after:bg-current after:transition-[width] after:duration-[200ms] hover:after:w-full"
                    >
                      Edit
                    </button>
                    {user.isActive && user.id !== userId ? (
                      <button
                        type="button"
                        onClick={() => { setArchiveTarget(user); }}
                        className="text-[0.75rem] font-medium text-error bg-transparent border-0 cursor-pointer relative transition-colors duration-[150ms] hover:text-[#8A3634] after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-0 after:h-px after:bg-current after:transition-[width] after:duration-[200ms] hover:after:w-full"
                      >
                        Deactivate
                      </button>
                    ) : !user.isActive ? (
                      <button
                        type="button"
                        onClick={() => { void handleRestore(user.id); }}
                        className="text-[0.75rem] font-medium text-accent bg-transparent border-0 cursor-pointer relative transition-colors duration-[150ms] hover:text-accent-dark after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-0 after:h-px after:bg-current after:transition-[width] after:duration-[200ms] hover:after:w-full"
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
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  {search || roleFilter ? 'No users match your filters.' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-outline-variant text-[0.75rem] text-muted tabular-nums">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ─── User Form Slide-Over ──────────────────────────────────────────── */}
      <Transition appear show={formOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={() => { if (!isPending) setFormOpen(false); }}>
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="duration-[200ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-on-surface/30" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-start justify-end">
            {/* Panel */}
            <Transition.Child
              as={Fragment}
              enter="duration-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="relative h-full w-full max-w-[440px] bg-surface-lowest shadow-whisper flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
                  <Dialog.Title className="font-serif text-[1.125rem] font-normal text-on-surface">
                    {editingUserId ? 'Edit User' : 'Add User'}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={() => { if (!isPending) setFormOpen(false); }}
                    disabled={isPending}
                    className="text-muted hover:text-on-surface transition-colors duration-[150ms] p-1 disabled:opacity-50"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Body */}
                <form id="user-form" onSubmit={(e) => { void handleSaveUser(e); }} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                  <Input
                    label="Display Name"
                    required
                    value={form.displayName}
                    onChange={(e) => { setForm({ ...form, displayName: e.target.value }); }}
                    placeholder="Full name"
                  />
                  <Input
                    label="Email"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); }}
                    placeholder="name@company.com"
                    disabled={Boolean(editingUserId)}
                  />

                  {/* Role select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
                      Role <span className="text-error ml-0.5">*</span>
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => { setForm({ ...form, role: e.target.value as UserRole }); }}
                      className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[200ms]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0 center',
                      }}
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  {/* Reports To select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
                      Reports To
                    </label>
                    <select
                      value={form.reportsToId}
                      onChange={(e) => { setForm({ ...form, reportsToId: e.target.value }); }}
                      className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[200ms]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0 center',
                      }}
                    >
                      <option value="">None (top-level)</option>
                      {managers.map((m) => <option key={m.id} value={m.id}>{m.displayName} ({ROLE_LABEL[m.role]})</option>)}
                    </select>
                  </div>

                  {/* Cost Band select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
                      Level / Cost Band
                    </label>
                    <select
                      value={form.costBandId}
                      onChange={(e) => { setForm({ ...form, costBandId: e.target.value }); }}
                      className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[200ms]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0 center',
                      }}
                    >
                      <option value="">Not assigned</option>
                      {(costBands ?? []).map((b) => <option key={b.id} value={b.id}>{b.name} (Tier {b.tier})</option>)}
                    </select>
                  </div>

                  {formError && (
                    <div className="rounded-sm bg-error/10 border border-error/20 px-4 py-3">
                      <p className="text-body text-error">{formError}</p>
                    </div>
                  )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
                  <Button
                    variant="secondary"
                    onClick={() => { if (!isPending) setFormOpen(false); }}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    form="user-form"
                    disabled={isPending}
                    loading={isPending}
                  >
                    {editingUserId ? 'Save Changes' : 'Add User'}
                  </Button>
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
          <Transition.Child
            as={Fragment}
            enter="duration-[200ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-on-surface/40" aria-hidden="true" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="duration-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              enterFrom="opacity-0 translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-2"
            >
              <Dialog.Panel className="w-full max-w-[440px] bg-surface-lowest rounded-sm p-8 shadow-whisper">
                <Dialog.Title className="font-serif text-[1.125rem] font-normal text-on-surface mb-6">
                  Create Organization
                </Dialog.Title>
                <form onSubmit={(e) => { void handleCreateOrg(e); }} className="space-y-5">
                  <Input
                    label="Organization Name"
                    required
                    value={orgName}
                    onChange={(e) => { setOrgName(e.target.value); }}
                    placeholder="Acme Manufacturing Inc."
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
                      Timezone
                    </label>
                    <select
                      value={orgTimezone}
                      onChange={(e) => { setOrgTimezone(e.target.value); }}
                      className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent cursor-pointer appearance-none transition-colors duration-[200ms]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0 center',
                      }}
                    >
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
                    <div className="rounded-sm bg-error/10 border border-error/20 px-4 py-3">
                      <p className="text-body text-error">{createOrgMutation.error instanceof Error ? createOrgMutation.error.message : 'Failed to create organization'}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={() => { setOrgFormOpen(false); }}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={createOrgMutation.isPending || !orgName.trim()}
                      loading={createOrgMutation.isPending}
                    >
                      Create
                    </Button>
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
