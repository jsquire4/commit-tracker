import type { RcdoCoverageResponse } from '@/types';

interface RallyCryCoverageCardsProps {
  coverage: RcdoCoverageResponse;
}

export function RallyCryCoverageCards({ coverage }: RallyCryCoverageCardsProps) {
  const rallyCries = coverage.byRallyCry ?? [];
  const uncoveredTitles = new Set(
    (coverage.uncoveredObjectives ?? []).map((u) => u.rallyCryTitle),
  );

  if (rallyCries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2
        className="font-serif text-[1.25rem] text-on-surface animate-fade-up"
      >
        Rally Cry Coverage
      </h2>
      <div className="flex flex-col gap-3">
        {rallyCries.map((rc, idx) => {
          const isGap = rc.commitmentCount === 0 || uncoveredTitles.has(rc.title);
          return (
            <div
              key={rc.rallyCryId}
              className={[
                'bg-surface-lowest rounded-sm p-5 flex flex-col gap-1.5',
                'animate-fade-up transition-colors duration-[var(--duration-fast)] hover:bg-surface',
                isGap ? 'border-l-[3px] border-l-warning' : '',
              ].join(' ')}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <span className="text-[0.9375rem] font-medium text-on-surface">{rc.title}</span>
              <span
                className={[
                  'text-label',
                  rc.commitmentCount === 0 ? 'text-warning font-medium' : 'text-on-surface-variant',
                ].join(' ')}
              >
                {rc.commitmentCount === 0
                  ? '0 commitments'
                  : `${rc.commitmentCount} commitment${rc.commitmentCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
