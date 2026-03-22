import { useState } from 'react';
import { useCreateUnplannedCommitment } from '@/hooks/useCommitments';
import { useQuery } from '@tanstack/react-query';
import { getRcdoTree } from '@/api/rcdo.api';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
import Button from '@/components/Button';
import type { ReconciliationStatus } from '@/types/enums';
import type { CompletionHorizon } from '@/types/enums';

interface UnplannedWorkEntryProps {
  cycleId: string;
  onAdd: () => void;
}

interface UnplannedFormState {
  title: string;
  bullets: string[];
  completionHorizon: CompletionHorizon;
  rallyCryId: string;
  reconciliationStatus: ReconciliationStatus | null;
}

const HORIZON_OPTIONS: { value: CompletionHorizon; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'MIDDAY', label: 'Midday' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EOD', label: 'End of Day' },
  { value: 'EOW', label: 'End of Week' },
];

const EMPTY_FORM: UnplannedFormState = {
  title: '',
  bullets: ['', ''],
  completionHorizon: 'EOW',
  rallyCryId: '',
  reconciliationStatus: null,
};

const selectClass = [
  'w-full bg-transparent border-0 border-b-[1.5px] border-b-outline-variant',
  'px-0 py-2 text-[13px] text-on-surface',
  'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
  'focus:outline-none focus:border-b-accent',
  'appearance-none cursor-pointer',
].join(' ');

const inputClass = [
  'w-full bg-transparent border-0 border-b-[1.5px] border-b-outline-variant',
  'px-0 py-2 text-[13px] text-on-surface placeholder:text-muted',
  'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
  'focus:outline-none focus:border-b-accent',
].join(' ');

export function UnplannedWorkEntry({ cycleId, onAdd }: UnplannedWorkEntryProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UnplannedFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateUnplannedCommitment(cycleId);

  const { data: rcdoTree } = useQuery({
    queryKey: ['rcdo', 'tree'],
    queryFn: getRcdoTree,
    staleTime: 60_000,
    enabled: open,
  });

  function handleBulletChange(idx: number, val: string) {
    setForm((prev) => {
      const next = [...prev.bullets];
      next[idx] = val;
      return { ...prev, bullets: next };
    });
  }

  function addBullet() {
    if (form.bullets.length >= 5) return;
    setForm((prev) => ({ ...prev, bullets: [...prev.bullets, ''] }));
  }

  function removeBullet(idx: number) {
    if (form.bullets.length <= 2) return;
    setForm((prev) => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    const filledBullets = form.bullets.filter((b) => b.trim().length > 0);
    if (filledBullets.length < 2) {
      setError('At least 2 bullet items are required.');
      return;
    }
    if (!form.reconciliationStatus) {
      setError('Reconciliation status is required for unplanned work.');
      return;
    }
    if (!form.rallyCryId) {
      setError('RCDO linking (Rally Cry) is required.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        cycleId,
        title: form.title.trim(),
        bullets: filledBullets,
        completionHorizon: form.completionHorizon,
        rallyCryId: form.rallyCryId,
      });
      setForm(EMPTY_FORM);
      setOpen(false);
      onAdd();
    } catch {
      setError('Failed to add unplanned work. Please try again.');
    }
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Prominent CTA Banner ── */}
      <div className="bg-surface-container-low border-l-4 border-l-accent rounded-sm px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-on-surface">
            Did anything unplanned come up this week?
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Capture unplanned work so it counts toward your effort.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setOpen(true);
            // Scroll form into view after state update
            setTimeout(() => {
              document.getElementById('unplanned-form')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          Add unplanned work
        </Button>
      </div>

      {/* ── Inline Add Form ── */}
      {open && (
        <div
          id="unplanned-form"
          className="bg-surface-lowest rounded-sm p-5 border-[1.5px] border-dashed border-accent/40"
        >
          <h3 className="text-sm font-semibold text-on-surface mb-4">Add Unplanned Work</h3>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="flex flex-col gap-4"
            noValidate
          >
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label htmlFor="unplanned-title" className="text-sm font-medium text-on-surface-variant">
                Title <span className="text-error">*</span>
              </label>
              <input
                id="unplanned-title"
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, title: e.target.value }));
                }}
                placeholder="What did you work on?"
                maxLength={500}
                className={inputClass}
              />
            </div>

            {/* Bullets */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-on-surface-variant">
                Bullet items <span className="text-error">*</span>{' '}
                <span className="text-muted font-normal">(min 2, max 5)</span>
              </span>
              <div className="flex flex-col gap-2">
                {form.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        handleBulletChange(idx, e.target.value);
                      }}
                      placeholder={`Bullet ${String(idx + 1)}`}
                      className={`${inputClass} flex-1`}
                    />
                    {form.bullets.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          removeBullet(idx);
                        }}
                        aria-label={`Remove bullet ${String(idx + 1)}`}
                        className="text-muted hover:text-error text-lg leading-none px-1 transition-colors duration-[150ms]"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {form.bullets.length < 5 && (
                <button
                  type="button"
                  onClick={addBullet}
                  className="self-start text-xs font-medium text-accent hover:underline mt-1"
                >
                  + Add bullet
                </button>
              )}
            </div>

            {/* Completion Horizon */}
            <div className="flex flex-col gap-1">
              <label htmlFor="unplanned-horizon" className="text-sm font-medium text-on-surface-variant">
                Completion Horizon
              </label>
              <select
                id="unplanned-horizon"
                value={form.completionHorizon}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    completionHorizon: e.target.value as CompletionHorizon,
                  }));
                }}
                className={selectClass}
              >
                {HORIZON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rally Cry */}
            <div className="flex flex-col gap-1">
              <label htmlFor="unplanned-rcdo" className="text-sm font-medium text-on-surface-variant">
                Rally Cry <span className="text-error">*</span>
              </label>
              <select
                id="unplanned-rcdo"
                value={form.rallyCryId}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, rallyCryId: e.target.value }));
                }}
                className={selectClass}
              >
                <option value="">&mdash; Select Rally Cry &mdash;</option>
                {rcdoTree?.rallyCries.map((rc) => (
                  <option key={rc.id} value={rc.id}>
                    {rc.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Reconciliation Status */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-on-surface-variant">
                What happened? <span className="text-error">*</span>
              </span>
              <CommitmentStatusMarker
                value={form.reconciliationStatus}
                onChange={(s) => {
                  setForm((prev) => ({ ...prev, reconciliationStatus: s }));
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isPending}
                loading={createMutation.isPending}
              >
                Add Work
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
