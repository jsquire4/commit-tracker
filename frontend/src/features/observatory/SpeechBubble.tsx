/**
 * SpeechBubble — reusable AI summary popover for Observatory charts.
 *
 * Can be anchored to chart bars, heatmap cells, sparkline points, or any
 * other element by supplying pixel-space anchorX / anchorY coordinates
 * relative to the nearest `position: relative` container.
 */
import { useRef, useEffect } from 'react';
export { generateWeekNarrative } from './narrativeUtils';
export type { WeekNarrativeData } from './narrativeUtils';

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

// ── Caret ─────────────────────────────────────────────────────────────────────

interface CaretProps {
  position: 'above' | 'below';
}

function Caret({ position }: CaretProps) {
  if (position === 'above') {
    return (
      <>
        {/* Surface fill caret */}
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
            borderTop: '7px solid var(--color-surface-lowest)',
            filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.08))',
          }}
        />
        {/* Border layer caret (sits just behind the fill caret) */}
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
            borderTop: '8px solid var(--color-outline-variant)',
            zIndex: -1,
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Surface fill caret pointing up */}
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
          borderBottom: '7px solid var(--color-surface-lowest)',
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
          borderBottom: '8px solid var(--color-outline-variant)',
          zIndex: -1,
        }}
      />
    </>
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

  // Dismiss on Escape key — stop propagation so parent Escape handlers
  // (e.g. router-level navigation) do not also fire.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onDismiss();
      }
    };
    // Capture phase so we intercept before any bubbling handlers
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
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
      <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] px-3.5 py-3">
        {/* AI label */}
        <div className="flex items-center gap-[5px] mb-1.5">
          <span className="text-[10px] font-semibold tracking-[0.08em] text-accent font-sans uppercase">
            <span aria-hidden="true">✦</span> AI Summary
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
      <Caret position={position} />
    </div>
  );
}
