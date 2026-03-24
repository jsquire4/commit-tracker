import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useCreateCommitment } from '@/hooks/useCommitments';
import { useChessCategories } from '@/hooks/useChessCategories';
import Button from '@/components/Button';
import Input from '@/components/Input';
import type { TeamMemberSummary, CompletionHorizon, CompletionDay, CompletionTimeBlock } from '@/types';

const DAYS: { value: CompletionDay; label: string }[] = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
];

const TIME_BLOCKS: { value: CompletionTimeBlock; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'MIDDAY', label: 'Midday' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EOD', label: 'EOD' },
];

export interface BulletEntry {
  id: string;
  text: string;
}

export interface AssignmentFormState {
  employeeId: string;
  title: string;
  rallyCryId: string;
  rallyCryTitle: string;
  definingObjectiveId: string;
  chessCategoryId: string;
  completionDay: CompletionDay | '';
  completionTimeBlock: CompletionTimeBlock | '';
  bullets: BulletEntry[];
  notes: string;
}

export function createEmptyFormState(): AssignmentFormState {
  return {
    employeeId: '', title: '', rallyCryId: '', rallyCryTitle: '',
    definingObjectiveId: '', chessCategoryId: '', completionDay: '',
    completionTimeBlock: '', bullets: [
      { id: crypto.randomUUID(), text: '' },
      { id: crypto.randomUUID(), text: '' },
    ], notes: '',
  };
}

/** Derive CompletionHorizon from day + time block selections */
function deriveCompletionHorizon(day: CompletionDay | '', timeBlock: CompletionTimeBlock | ''): CompletionHorizon {
  if (day && timeBlock) {
    // Specific day + time block is the most precise — map to a named horizon if EOW, else EOD
    if (day === 'FRIDAY' && timeBlock === 'EOD') return 'EOW' as CompletionHorizon;
    return 'EOD' as CompletionHorizon;
  }
  if (day === 'FRIDAY' || (!day && !timeBlock)) return 'EOW' as CompletionHorizon;
  return 'EOD' as CompletionHorizon;
}

interface AssignWorkFormProps {
  open: boolean;
  onClose: () => void;
  members: TeamMemberSummary[];
  initialState: AssignmentFormState;
  cycleId: string;
  managerId: string;
}

