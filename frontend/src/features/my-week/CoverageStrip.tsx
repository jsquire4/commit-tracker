import type { RcdoCoverageResponse } from '@/types/dashboard.types';

interface CoverageStripProps {
  coverage: RcdoCoverageResponse | undefined;
}

export function CoverageStrip({ coverage }: CoverageStripProps) {
  if (!coverage || coverage.byRallyCry.length === 0) return null;

  const totalLinked = coverage.linkedCount;
  const total = coverage.totalCommitments;
  const uncoveredCount = coverage.uncoveredObjectives.length;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Your team&rsquo;s rally cry coverage
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {Math.round(coverage.linkedPercentage)}% linked ({totalLinked} of {total})
        </span>
      </div>

      {/* Rally cry bars */}
      <div className="flex gap-2 flex-wrap">
        {coverage.byRallyCry.map((rc) => {
          const barWidth = total > 0 ? Math.round((rc.commitmentCount / total) * 100) : 0;
          return (
            <div key={rc.rallyCryId} className="flex-1 min-w-[120px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {rc.title}
                </span>
                <span className="text-[10px] text-gray-500 tabular-nums ml-1">
                  {rc.commitmentCount}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-blue-500"
                  style={{ width: `${Math.max(barWidth, rc.commitmentCount > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Uncovered objectives */}
      {uncoveredCount > 0 && (
        <div className="mt-3 flex items-start gap-2">
          <span className="text-amber-500 text-xs mt-0.5">&#9888;</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {uncoveredCount} uncovered objective{uncoveredCount !== 1 ? 's' : ''}:{' '}
            </span>
            {coverage.uncoveredObjectives.map((o) => o.title).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
