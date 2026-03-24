import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/Button';
import { useIcWeekSummary } from '@/hooks/useIcInsights';
import { useCountUp, useFadeUp } from '@/hooks/useMotion';

interface WeekCloseSummaryScreenProps {
  cycleId: string;
  onDone: () => void;
}

function CheckmarkIcon() {
  return (
    <svg
      className="w-16 h-16 text-accent"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2.5" strokeDasharray="188.5" strokeDashoffset="188.5"
        style={{
          animation: 'checkCircleDraw 0.6s var(--ease-entrance) 0.1s forwards',
        }}
      />
      <path
        d="M20 33l9 9 15-17"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="36"
        strokeDashoffset="36"
        style={{
          animation: 'checkPathDraw 0.4s var(--ease-entrance) 0.55s forwards',
        }}
      />
    </svg>
  );
}

export function WeekCloseSummaryScreen({ cycleId, onDone }: WeekCloseSummaryScreenProps) {
  const { data: summary, isLoading } = useIcWeekSummary(cycleId);
  const cardRef = useRef<HTMLDivElement>(null);
  useFadeUp(cardRef);

  const completedCount = useCountUp(summary?.completed ?? 0, 500);
  const totalPlanned = summary?.totalPlanned ?? 0;
  const carriedForward = summary?.carriedForward ?? 0;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-close-summary-heading"
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm"
      >
        <div
          ref={cardRef}
          className="reveal w-full max-w-lg mx-4 bg-surface-lowest rounded-sm shadow-xl border border-outline-variant flex flex-col gap-6 p-8"
        >
          {/* Checkmark */}
          <div className="flex justify-center">
            <CheckmarkIcon />
          </div>

          {/* Header */}
          <div className="text-center flex flex-col gap-1">
            <h2 id="week-close-summary-heading" className="font-serif text-3xl tracking-tight text-on-surface font-normal">
              Week Closed
            </h2>
            {!isLoading && summary && (
              <p className="text-body text-on-surface-variant tabular-nums">
                <span className="font-semibold text-on-surface">{completedCount}</span>
                {' '}completed
                {totalPlanned > 0 && (
                  <> · <span className="font-semibold text-on-surface">{totalPlanned}</span> planned</>
                )}
                {carriedForward > 0 && (
                  <> · <span className="font-semibold text-on-surface">{carriedForward}</span> carried forward</>
                )}
              </p>
            )}
          </div>

          {/* LLM narrative */}
          {!isLoading && (
            <div className="border-l-4 border-accent/40 pl-4 py-1">
              {summary?.narrativeSummary ? (
                <p className="text-body text-on-surface-variant leading-relaxed italic">
                  "{summary.narrativeSummary}"
                </p>
              ) : (
                <p className="text-body text-on-surface-variant">
                  Your week has been recorded.
                </p>
              )}
            </div>
          )}

          {/* Growth area hits */}
          {summary && summary.growthAreaHits.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-on-surface-variant">
                Growth areas advanced this week:
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.growthAreaHits.map((hit) => (
                  <span
                    key={hit.growthAreaId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-small font-medium"
                  >
                    {hit.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to="/my-story"
              className="inline-flex items-center justify-center gap-2 text-body font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-sm"
            >
              View My Story
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={onDone}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
