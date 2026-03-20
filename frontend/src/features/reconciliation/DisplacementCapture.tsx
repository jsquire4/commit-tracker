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

const selectClass = [
  'w-full bg-transparent border-0 border-b-[1.5px] border-b-outline-variant',
  'px-0 py-2 text-[13px] text-on-surface',
  'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
  'focus:outline-none focus:border-b-accent',
  'appearance-none cursor-pointer',
].join(' ');

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
      (c) => c.isUnplanned || c.createdAt > currentCommitmentCreatedAt,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-surface-container-low">
      <p className="text-[0.625rem] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">
        Displacement Category
      </p>

      {/* What displaced this? */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface-variant">
          What type of disruption?
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
          className={`${selectClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">&mdash; Select a reason &mdash;</option>
          {DISPLACEMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Which commitment took its place? */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface-variant">
          Which commitment took its place?{' '}
          <span className="font-normal text-muted">(optional)</span>
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
          className={`${selectClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">&mdash; None selected &mdash;</option>
          {candidateCommitments.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title.length > 60 ? c.title.slice(0, 60) + '\u2026' : c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface-variant">
          Details{' '}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          value={value.detail}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
          disabled={disabled}
          maxLength={MAX_DETAIL_CHARS}
          rows={2}
          placeholder="Any additional context about what happened\u2026"
          className={[
            'w-full bg-transparent border-0 border-b-[1.5px] px-0 py-2 text-[13px] text-on-surface resize-y',
            'placeholder:text-muted',
            'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
            'focus:outline-none',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            isOverLimit
              ? 'border-b-error focus:border-b-error'
              : 'border-b-outline-variant focus:border-b-accent',
          ].join(' ')}
        />
        <p
          className={[
            'text-[11px] text-right tabular-nums',
            isOverLimit ? 'text-error font-medium' : 'text-muted',
          ].join(' ')}
        >
          {remaining} characters remaining
        </p>
      </div>
    </div>
  );
}
