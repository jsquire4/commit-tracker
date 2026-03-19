import { useState, useMemo, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments, useCreateCommitment } from '@/hooks/useCommitments';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { TeamAnalytics } from './TeamAnalytics';
import type {
  UserRole,
  Commitment,
  ReconciliationStatus,
  TeamMemberSummary,
  AssignmentAttributionResponse,
  ChessCategoryType,
  CompletionHorizon,
} from '@/types';

const ALLOWED_ROLES: UserRole[] = ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    EMPLOYEE: 'IC', MANAGER: 'Manager', DIRECTOR: 'Director',
    VP: 'VP', EXECUTIVE: 'Exec', ANALYST: 'Analyst',
  };
  return map[role] ?? role;
}

function groupByRallyCry(commitments: Commitment[]): { label: string; count: number }[] {
  const groups: Record<string, number> = {};
  let unlinked = 0;
  for (const c of commitments) {
    if (c.rcdoLink?.rallyCryTitle) {
      const title = c.rcdoLink.rallyCryTitle;
      groups[title] = (groups[title] ?? 0) + 1;
    } else {
      unlinked += 1;
    }
  }
  const result = Object.entries(groups).map(([label, count]) => ({ label, count }));
  if (unlinked > 0) result.push({ label: 'Unlinked', count: unlinked });
  return result;
}

function lastWeekSummary(commitments: Commitment[]): { text: string; hasWarning: boolean } {
  const reconciled = commitments.filter((c) => c.reconciliationStatus != null);
  if (reconciled.length === 0) return { text: 'No prior reconciliation data', hasWarning: false };
  const completed = reconciled.filter((c) => c.reconciliationStatus === 'COMPLETED').length;
  if (completed === reconciled.length) return { text: 'All completed', hasWarning: false };
  return { text: `Partially completed (${completed} of ${reconciled.length})`, hasWarning: true };
}

function rallyCryColor(label: string): string {
  if (label === 'Unlinked') return 'bg-gray-700 text-gray-300';
  const colors = [
    'bg-blue-800/60 text-blue-300', 'bg-emerald-800/60 text-emerald-300',
    'bg-violet-800/60 text-violet-300', 'bg-amber-800/60 text-amber-300',
    'bg-rose-800/60 text-rose-300', 'bg-cyan-800/60 text-cyan-300',
  ];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length]!;
}

const RECON_STATUS_LABEL: Record<ReconciliationStatus, string> = {
  COMPLETED: 'Completed', PARTIALLY_COMPLETED: 'Partial',
  NOT_STARTED: 'Not started', CARRIED_FORWARD: 'Carried forward',
};
const RECON_STATUS_COLOR: Record<ReconciliationStatus, string> = {
  COMPLETED: 'text-emerald-400', PARTIALLY_COMPLETED: 'text-amber-400',
  NOT_STARTED: 'text-red-400', CARRIED_FORWARD: 'text-blue-400',
};

const CHESS_CATEGORIES: { value: ChessCategoryType; label: string }[] = [
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'DEFENSIVE', label: 'Defensive' },
  { value: 'CAPABILITY_BUILDING', label: 'Capability Building' },
];

// ─── Assignment Form State ────────────────────────────────────────────────────

interface AssignmentFormState {
  employeeId: string;
  title: string;
  rallyCryId: string;
  rallyCryTitle: string;
  definingObjectiveId: string;
  chessCategoryId: ChessCategoryType | '';
  bullets: string[];
}

