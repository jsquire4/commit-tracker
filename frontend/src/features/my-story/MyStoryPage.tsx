import { useState } from 'react';
import { useMyStory } from '@/hooks/useIcInsights';
import { useGrowthAreas } from '@/hooks/useGrowthAreas';
import { GrowthAreaManager } from '@/features/growth-areas/GrowthAreaManager';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { GrowthAreaProgressChart } from './GrowthAreaProgressChart';
import { PatternInsightsPanel } from './PatternInsightsPanel';
import { ResumeBullets } from './ResumeBullets';
import { MyStoryEmptyState } from './MyStoryEmptyState';

const WEEK_OPTIONS = [8, 12, 26] as const;
type WeekOption = (typeof WEEK_OPTIONS)[number];

function MyStorySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-surface-container shimmer rounded-sm" />
        <div className="h-8 w-28 bg-surface-container shimmer rounded-sm" />
      </div>
      {/* Growth area manager skeleton */}
      <div className="h-20 bg-surface-container shimmer rounded-sm" />
      {/* Narrative card skeleton */}
      <SkeletonLoader variant="card" count={1} />
      {/* Progress chart skeleton */}
      <div className="bg-surface-lowest rounded-sm p-5">
        <div className="h-5 w-48 bg-surface-container shimmer rounded-sm mb-4" />
        <div className="flex flex-col gap-4">
          {[75, 55, 40, 30].map((w) => (
            <div key={w} className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <div className="h-4 bg-surface-container shimmer rounded-sm" style={{ width: `${w * 0.6}%` }} />
                <div className="h-4 w-20 bg-surface-container shimmer rounded-sm" />
              </div>
              <div className="h-2 bg-surface-container shimmer rounded-full" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLoader key={i} variant="metric" />
        ))}
      </div>
    </div>
  );
}

export function MyStoryPage() {
  const [weeks, setWeeks] = useState<WeekOption>(12);
  const { data: story, isLoading: storyLoading, error: storyError } = useMyStory(weeks);
  const { data: growthAreas = [], isLoading: growthAreasLoading } = useGrowthAreas();

  const isLoading = storyLoading || growthAreasLoading;
  const hasGrowthAreas = growthAreas.some((a) => a.isActive);
  const hasHistory =
    story !== undefined &&
    (story.growthAreaProgress.length > 0 ||
      story.recentWeeks.length > 0 ||
      story.patternStats.totalCommitments > 0);

  const showEmpty = !isLoading && !hasHistory;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap animate-fade-up">
        <div>
          <h1 className="font-serif text-display text-on-surface font-normal leading-tight">
            My Story
          </h1>
          <p className="text-body text-on-surface-variant mt-1">
            Built from every week you've logged
          </p>
        </div>

        {/* Week range selector */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="week-range"
            className="text-small text-on-surface-variant whitespace-nowrap"
          >
            Show last
          </label>
          <select
            id="week-range"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value) as WeekOption)}
            className="appearance-none bg-surface-lowest border border-outline-variant/50 text-body text-on-surface rounded-sm px-3 py-1.5 pr-7 focus:outline-none focus:border-accent transition-colors cursor-pointer"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235A605E' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1rem',
            }}
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} weeks
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Growth Areas — always visible, prominent ── */}
      <section className="animate-fade-up" style={{ animationDelay: '40ms' }}>
        <div className="bg-surface-lowest rounded-sm p-5 shadow-whisper">
          <h2 className="font-serif text-title text-on-surface mb-1">
            My Growth Areas
          </h2>
          <p className="text-small text-muted mb-4">
            {hasGrowthAreas
              ? 'These guide how your work connects to your development. Update anytime.'
              : 'Define up to 5 directions you want to grow in — your work will be tracked against them.'}
          </p>
          <GrowthAreaManager />
        </div>
      </section>

      {/* ── Loading State ── */}
      {isLoading && <MyStorySkeleton />}

      {/* ── Error State ── */}
      {!isLoading && storyError && (
        <div
          className="rounded-sm bg-error/10 border border-error/30 p-5 text-body text-error animate-fade-up"
          role="alert"
        >
          Could not load your story data. Please try refreshing the page.
        </div>
      )}

      {/* ── Empty State ── */}
      {showEmpty && !storyError && (
        <MyStoryEmptyState hasGrowthAreas={hasGrowthAreas} />
      )}

      {/* ── Content ── */}
      {!isLoading && !storyError && !showEmpty && story && (
        <>
          {/* LLM Narrative Card */}
          {story.narrativeInsight && (
            <section
              className="bg-surface-lowest rounded-sm p-5 border-l-2 border-l-accent shadow-whisper animate-fade-up"
              style={{ animationDelay: '80ms' }}
              aria-label="AI narrative insight"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-accent"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label text-accent uppercase tracking-[0.05rem] font-medium mb-2">
                    Narrative Insight
                  </p>
                  <p className="text-body text-on-surface leading-relaxed">
                    {story.narrativeInsight}
                  </p>
                  <p className="text-xs text-muted mt-3 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                    Generated by AI based on your last {weeks} weeks
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Growth Area Progress Chart */}
          <GrowthAreaProgressChart progress={story.growthAreaProgress} />

          {/* Pattern Insights Panel */}
          {story.patternStats.totalCommitments > 0 && (
            <PatternInsightsPanel
              stats={story.patternStats}
              weekCount={weeks}
            />
          )}

          {/* Resume Bullets */}
          <ResumeBullets
            bullets={story.resumeBullets}
            narrativeInsight={story.narrativeInsight}
          />
        </>
      )}
    </div>
  );
}
