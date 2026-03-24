import type { PatternStats } from '@/types/ic-insights.types';
import { CHESS_ACCENT, CHESS_NAME_TO_KEY } from '@/constants/chess-colors';

interface PatternInsightsPanelProps {
  stats: PatternStats;
  weekCount: number;
}

/** Maps display names from the API to accent colors — uses shared CHESS_ACCENT constants */
function getChessColor(displayName: string): string {
  const key = CHESS_NAME_TO_KEY[displayName];
  if (!key || !(key in CHESS_ACCENT)) return 'var(--color-muted)';
  return CHESS_ACCENT[key as keyof typeof CHESS_ACCENT];
}

function StatCard({
  label,
  value,
  subtitle,
  accent,
  delay,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div
      className="bg-surface-lowest rounded-sm p-4 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-1">
        {label}
      </p>
      <p
        className={`text-[1.75rem] font-semibold tabular-nums leading-none ${
          accent ? 'text-accent' : 'text-on-surface'
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-small text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function PatternInsightsPanel({ stats, weekCount }: PatternInsightsPanelProps) {
  const categoryEntries = Object.entries(stats.categoryDistribution).filter(
    ([, count]) => count > 0,
  );
  const totalCategorized = categoryEntries.reduce((s, [, c]) => s + c, 0);

  return (
    <section
      className="flex flex-col gap-4 animate-fade-up"
      style={{ animationDelay: '120ms' }}
      aria-label="Work pattern insights"
    >
      <div>
        <h2 className="font-serif text-[1.0625rem] text-on-surface font-normal">
          Your Patterns
        </h2>
        <p className="text-small text-muted mt-0.5">
          Aggregated across {weekCount} week{weekCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Completion Rate"
          value={`${Math.round(stats.overallCompletionRate)}%`}
          subtitle={`across ${weekCount} week${weekCount !== 1 ? 's' : ''}`}
          accent
          delay={160}
        />
        <StatCard
          label="Carry-Forward"
          value={`${Math.round(stats.overallCarryForwardRate)}%`}
          subtitle="rolled to next week"
          delay={200}
        />
        <StatCard
          label="Pivots"
          value={stats.totalDisplacements}
          subtitle="times your plan changed"
          delay={240}
        />
        <StatCard
          label="Unplanned"
          value={stats.totalUnplanned}
          subtitle="emerged in-week"
          delay={280}
        />
        <StatCard
          label="Total Commitments"
          value={stats.totalCommitments}
          subtitle="planned across all weeks"
          delay={320}
        />
        <StatCard
          label="Completed"
          value={stats.totalCompleted}
          subtitle={`of ${stats.totalCommitments} planned`}
          delay={360}
        />
      </div>

      {/* CHESS category breakdown */}
      {categoryEntries.length > 0 && totalCategorized > 0 && (
        <div
          className="bg-surface-lowest rounded-sm p-4 animate-fade-up"
          style={{ animationDelay: '400ms' }}
        >
          <p className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-3">
            Work Mix
          </p>

          {/* Stacked bar */}
          <div
            className="flex h-3 rounded-full overflow-hidden gap-px"
            role="img"
            aria-label="CHESS category distribution"
          >
            {categoryEntries.map(([cat, count]) => {
              const pct = (count / totalCategorized) * 100;
              const color = getChessColor(cat);
              return (
                <div
                  key={cat}
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  title={`${cat}: ${count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {categoryEntries.map(([cat, count]) => {
              const color = getChessColor(cat);
              const pct = Math.round((count / totalCategorized) * 100);
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-small text-on-surface-variant">
                    {cat}
                    <span className="text-muted ml-1">
                      {count} · {pct}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
