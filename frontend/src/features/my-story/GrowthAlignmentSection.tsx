import type { GrowthAreaAlignmentDetail } from '@/types/ic-insights.types';

interface GrowthAlignmentSectionProps {
  overallAlignmentPct: number;
  details: GrowthAreaAlignmentDetail[];
  totalCommitments: number;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: 'Completed', className: 'bg-success/10 text-success' },
  PARTIALLY_COMPLETED: { label: 'Partial', className: 'bg-warning/10 text-warning' },
  NOT_STARTED: { label: 'Not Started', className: 'bg-error/10 text-error' },
  CARRIED_FORWARD: { label: 'Carried Forward', className: 'bg-surface-container text-muted' },
};

function ReconStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.6875rem] font-medium leading-none ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function GrowthAlignmentSection({
  overallAlignmentPct,
  details,
  totalCommitments,
}: GrowthAlignmentSectionProps) {
  const alignmentPctRounded = Math.round(overallAlignmentPct);

  return (
    <section
      className="animate-fade-up"
      style={{ animationDelay: '100ms' }}
      aria-label="Growth alignment details"
    >
      {/* Section header */}
      <div className="mb-4">
        <h2 className="font-serif text-title text-on-surface font-normal">
          How Your Work Aligns
        </h2>
        <p className="text-small text-muted mt-0.5">
          Tasks linked to your defined growth areas, across all cycles
        </p>
      </div>

      {/* Overall alignment stat */}
      <div className="bg-surface-lowest rounded-sm shadow-whisper p-5 mb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[2.5rem] leading-none text-accent font-normal tabular-nums">
            {alignmentPctRounded}%
          </span>
        </div>
        <p className="text-body text-on-surface-variant mt-1">
          of your work connected to growth areas
        </p>
        {/* Overall alignment bar */}
        <div className="mt-3 h-2 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700"
            style={{ width: `${Math.min(alignmentPctRounded, 100)}%` }}
            aria-label={`${alignmentPctRounded}% overall alignment`}
          />
        </div>
      </div>

      {/* Per growth area cards */}
      {details.length === 0 ? (
        <p className="text-body text-muted text-center py-6">
          No growth areas defined yet. Add some above to start tracking alignment.
        </p>
      ) : (
        <div className="flex flex-col gap-3" role="list">
          {details.map((detail, i) => {
            const barPct =
              totalCommitments > 0
                ? Math.min(
                    Math.round((detail.alignedCommitmentCount / totalCommitments) * 100),
                    100,
                  )
                : 0;

            return (
              <div
                key={detail.growthAreaId}
                role="listitem"
                className="bg-surface-lowest rounded-sm shadow-whisper p-4 animate-fade-up"
                style={{ animationDelay: `${(i + 2) * 50}ms` }}
              >
                {/* Card header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-body text-on-surface font-medium truncate min-w-0">
                    {detail.label}
                  </span>
                  {!detail.isActive && (
                    <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium leading-none bg-surface-container text-muted">
                      past
                    </span>
                  )}
                </div>

                {/* Stat line */}
                <p className="text-small text-muted mb-2">
                  {detail.alignedCommitmentCount === 0 ? (
                    'No tasks linked yet'
                  ) : (
                    <>
                      <span className="text-on-surface font-medium tabular-nums">
                        {detail.alignedCommitmentCount}
                      </span>{' '}
                      task{detail.alignedCommitmentCount !== 1 ? 's' : ''}&nbsp;·&nbsp;
                      <span className="text-accent font-medium tabular-nums">
                        {detail.completedCount}
                      </span>{' '}
                      completed
                    </>
                  )}
                </p>

                {/* Alignment bar */}
                {detail.alignedCommitmentCount > 0 && (
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                      aria-label={`${barPct}% of all commitments`}
                    />
                  </div>
                )}

                {/* Top 3 tasks */}
                {detail.topTasks.length > 0 && (
                  <ul className="flex flex-col gap-1.5" aria-label="Top linked tasks">
                    {detail.topTasks.map((task) => (
                      <li
                        key={task.commitmentId}
                        className="flex items-start gap-2 min-w-0"
                      >
                        <span className="flex-shrink-0 text-[0.6875rem] text-muted tabular-nums mt-0.5 leading-tight">
                          {task.cycleLabel}
                        </span>
                        <span className="flex-1 text-small text-on-surface-variant truncate leading-tight">
                          {task.title}
                        </span>
                        <span className="flex-shrink-0">
                          <ReconStatusBadge status={task.reconciliationStatus} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