export function AssignWorkForm({ open, onClose, members, initialState, cycleId, managerId }: AssignWorkFormProps) {
  const [form, setForm] = useState<AssignmentFormState>(initialState);
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateCommitment(cycleId);
  const { data: chessCategories = [] } = useChessCategories();

  useEffect(() => {
    if (open) {
      setForm(initialState);
      setFormError(null);
      createMutation.reset();
    }
  }, [open, initialState]);

  function updateBullet(index: number, value: string) {
    setForm((prev) => {
      const next = prev.bullets.map((b, i) => i === index ? { ...b, text: value } : b);
      return { ...prev, bullets: next };
    });
  }
  function addBullet() {
    if (form.bullets.length < 5) {
      setForm((prev) => ({ ...prev, bullets: [...prev.bullets, { id: crypto.randomUUID(), text: '' }] }));
    }
  }
  function removeBullet(index: number) {
    if (form.bullets.length > 2) {
      setForm((prev) => ({ ...prev, bullets: prev.bullets.filter((_, i) => i !== index) }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employeeId) { setFormError('Please select a team member.'); return; }
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    const nonEmptyBullets = form.bullets.map((b) => b.text).filter((t) => t.trim().length > 0);
    if (nonEmptyBullets.length < 2) { setFormError('At least 2 task bullets are required.'); return; }
    const completionHorizon = deriveCompletionHorizon(form.completionDay, form.completionTimeBlock);
    try {
      await createMutation.mutateAsync({
        cycleId, title: form.title.trim(), bullets: nonEmptyBullets,
        completionHorizon, assignedBy: managerId,
        forUserId: form.employeeId,
        ...(form.chessCategoryId ? { chessCategoryId: form.chessCategoryId } : {}),
        ...(form.completionDay ? { completionDay: form.completionDay as CompletionDay } : {}),
        ...(form.completionTimeBlock ? { completionTimeBlock: form.completionTimeBlock as CompletionTimeBlock } : {}),
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
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-[var(--ease-standard)] duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-[var(--ease-exit)] duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 flex items-start justify-end">
          <Transition.Child
            as={Fragment}
            enter="ease-[var(--ease-entrance)] duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-[var(--ease-exit)] duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="relative h-full w-full max-w-[440px] bg-surface-lowest shadow-whisper flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
                <Dialog.Title className="font-serif text-[1.25rem] text-on-surface">Assign Work</Dialog.Title>
                <button
                  type="button"
                  onClick={() => { if (!isPending) onClose(); }}
                  disabled={isPending}
                  className="text-muted hover:text-on-surface transition-colors duration-[var(--duration-fast)]"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <form onSubmit={(e) => { void handleSubmit(e); }} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                {/* Assign To */}
                <div className="flex flex-col gap-1">
                  <label className="text-label text-on-surface-variant uppercase tracking-[0.04rem] font-medium">
                    Assign to
                  </label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent transition-colors duration-[var(--duration-fast)] appearance-none cursor-pointer"
                  >
                    <option value="">Select a team member...</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <Input
                  label="Commitment Title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="What should they work on?"
                />

                {/* Task Bullets */}
                <div className="flex flex-col gap-1">
                  <label className="text-label text-on-surface-variant uppercase tracking-[0.04rem] font-medium">
                    Task Bullets
                  </label>
                  <div className="flex flex-col gap-2">
                    {form.bullets.map((bullet, idx) => (
                      <div key={bullet.id} className="flex items-center gap-2">
                        <span className="text-small text-muted w-4 text-right flex-shrink-0">{idx + 1}.</span>
                        <input
                          type="text"
                          value={bullet.text}
                          onChange={(e) => updateBullet(idx, e.target.value)}
                          placeholder={idx < 2 ? `Task ${idx + 1}` : 'Add another task...'}
                          className="flex-1 bg-transparent border-0 border-b border-b-outline-variant px-0 py-2 text-[0.8125rem] text-on-surface placeholder:text-muted focus:outline-none focus:border-b-accent transition-colors duration-[var(--duration-fast)]"
                        />
                        <svg className="w-4 h-4 text-muted cursor-grab flex-shrink-0 hover:text-on-surface transition-colors duration-[var(--duration-fast)]" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                        </svg>
                        {form.bullets.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeBullet(idx)}
                            className="text-muted hover:text-error text-xs"
                            aria-label={`Remove bullet ${idx + 1}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {form.bullets.length < 5 && (
                      <button
                        type="button"
                        onClick={addBullet}
                        className="text-label text-accent hover:text-accent-dark transition-colors duration-[var(--duration-fast)] text-left"
                      >
                        + Add bullet
                      </button>
                    )}
                  </div>
                </div>

                {/* CHESS Category 2x2 */}
                <div className="flex flex-col gap-1">
                  <label className="text-label text-on-surface-variant uppercase tracking-[0.04rem] font-medium">
                    CHESS Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {chessCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, chessCategoryId: prev.chessCategoryId === cat.id ? '' : cat.id }))}
                        className={[
                          'px-3 py-2 text-label font-medium rounded-sm border-[1.5px] text-center',
                          'transition-all duration-[var(--duration-fast)]',
                          form.chessCategoryId === cat.id
                            ? 'border-accent bg-accent/[0.06] text-accent'
                            : 'border-outline-variant text-on-surface-variant hover:border-accent hover:text-accent',
                        ].join(' ')}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day pills */}
                <div className="flex flex-col gap-1">
                  <label className="text-label text-on-surface-variant uppercase tracking-[0.04rem] font-medium">Day</label>
                  <div className="flex gap-1.5">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, completionDay: prev.completionDay === d.value ? '' : d.value }))}
                        className={[
                          'px-3 py-1.5 text-label font-medium rounded-full border-[1.5px]',
                          'transition-all duration-[var(--duration-fast)]',
                          form.completionDay === d.value
                            ? 'border-accent bg-accent text-white'
                            : 'border-outline-variant text-on-surface-variant hover:border-accent hover:text-accent',
                        ].join(' ')}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Block pills */}
                <div className="flex flex-col gap-1">
                  <label className="text-label text-on-surface-variant uppercase tracking-[0.04rem] font-medium">Time Block</label>
                  <div className="flex gap-1.5">
                    {TIME_BLOCKS.map((tb) => (
                      <button
                        key={tb.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, completionTimeBlock: prev.completionTimeBlock === tb.value ? '' : tb.value }))}
                        className={[
                          'px-3 py-1.5 text-label font-medium rounded-full border-[1.5px]',
                          'transition-all duration-[var(--duration-fast)]',
                          form.completionTimeBlock === tb.value
                            ? 'border-accent bg-accent text-white'
                            : 'border-outline-variant text-on-surface-variant hover:border-accent hover:text-accent',
                        ].join(' ')}
                      >
                        {tb.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <Input
                  label="Notes"
                  textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional context for the assignee..."
                  maxLength={500}
                />

                {/* Errors */}
                {formError && (
                  <div className="rounded-sm bg-error/10 border border-error/20 px-4 py-3">
                    <p className="text-body text-error">{formError}</p>
                  </div>
                )}
                {apiError && (
                  <div className="rounded-sm bg-error/10 border border-error/20 px-4 py-3">
                    <p className="text-body text-error">{apiError}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
                <Button
                  variant="secondary"
                  onClick={() => { if (!isPending) onClose(); }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={isPending}
                >
                  Assign
                </Button>
              </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
