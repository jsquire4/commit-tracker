import type { RcdoCoverageResponse } from '@/types';

interface RcdoCoverageGapsProps {
  coverage: RcdoCoverageResponse;
}

export function RcdoCoverageGaps({ coverage }: RcdoCoverageGapsProps) {
  const { uncoveredObjectives } = coverage;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-on-surface">RCDO Coverage Gaps</h2>

      {uncoveredObjectives.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
          <svg
            className="w-5 h-5 text-accent flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-accent">
            All objectives covered
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Uncovered defining objectives">
          {uncoveredObjectives.map((obj) => (
            <li
              key={obj.definingObjectiveId}
              className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4"
            >
              <svg
                className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium text-warning truncate">
                  {obj.title}
                </p>
                <p className="text-xs text-warning/70 truncate">
                  Under: {obj.rallyCryTitle}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
