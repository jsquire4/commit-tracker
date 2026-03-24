import type { GrowthAreaProgress } from '@/types/ic-insights.types';

interface GrowthAreaProgressChartProps {
  progress: GrowthAreaProgress[];
}

export function GrowthAreaProgressChart({ progress }: GrowthAreaProgressChartProps) {
  if (progress.length === 0) return null;

  const maxCount = Math.max(...progress.map((p) => p.totalCommitments), 1);

  return (
    <section
      className="bg-surface-lowest rounded-sm p-5 animate-fade-up"
      style={{ animationDelay: '80ms' }}
      aria-label="Growth area progress"
    >
      <div className="mb-4">
        <h2 className="font-serif text-[1.0625rem] text-on-surface font-normal">
          Where you've been growing
        </h2>
        <p className="text-small text-muted mt-0.5">
          Each bar shows how often your work touched this area
        </p>
      </div>

      <div className="flex flex-col gap-3" role="list">
        {progress.map((area, i) => {
          const pct = Math.round((area.totalCommitments / maxCount) * 100);
          const completionPct =
            area.totalCommitments > 0
              ? Math.round((area.completedCommitments / area.totalCommitments) * 100)
              : 0;

          return (
            <div
              key={area.growthAreaId}
              role="listitem"
              className="animate-fade-up"
              style={{ animationDelay: `${(i + 2) * 40}ms` }}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-body text-on-surface font-medium truncate min-w-0">
                  {area.label}
                </span>
                <span className="text-small text-muted whitespace-nowrap flex-shrink-0 tabular-nums">
                  {area.totalCommitments} commitment{area.totalCommitments !== 1 ? 's' : ''}
                  {area.totalCommitments > 0 && (
                    <span className="text-accent ml-1.5">· {completionPct}% done</span>
                  )}
                </span>
              </div>

              {/* Bar track */}
              <div className="relative h-2 bg-surface-container rounded-full overflow-hidden">
                {/* Total bar (accent/20 background) */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background:
                      'linear-gradient(90deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 60%, transparent) 100%)',
                  }}
                  aria-label={`${area.totalCommitments} total commitments`}
                />
              </div>

              {/* Weekly mini-breakdown */}
              {area.weeklyBreakdown.length > 1 && (
                <div
                  className="flex items-end gap-0.5 mt-2 h-6"
                  aria-label="Weekly breakdown"
                  title="Commitments per week"
                >
                  {area.weeklyBreakdown.map((week) => {
                    const weekMax = Math.max(
                      ...area.weeklyBreakdown.map((w) => w.count),
                      1,
                    );
                    const heightPct = Math.max((week.count / weekMax) * 100, 4);
                    return (
                      <div
                        key={week.cycleLabel}
                        className="flex-1 rounded-[2px]"
                        style={{
                          height: `${heightPct}%`,
                          background:
                            week.count > 0
                              ? 'var(--color-accent)'
                              : 'var(--color-surface-container)',
                          opacity: week.count > 0 ? 0.45 : 0.3,
                        }}
                        title={`${week.cycleLabel}: ${week.count}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
