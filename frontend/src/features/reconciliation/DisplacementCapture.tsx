import type { DisplacementCategory } from '@/types/observatory.types';
import type { Commitment } from '@/types/commitment.types';

const MAX_DETAIL_CHARS = 500;

const CATEGORY_LABELS: Record<DisplacementCategory, string> = {
  MANAGER_REASSIGNED: 'Manager reassigned me to other work',
  PRODUCTION_EMERGENCY: 'Production emergency',
  RESOURCE_BLOCKED: 'Blocked on resources',
  SCOPE_CHANGE: 'Scope changed',
  DEPRIORITIZED: 'Deprioritized',
  EXTERNAL_DEPENDENCY: 'External dependency',
  OTHER: 'Other',
};

const DISPLACEMENT_CATEGORIES: DisplacementCategory[] = [
  'MANAGER_REASSIGNED',
  'PRODUCTION_EMERGENCY',
  'RESOURCE_BLOCKED',
  'SCOPE_CHANGE',
  'DEPRIORITIZED',
  'EXTERNAL_DEPENDENCY',
  'OTHER',
];

export interface DisplacementValue {
  category: DisplacementCategory | null;
  detail: string;
  displacingCommitmentId: string | null;
}

interface DisplacementCaptureProps {
  value: DisplacementValue;
  onChange: (v: DisplacementValue) => void;
  cycleCommitments: Commitment[];
  currentCommitmentCreatedAt: string;
  disabled: boolean;
}

export function DisplacementCapture({
  value,
  onChange,
  cycleCommitments,
  currentCommitmentCreatedAt,
  disabled,
}: DisplacementCaptureProps) {
  const remaining = MAX_DETAIL_CHARS - value.detail.length;
  const isOverLimit = remaining < 0;

  // Filter to commitments created after current or marked unplanned, sorted newest first
  const candidateCommitments = cycleCommitments
    .filter(
      (c) =>
        c.isUnplanned || c.createdAt > currentCommitmentCreatedAt
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const selectClass = [
    'w-full rounded border px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    disabled
      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500 dark:text-gray-400'
      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600',
  ].join(' ');

  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Displacement Details
      </p>

      {/* What displaced this? */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          What displaced this?
        </label>
        <select
          value={value.category ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              category: (e.target.value as DisplacementCategory) || null,
            })
          }
          disabled={disabled}
          className={selectClass}
        >
          <option value="">— Select a reason —</option>
          {DISPLACEMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Which commitment took its place? */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Which commitment took its place?{' '}
          <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
        </label>
        <select
          value={value.displacingCommitmentId ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              displacingCommitmentId: e.target.value || null,
            })
          }
          disabled={disabled}
          className={selectClass}
        >
          <option value="">— None selected —</option>
          {candidateCommitments.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title.length > 60 ? c.title.slice(0, 60) + '…' : c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Details{' '}
          <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
        </label>
        <textarea
          value={value.detail}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
          disabled={disabled}
          maxLength={MAX_DETAIL_CHARS}
          rows={2}
          placeholder="Any additional context about what happened…"
          className={[
            'w-full rounded border px-3 py-2 text-sm resize-y',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500 dark:text-gray-400'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600',
            isOverLimit ? 'border-red-400 dark:border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
        <p
          className={[
            'text-xs text-right',
            isOverLimit
              ? 'text-red-500 dark:text-red-400 font-medium'
              : 'text-gray-500 dark:text-gray-400',
          ].join(' ')}
        >
          {remaining} characters remaining
        </p>
      </div>
    </div>
  );
}
