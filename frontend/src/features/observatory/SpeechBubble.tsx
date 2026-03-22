/**
 * SpeechBubble — reusable AI summary popover for Observatory charts.
 *
 * Can be anchored to chart bars, heatmap cells, sparkline points, or any
 * other element by supplying pixel-space anchorX / anchorY coordinates
 * relative to the nearest `position: relative` container.
 */
import { useRef, useEffect } from 'react';

// ── Teal brand colour used across Observatory AI labels / links ──────────────
const TEAL = '#036A6A';

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

// ── Keyframe injection ────────────────────────────────────────────────────────

function SpeechBubbleStyles() {
  return (
    <style>{`
      @keyframes speechBubbleFadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(4px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes speechBubbleFadeInBelow {
        from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `}</style>
  );
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
    <>
      <SpeechBubbleStyles />
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
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E2E0',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
            padding: '12px 14px',
          }}
        >
          {/* AI label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: TEAL,
                fontFamily: 'Inter, sans-serif',
                textTransform: 'uppercase',
              }}
            >
              ✦ AI Summary
            </span>
          </div>

          {/* Week label */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#1A1A1A',
              marginBottom: 6,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {weekLabel}
          </p>

          {/* Narrative */}
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: '#3D3D3B',
              marginBottom: metrics && metrics.length > 0 ? 10 : linkUrl ? 10 : 0,
              fontFamily: 'Newsreader, Georgia, serif',
            }}
          >
            {narrative}
          </p>

          {/* Metrics row */}
          {metrics && metrics.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: linkUrl ? 10 : 0,
                paddingTop: 8,
                borderTop: '1px solid #E2E2E0',
              }}
            >
              {metrics.map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '4px 2px',
                    backgroundColor: '#F8F8F7',
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#1A1A1A',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#5A605E',
                      fontFamily: 'Inter, sans-serif',
                      marginTop: 1,
                    }}
                  >
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
              style={{
                fontSize: 12,
                color: TEAL,
                textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
              }}
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
    </>
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
  const rcCoverage = strategicPct; // RC coverage proxied from strategic %

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
    const completionStr = (completionRate * 100).toFixed(0);
    const rcStr = rcCoverage.toFixed(0);
    sentences.push(
      `Completion rate was ${completionStr}% and rally cry coverage stood at ${rcStr}%.`,
    );
  } else {
    sentences.push(`Rally cry coverage was at ${rcCoverage.toFixed(0)}% for the week.`);
  }

  return sentences.join(' ');
}
