/**
 * SpeechBubble — reusable AI summary popover for Observatory charts.
 *
 * Can be anchored to chart bars, heatmap cells, sparkline points, or any
 * other element by supplying pixel-space anchorX / anchorY coordinates
 * relative to the nearest `position: relative` container.
 */
import { useRef, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpeechBubbleMetric {
  label: string;
  value: string;
}

export interface SpeechBubbleProps {
  /** Horizontal position in px relative to the containing element */
  anchorX: number;
  /** Vertical position in px relative to the containing element */
  anchorY: number;
  /**
   * Whether the bubble renders above or below the anchor point.
   * @default 'above'
   */
  position?: 'above' | 'below';
  /** Week / period label shown in bold, e.g. "Mar 16, 2026" */
  weekLabel: string;
  /** AI-generated narrative text rendered in Newsreader serif */
  narrative: string;
  /** Optional key-metric tiles rendered in a row below the narrative */
  metrics?: SpeechBubbleMetric[];
  /** URL for the "View full week" link */
  linkUrl?: string;
  /** Link label text — defaults to "View full week →" */
  linkLabel?: string;
  /** Called when the user presses Escape or clicks outside the bubble */
  onDismiss: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpeechBubble({
  anchorX,
  anchorY,
  position = 'above',
  weekLabel,
  narrative,
  metrics,
  linkUrl,
  linkLabel = 'View full week →',
  onDismiss,
}: SpeechBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Dismiss on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  // Positioning: above anchor means the bubble bottom edge is near anchorY;
  // below anchor means the bubble top edge is near anchorY.
  const positionStyle: React.CSSProperties =
    position === 'above'
      ? {
          // `bottom` is expressed as distance from the container bottom.
          // We convert anchorY (distance from top) to distance from bottom via
          // `calc(100% - anchorY + gap)`.
          bottom: `calc(100% - ${anchorY}px + 12px)`,
          top: undefined,
        }
      : {
          top: anchorY + 12,
          bottom: undefined,
        };

  const animationName =
    position === 'above' ? 'speechBubbleFadeIn' : 'speechBubbleFadeInBelow';

  return (
    <div
      ref={bubbleRef}
      role="dialog"
      aria-label={`Week summary for ${weekLabel}`}
      style={{
        position: 'absolute',
        left: anchorX,
        ...positionStyle,
        transform: 'translateX(-50%)',
        width: 300,
        zIndex: 50,
        animation: `${animationName} 200ms ease-out`,
      }}
    >
      {/* Bubble body */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] px-3.5 py-3">
        {/* AI label */}
        <div className="flex items-center gap-[5px] mb-1.5">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-accent font-sans uppercase">
            ✦ AI Summary
          </span>
        </div>

        {/* Week label */}
        <p className="text-[13px] font-bold text-on-surface mb-1.5 font-sans">
          {weekLabel}
        </p>

        {/* Narrative */}
        <p
          className={`text-[13px] leading-[1.55] text-on-surface font-serif${
            (metrics && metrics.length > 0) || linkUrl ? ' mb-2.5' : ''
          }`}
        >
          {narrative}
        </p>

        {/* Metrics row */}
        {metrics && metrics.length > 0 && (
          <div
            className={`flex gap-2.5 pt-2 border-t border-outline-variant${
              linkUrl ? ' mb-2.5' : ''
            }`}
          >
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="flex-1 text-center py-1 px-0.5 bg-surface rounded"
              >
                <div className="text-sm font-bold text-on-surface font-sans">
                  {value}
                </div>
                <div className="text-[10px] text-on-surface-variant font-sans mt-px">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Optional link */}
        {linkUrl && (
          <a
            href={linkUrl}
            className="text-xs text-accent font-sans font-medium inline-flex items-center gap-[3px] hover:underline"
          >
            {linkLabel}
          </a>
        )}
      </div>

      {/* Caret — points toward the anchor (down for 'above', up for 'below') */}
      {position === 'above' ? (
        <>
          {/* White fill caret */}
          <div
            style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid #FFFFFF',
              filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.08))',
            }}
          />
          {/* Border layer caret (sits just behind the white caret) */}
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #E2E2E0',
              zIndex: -1,
            }}
          />
        </>
      ) : (
        <>
          {/* White fill caret pointing up */}
          <div
            style={{
              position: 'absolute',
              top: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: '7px solid #FFFFFF',
              filter: 'drop-shadow(0 -2px 1px rgba(0,0,0,0.08))',
            }}
          />
          {/* Border layer caret */}
          <div
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #E2E2E0',
              zIndex: -1,
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Narrative generator helper ────────────────────────────────────────────────

export interface WeekNarrativeData {
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  completionRate?: number | null;
  carryForwardRate?: number | null;
  weekLabel?: string;
}

/**
 * Generates a templated two-sentence AI narrative for a week's execution data.
 * Can be used by any Observatory component that displays CHESS-aligned metrics.
 *
 * @param data   Metrics for the week being described.
 * @param allData Optional array of all weeks in the dataset, used to detect
 *               relative highs/lows and week-over-week changes. When omitted,
 *               only absolute-value sentences are generated.
 */
export function generateWeekNarrative(
  data: WeekNarrativeData,
  allData?: WeekNarrativeData[],
): string {
  const { strategicPct, defensivePct, completionRate } = data;
  // TODO: Replace with real rally cry coverage when backend exposes per-cycle rallyCoveragePct
  const strategicAlignment = strategicPct;

  const sentences: string[] = [];

  if (allData && allData.length > 1) {
    const maxStrategic = Math.max(...allData.map((d) => d.strategicPct));
    const minStrategic = Math.min(...allData.map((d) => d.strategicPct));
    const isHighest = strategicPct === maxStrategic;
    const isLowest = strategicPct === minStrategic;

    // Find previous week for week-over-week comparison
    const idx = allData.indexOf(data);
    const prev = idx > 0 ? allData[idx - 1] : null;

    if (isHighest) {
      sentences.push(
        `This was the strongest strategic week in the period, with ${strategicPct.toFixed(0)}% of commitments in the Strategic category.`,
      );
    } else if (isLowest) {
      sentences.push(
        `Strategic work hit its lowest point at ${strategicPct.toFixed(0)}%, with operational and other work dominating the mix.`,
      );
    } else if (defensivePct > 15) {
      sentences.push(
        `Defensive work was elevated at ${defensivePct.toFixed(0)}% this week, pulling capacity away from strategic initiatives.`,
      );
    } else if (prev && strategicPct < prev.strategicPct - 5) {
      const drop = (prev.strategicPct - strategicPct).toFixed(0);
      sentences.push(
        `Strategic work declined ${drop} points from the prior week to ${strategicPct.toFixed(0)}%, suggesting a shift toward operational priorities.`,
      );
    } else if (prev && strategicPct > prev.strategicPct + 5) {
      const gain = (strategicPct - prev.strategicPct).toFixed(0);
      sentences.push(
        `Strategic work increased ${gain} points week-over-week to ${strategicPct.toFixed(0)}%, a positive shift in execution focus.`,
      );
    } else {
      sentences.push(
        `Strategic work made up ${strategicPct.toFixed(0)}% of commitments this week, with a balanced mix across operational and capability categories.`,
      );
    }
  } else {
    // Absolute-value fallback when no comparative dataset is available
    if (defensivePct > 15) {
      sentences.push(
        `Defensive work was elevated at ${defensivePct.toFixed(0)}% this week, pulling capacity away from strategic initiatives.`,
      );
    } else {
      sentences.push(
        `Strategic work made up ${strategicPct.toFixed(0)}% of commitments this week, with a balanced mix across operational and capability categories.`,
      );
    }
  }

  // Sentence 2 — completion + RC coverage
  if (completionRate != null) {
    const completionStr = completionRate.toFixed(0);
    const rcStr = strategicAlignment.toFixed(0);
    sentences.push(
      `Completion rate was ${completionStr}% and strategic alignment stood at ${rcStr}%.`,
    );
  } else {
    sentences.push(`Strategic alignment was at ${strategicAlignment.toFixed(0)}% for the week.`);
  }

  return sentences.join(' ');
}