function createEmptyFormState(): AssignmentFormState {
  return { employeeId: '', title: '', rallyCryId: '', rallyCryTitle: '', definingObjectiveId: '', chessCategoryId: '', bullets: ['', ''] };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamOverview({ memberCount, totalCommitments, linkedPercentage, carriedCount }: {
  memberCount: number; totalCommitments: number; linkedPercentage: number; carriedCount: number;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-lg font-semibold text-gray-100">
        Your team: {memberCount} people, {totalCommitments} commitment{totalCommitments !== 1 ? 's' : ''} this week
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
        <span>{Math.round(linkedPercentage)}% linked to a rally cry</span>
        <span>{carriedCount} carried forward</span>
      </div>
    </div>
  );
}

function PersonCard({ member, commitments, onAssign }: {
  member: TeamMemberSummary; commitments: Commitment[]; onAssign: (m: TeamMemberSummary) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(() => groupByRallyCry(commitments), [commitments]);
  const { text: lastWeek, hasWarning } = useMemo(() => lastWeekSummary(commitments), [commitments]);

  return (
    <div className={`bg-gray-900 border rounded-lg p-4 transition-colors ${hasWarning ? 'border-gray-800 border-l-4 border-l-amber-500' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasWarning && <span className="text-amber-400 text-sm" title="Needs attention">&#9888;</span>}
          <span className="text-base font-semibold text-gray-100">{member.displayName}</span>
        </div>
        <span className="text-xs text-gray-500 font-medium">{roleLabel(member.role)}</span>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        {commitments.length} commitment{commitments.length !== 1 ? 's' : ''}
        {groups.length > 0 && (
          <>
            {' '}&middot; Working on:{' '}
            {groups.map((g) => (
              <span key={g.label} className={`inline-block text-xs px-1.5 py-0.5 rounded mr-1 ${rallyCryColor(g.label)}`}>
                {g.label} ({g.count})
              </span>
            ))}
          </>
        )}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">Last week: {lastWeek}</p>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors" onClick={() => { setExpanded(!expanded); }}>
          <span className="inline-block transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9656;</span>
          {expanded ? 'Hide commitments' : 'View commitments'}
        </button>
        <span className="text-gray-700">|</span>
        <button type="button" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors" onClick={() => { onAssign(member); }}>Assign</button>
      </div>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: expanded ? '2000px' : '0px' }}>
        <ul className="mt-3 space-y-2">
          {commitments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 py-1 border-t border-gray-800 first:border-t-0">
              <div className="min-w-0">
                <p className="text-sm text-gray-200 truncate">{c.title}</p>
                {c.rcdoLink?.rallyCryTitle && (
                  <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 ${rallyCryColor(c.rcdoLink.rallyCryTitle)}`}>{c.rcdoLink.rallyCryTitle}</span>
                )}
              </div>
              {c.reconciliationStatus && (
                <span className={`text-xs whitespace-nowrap ${RECON_STATUS_COLOR[c.reconciliationStatus]}`}>{RECON_STATUS_LABEL[c.reconciliationStatus]}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface CoverageGapItem { definingObjectiveId: string; title: string; rallyCryTitle: string }

function CoverageGaps({ gaps, onAssignWork }: { gaps: CoverageGapItem[]; onAssignWork: (g: CoverageGapItem) => void }) {
  if (gaps.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-100 mb-2">Coverage Gaps</h2>
        <div className="flex items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-900/20 p-4">
          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-emerald-300">All objectives have commitments this cycle.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-2">Coverage Gaps</h2>
      <p className="text-xs text-gray-500 mb-3">Objectives with no commitments this cycle.</p>
      <ul className="space-y-2">
        {gaps.map((gap) => (
          <li key={gap.definingObjectiveId} className="flex items-center justify-between gap-3 rounded-lg border border-amber-700 bg-amber-900/20 p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-200 truncate">{gap.title}</p>
              <p className="text-xs text-amber-400 truncate">Under: {gap.rallyCryTitle}</p>
            </div>
            <button type="button" onClick={() => { onAssignWork(gap); }} className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
              Assign work
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssignmentPatterns({ attribution }: { attribution: AssignmentAttributionResponse }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <h2 className="text-base font-semibold text-gray-100 mb-2">Assignment Patterns</h2>
      <p className="text-sm text-gray-400">
        You assigned {Math.round(attribution.managerAssignedPercentage)}% of work this week. {Math.round(attribution.selfDirectedPercentage)}% was self-directed.
      </p>
      {(attribution.concentrationRisks ?? []).length > 0 && (
        <div className="mt-2 space-y-1">
          {attribution.concentrationRisks.map((risk) => (
            <p key={risk.assignedToUserId} className="text-sm text-amber-400">
              {risk.assignedToName} received {Math.round(risk.percentageOfTotal)}% of all assignments.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assignment Slide-Over Form ───────────────────────────────────────────────

function AssignWorkForm({ open, onClose, members, initialState, cycleId, managerId }: {
  open: boolean; onClose: () => void; members: TeamMemberSummary[];
  initialState: AssignmentFormState; cycleId: string; managerId: string;
}) {
  const [form, setForm] = useState<AssignmentFormState>(initialState);
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateCommitment(cycleId);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) { setForm(initialState); setFormError(null); createMutation.reset(); }
  if (open !== prevOpen) setPrevOpen(open);

  function updateBullet(index: number, value: string) {
    setForm((prev) => { const next = [...prev.bullets]; next[index] = value; return { ...prev, bullets: next }; });
  }
  function addBullet() { if (form.bullets.length < 5) setForm((prev) => ({ ...prev, bullets: [...prev.bullets, ''] })); }
  function removeBullet(index: number) { if (form.bullets.length > 2) setForm((prev) => ({ ...prev, bullets: prev.bullets.filter((_, i) => i !== index) })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employeeId) { setFormError('Please select a team member.'); return; }
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    const nonEmptyBullets = form.bullets.filter((b) => b.trim().length > 0);
    if (nonEmptyBullets.length < 2) { setFormError('At least 2 task bullets are required.'); return; }
    try {
      await createMutation.mutateAsync({
        cycleId, title: form.title.trim(), bullets: nonEmptyBullets,
        completionHorizon: 'EOW' as CompletionHorizon, assignedBy: managerId,
        ...(form.chessCategoryId ? { chessCategoryId: form.chessCategoryId } : {}),
        ...(form.rallyCryId ? { rallyCryId: form.rallyCryId } : {}),
        ...(form.definingObjectiveId ? { definingObjectiveId: form.definingObjectiveId } : {}),
      });
      onClose();
    } catch { /* error displayed via mutation state */ }
  }

  const isPending = createMutation.isPending;
  const apiError = createMutation.error instanceof Error ? createMutation.error.message : null;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={() => { if (!isPending) onClose(); }}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-start justify-end">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-x-full" enterTo="opacity-100 translate-x-0" leave="ease-in duration-200" leaveFrom="opacity-100 translate-x-0" leaveTo="opacity-0 translate-x-full">
            <Dialog.Panel className="relative h-full w-full max-w-lg bg-gray-900 shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-gray-100">Assign Work</Dialog.Title>
                <button type="button" onClick={() => { if (!isPending) onClose(); }} disabled={isPending} className="text-gray-500 hover:text-gray-300 focus:outline-none disabled:opacity-50" aria-label="Close">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form id="assign-work-form" onSubmit={(e) => { void handleSubmit(e); }} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <label htmlFor="assign-employee" className="block text-sm font-medium text-gray-300 mb-1">Employee <span className="text-red-500">*</span></label>
                  <select id="assign-employee" value={form.employeeId} onChange={(e) => { setForm((prev) => ({ ...prev, employeeId: e.target.value })); }} className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-100 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a team member...</option>
                    {members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName} ({roleLabel(m.role)})</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="assign-title" className="block text-sm font-medium text-gray-300 mb-1">Title <span className="text-red-500">*</span></label>
                  <input id="assign-title" type="text" value={form.title} onChange={(e) => { setForm((prev) => ({ ...prev, title: e.target.value })); }} placeholder="What should they work on?" className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-100 bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="assign-chess-category" className="block text-sm font-medium text-gray-300 mb-1">CHESS Category</label>
                  <select id="assign-chess-category" value={form.chessCategoryId} onChange={(e) => { setForm((prev) => ({ ...prev, chessCategoryId: e.target.value as ChessCategoryType | '' })); }} className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-100 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a category...</option>
                    {CHESS_CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Task Bullets <span className="text-red-500">*</span></label>
                  <p className="text-xs text-gray-500 mb-2">Minimum 2, maximum 5 bullets</p>
                  <div className="space-y-2">
                    {form.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-4 text-right">{idx + 1}.</span>
                        <input type="text" value={bullet} onChange={(e) => { updateBullet(idx, e.target.value); }} placeholder={`Bullet ${idx + 1}`} className="flex-1 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-100 bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {form.bullets.length > 2 && <button type="button" onClick={() => { removeBullet(idx); }} className="text-gray-500 hover:text-red-400 text-xs" aria-label={`Remove bullet ${idx + 1}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                      </div>
                    ))}
                  </div>
                  {form.bullets.length < 5 && <button type="button" onClick={addBullet} className="mt-2 text-xs text-blue-400 hover:text-blue-300">+ Add bullet</button>}
                </div>
                {formError && <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-3"><p className="text-sm text-red-300">{formError}</p></div>}
                {apiError && <div className="rounded-md bg-red-900/30 border border-red-800 px-4 py-3"><p className="text-sm text-red-300">{apiError}</p></div>}
              </form>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
                <button type="button" onClick={() => { if (!isPending) onClose(); }} disabled={isPending} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50">Cancel</button>
                <button type="submit" form="assign-work-form" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Assign Commitment
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyTeamPage() {
  const { role, userId } = useAuth();
  const { data: cycle } = useCurrentCycle();
  const activeCycleId = cycle?.id ?? '';

  const { data: dashboard, isLoading: dashLoading, isError: dashError, error: dashErr } = useDashboard();
  const { data: commitments, isLoading: commitmentsLoading } = useCommitments(activeCycleId);

  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [assignFormState, setAssignFormState] = useState<AssignmentFormState>(createEmptyFormState);

  // Role guard
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-400 max-w-sm">My Team is only accessible to managers and above.</p>
      </div>
    );
  }

  if (dashLoading || commitmentsLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" label="Loading team view..." /></div>;
  }

  if (dashError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-100">Failed to load team data</h1>
        <p className="text-sm text-gray-400 max-w-sm">{dashErr instanceof Error ? dashErr.message : 'An unexpected error occurred.'}</p>
        <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors" onClick={() => { window.location.reload(); }}>Retry</button>
      </div>
    );
  }

  const { teamRollup, assignmentAttribution, rcdoCoverage } = dashboard;
  const members = teamRollup?.members ?? [];
  const allCommitments = commitments ?? [];
  const carriedCount = allCommitments.filter((c) => c.carriedFromCommitmentId != null).length;

  const commitmentsByUser: Record<string, Commitment[]> = {};
  for (const c of allCommitments) {
    if (!commitmentsByUser[c.userId]) commitmentsByUser[c.userId] = [];
    commitmentsByUser[c.userId]!.push(c);
  }

  const sortedMembers = [...members].sort((a, b) => {
    const aWarn = lastWeekSummary(commitmentsByUser[a.userId] ?? []).hasWarning;
    const bWarn = lastWeekSummary(commitmentsByUser[b.userId] ?? []).hasWarning;
    if (aWarn !== bWarn) return aWarn ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const uncoveredObjectives = rcdoCoverage?.uncoveredObjectives ?? [];

  function openAssignFromGap(gap: CoverageGapItem) {
    setAssignFormState({ ...createEmptyFormState(), rallyCryTitle: gap.rallyCryTitle, definingObjectiveId: gap.definingObjectiveId });
    setAssignFormOpen(true);
  }
  function openAssignFromPerson(member: TeamMemberSummary) {
    setAssignFormState({ ...createEmptyFormState(), employeeId: member.userId });
    setAssignFormOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">My Team</h1>
          <p className="mt-1 text-sm text-gray-500">Review your team&rsquo;s commitments, coverage, and alignment.</p>
        </div>

        <TeamOverview memberCount={members.length} totalCommitments={allCommitments.length} linkedPercentage={rcdoCoverage?.linkedPercentage ?? 0} carriedCount={carriedCount} />

        {/* Person Cards */}
        <div>
          <h2 className="text-base font-semibold text-gray-300 mb-3">Team Members</h2>
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <PersonCard key={member.userId} member={member} commitments={commitmentsByUser[member.userId] ?? []} onAssign={openAssignFromPerson} />
            ))}
            {sortedMembers.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No team members found.</p>}
          </div>
        </div>

        <CoverageGaps gaps={uncoveredObjectives} onAssignWork={openAssignFromGap} />

        {assignmentAttribution && <AssignmentPatterns attribution={assignmentAttribution} />}

        {/* Team Analytics — collapsible */}
        <TeamAnalytics dashboard={dashboard} cycleId={activeCycleId} />
      </div>

      <AssignWorkForm open={assignFormOpen} onClose={() => { setAssignFormOpen(false); }} members={members} initialState={assignFormState} cycleId={activeCycleId} managerId={userId} />
    </div>
  );
}
