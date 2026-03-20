import type { RcdoCoverageResponse } from '@/types/dashboard.types';

interface CoverageStripProps {
  coverage: RcdoCoverageResponse | undefined;
}

export function CoverageStrip({ coverage }: CoverageStripProps) {
  if (!coverage) return null;

  const unlinkedCount = coverage.unlinkedCount;

  if (unlinkedCount === 0) {
    return (
      <div className="bg-surface-lowest rounded-sm p-4">
        <div className="text-body font-medium text-on-surface mb-1">Your Coverage</div>
        <p className="text-[0.8125rem] text-on-surface-variant">
          All commitments are linked to a rally cry.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-lowest rounded-sm p-4">
      <div className="text-body font-medium text-on-surface mb-2">Your Coverage</div>
      <div className="flex items-start gap-2 p-2.5 bg-surface-container-low rounded-sm mb-2">
        <svg
          className="flex-shrink-0 w-4 h-4 text-warning mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div className="text-[0.8125rem] text-on-surface-variant">
          You have <strong className="font-medium text-on-surface">{unlinkedCount} unlinked commitment{unlinkedCount !== 1 ? 's' : ''}</strong>
        </div>
      </div>
      <p className="text-small text-muted leading-relaxed">
        Link to a rally cry if this work relates to one.
      </p>
    </div>
  );
}
