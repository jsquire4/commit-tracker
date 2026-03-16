import { useState } from 'react';
import { useCreateUnplannedCommitment } from '@/hooks/useCommitments';
import { useQuery } from '@tanstack/react-query';
import { getRcdoTree } from '@/api/rcdo.api';
import { CommitmentStatusMarker } from './CommitmentStatusMarker';
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); }}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span aria-hidden="true">+</span>
        Add unplanned work
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-3">Add Unplanned Work</h3>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-4" noValidate>
        {/* Title */}
        <div className="flex flex-col gap-1">
          <label htmlFor="unplanned-title" className="text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="unplanned-title"
            type="text"
            value={form.title}
            onChange={(e) => { setForm((prev) => ({ ...prev, title: e.target.value })); }}
            placeholder="What did you work on?"
            maxLength={500}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bullets */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Bullet items <span className="text-red-500">*</span>{' '}
            <span className="text-gray-400 font-normal">(min 2, max 5)</span>
          </span>
          {form.bullets.map((bullet, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                value={bullet}
                onChange={(e) => { handleBulletChange(idx, e.target.value); }}
                placeholder={`Bullet ${String(idx + 1)}`}
                className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.bullets.length > 2 && (
                <button
                  type="button"
                  onClick={() => { removeBullet(idx); }}
                  aria-label={`Remove bullet ${String(idx + 1)}`}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {form.bullets.length < 5 && (
            <button
              type="button"
              onClick={addBullet}
              className="self-start text-xs text-blue-600 hover:underline mt-1"
            >
              + Add bullet
            </button>
          )}
        </div>

        {/* Completion Horizon */}
        <div className="flex flex-col gap-1">
          <label htmlFor="unplanned-horizon" className="text-sm font-medium text-gray-700">
            Completion Horizon
          </label>
          <select
            id="unplanned-horizon"
            value={form.completionHorizon}
            onChange={(e) =>
              { setForm((prev) => ({ ...prev, completionHorizon: e.target.value as CompletionHorizon })); }
            }
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {HORIZON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* RCDO Linking */}
        <div className="flex flex-col gap-1">
          <label htmlFor="unplanned-rcdo" className="text-sm font-medium text-gray-700">
            Rally Cry <span className="text-red-500">*</span>
          </label>
          <select
            id="unplanned-rcdo"
            value={form.rallyCryId}
            onChange={(e) => { setForm((prev) => ({ ...prev, rallyCryId: e.target.value })); }}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select Rally Cry —</option>
            {rcdoTree?.rallyCries.map((rc) => (
              <option key={rc.id} value={rc.id}>
                {rc.title}
              </option>
            ))}
          </select>
        </div>

        {/* Reconciliation Status */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Reconciliation Status <span className="text-red-500">*</span>
          </span>
          <CommitmentStatusMarker
            value={form.reconciliationStatus}
            onChange={(s) => { setForm((prev) => ({ ...prev, reconciliationStatus: s })); }}
          />
        </div>

        {/* Error */}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {createMutation.isPending ? 'Saving…' : 'Add Work'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
