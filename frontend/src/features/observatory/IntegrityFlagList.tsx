import { Badge } from '@/components/Badge';
import type { IntegrityFlag, IntegrityFlagType } from '@/types';

interface IntegrityFlagListProps {
  flags: IntegrityFlag[];
}

const flagDescriptions: Record<IntegrityFlagType, (details: Record<string, unknown>) => string> = {
  UNIFORM_CATEGORIZATION: (d) => {
    const category = typeof d['category'] === 'string' ? d['category'] : 'unknown';
    const count = typeof d['count'] === 'number' ? String(d['count']) : '?';
    return `All ${count} commitments categorized as ${category} — possible rubber-stamping`;
  },
  COMPLETION_MISMATCH: (d) => {
    const submitted = typeof d['submittedCount'] === 'number' ? String(d['submittedCount']) : '?';
    const reconciled = typeof d['reconciledCount'] === 'number' ? String(d['reconciledCount']) : '?';
    return `${submitted} commitments submitted but only ${reconciled} reconciled — data gap detected`;
  },
  DUPLICATE_NOTES: (d) => {
    const count = typeof d['count'] === 'number' ? String(d['count']) : '?';
    return `${count} commitments share identical notes — may indicate copy-paste reporting`;
  },
};

function getFlagDescription(flag: IntegrityFlag): string {
  const descFn = flagDescriptions[flag.type];
  if (descFn) {
    return descFn(flag.details);
  }
  return `Data integrity concern: ${flag.type}`;
}

const flagTypeLabel: Record<IntegrityFlagType, string> = {
  UNIFORM_CATEGORIZATION: 'Uniform Categorization',
  COMPLETION_MISMATCH: 'Completion Mismatch',
  DUPLICATE_NOTES: 'Duplicate Notes',
};

export function IntegrityFlagList({ flags }: IntegrityFlagListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Data Integrity Concerns
        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
          ({flags.length})
        </span>
      </h2>
      <div className="space-y-2">
        {flags.map((flag, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${flag.userId}-${flag.type}-${idx}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex items-start gap-3"
          >
            {/* Warning icon */}
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-yellow-500 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="gray">{flagTypeLabel[flag.type] ?? flag.type}</Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  User: {flag.userId}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getFlagDescription(flag)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
