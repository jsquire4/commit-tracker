# Compass Design System — "Executive Intelligence"

## Creative North Star: "The Digital Archivist"
Premium consulting/banking aesthetic. McKinsey white paper meets Goldman Sachs client portal.

## Color Palette
- **Background (surface):** #F9F9F7 — warm off-white, paper-like
- **Card (surface-lowest):** #FFFFFF — pure white
- **Surface container low:** #F2F4F2 — subtle inset areas
- **Surface container:** #EEEEEC — section backgrounds
- **Surface container high:** #E8E8E6 — hover states
- **Text primary (on-surface):** #2D3432 — charcoal, never pure black
- **Text secondary (on-surface-variant):** #5A605E — slate for body
- **Text muted:** #94A3B8 — metadata, labels
- **Accent primary (secondary):** #036A6A — deep teal, interactive elements only
- **Accent primary dark:** #005050 — hover states
- **Warm border (outline-variant):** #E8E5E0 — hairline borders
- **Ghost border:** outline-variant at 15% opacity
- **Error/at-risk:** #9F403D — muted rose
- **Warning/watch:** #C2860B — warm gold/amber
- **Navy (primary):** #455F87 — editorial links

## Typography
- **Headlines:** Newsreader (serif) — authority, editorial weight. Never bolded, let scale provide emphasis.
- **Body/Data/Labels:** Inter (sans-serif) — legibility, precision
- **Label treatment:** Uppercase, 0.05rem letter-spacing for metadata/categories
- **Numeric:** Tabular nums (font-variant-numeric: tabular-nums)

### Scale
- Display: 3.5rem (Newsreader)
- Headline: 1.5rem (Newsreader)
- Title: 1rem (Inter Medium)
- Body: 0.875rem (Inter Regular)
- Label: 0.75rem (Inter, uppercase)
- Small: 0.6875rem (Inter)

## Elevation & Depth
- **No traditional shadows.** Depth via tonal layering (surface stacking).
- **Whisper shadow (floating only):** 0 12px 32px -4px rgba(45, 52, 50, 0.06)
- **No 1px solid borders** for sectioning. Boundaries = background shifts.
- **Ghost border fallback:** outline-variant at 15% opacity, felt not seen.
- **Glassmorphism (floating nav):** surface at 85% opacity + 20px backdrop-blur

## Components
- **Buttons primary:** #036A6A fill, white text, 4px rounded
- **Buttons secondary:** surface-container-high fill, charcoal text
- **Buttons tertiary:** Text only, underline on hover, primary color
- **Input fields:** No box border. Bottom-line only. Focus = teal underline.
- **Cards:** White on off-white. No divider lines. Spacing separates sections.
- **Status chips:** surface-container-highest bg, on-surface text, no border
- **Corners:** 4px max (sm). No rounded-xl or rounded-full except pill chips.

## Layout Principles
- Generous margins — content never touches viewport edge
- "Section Breath" — large spacing between major sections
- "Data Core" — dense within cards/modules
- Two-column layouts: primary content (65-70%) + context sidebar (30-35%)
- Exception-based: problems surface first, healthy state is quiet

## Status Signals (sparingly)
- **On track:** Teal #036A6A (small dots, chips only)
- **Watch:** Warm gold #C2860B (left-border accent, subtle)
- **At risk:** Muted rose #9F403D (minimal usage)
- Never red/green for growth. Use navy for growth, muted for stagnation.

## Motion & Delight — "The Mechanical Watch"

Motion should feel like precision engineering — smooth, intentional, never playful.
The metaphor: a heavy door on quality hinges, a card being laid on a mahogany desk.

### Timing & Easing
- **Standard transition:** 200ms cubic-bezier(0.25, 0.1, 0.25, 1) — snappy, not bouncy
- **Entrance (elements appearing):** 300ms cubic-bezier(0.16, 1, 0.3, 1) — fast start, gentle settle
- **Exit (elements leaving):** 200ms cubic-bezier(0.4, 0, 1, 1) — quick, decisive
- **Stagger delay:** 40ms between siblings (cards loading in sequence)
- **Never exceed 400ms** for any animation. Executives don't wait.

### Page & Section Transitions
- **Cards on load:** Fade up from 12px below + opacity 0→1, staggered 40ms per card.
  Creates a "cards being dealt" effect — each one lays itself on the table.
- **Tab switching:** Content cross-fades (opacity 0→1, 150ms). No sliding.
- **Section reveal on scroll:** Subtle fade-in as sections enter the viewport.
  Use IntersectionObserver, trigger once. Threshold 0.1.

### Interactive Elements
- **Card hover:** Background shifts from #FFFFFF to #F9F9F7 over 150ms.
  Subtle — like paper warming under your hand.
- **Button hover:** Background darkens slightly (#036A6A → #005050), 150ms.
  No scale transform, no shadow change. Just a confident color shift.
- **Button press:** Translate Y +1px for 100ms — a tactile "click" feel.
- **Link hover:** Underline slides in from left (width 0→100%, 200ms).
  Not instant. It unfurls.
- **Focus ring:** Teal outline fades in (opacity 0→1, 150ms) with 2px offset.
  Never a harsh snap-on.

### Slide-Overs & Modals
- **Overlay:** Fade in (opacity 0→0.4, 200ms)
- **Panel:** Slide from right, translate X 100%→0, 300ms cubic-bezier(0.16, 1, 0.3, 1).
  The panel "arrives" — fast start, cushioned landing.
- **Panel close:** Reverse, 200ms. Quick, decisive exit.

### Data & Metrics
- **Number transitions:** When a metric changes (e.g., "41%" → "43%"),
  the number counts up/down over 400ms. Use CSS `counter` or JS.
  Feels like a Bloomberg terminal ticking.
- **Progress indicators:** Thin bars animate width from 0→target, 500ms ease-out.
  Draws the eye without screaming.
- **Status chip change:** Cross-fade (opacity swap, 200ms). No bouncing.

### Micro-Interactions
- **Drag handle hover:** Handle dots shift from muted gray to charcoal, 150ms.
  "I'm ready to be grabbed."
- **Expand/collapse chevron:** Rotates 0→180°, 200ms. Smooth, mechanical.
- **Checkbox check:** Scale 0→1 on the checkmark with a tiny 50ms overshoot
  (scale to 1.1 then back to 1). The only "bounce" in the system — earned.
- **Toast/notification:** Slides down from top, 300ms, auto-dismisses after 4s
  with a subtle progress bar shrinking along the bottom edge.
- **Tooltip:** Fade in + translate Y -4px→0, 150ms, 200ms delay before showing.
  Never instant — it "rises" into view.

### Skeleton Loading
- **Shimmer effect:** Subtle gradient sweep left→right over placeholder rectangles.
  Colors: surface-container → surface-container-high → surface-container.
  Animation: 1.5s infinite, linear. The "breathing" of waiting data.
- **Replace skeletons:** Fade-in from opacity 0, 200ms per element, staggered.

### What NOT to Do
- No spring physics or rubber-band effects
- No parallax scrolling
- No confetti, sparkles, or emoji
- No slide-in from left (panels always come from the right)
- No infinite looping animations except skeleton shimmer
- No transform: scale() on cards or containers (feels cheap)
- No animation on scroll direction changes (feels like a blog, not an app)

### CSS Custom Properties for Motion
```css
:root {
  --ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --duration-fast: 150ms;
  --duration-standard: 200ms;
  --duration-entrance: 300ms;
  --duration-slow: 400ms;
  --stagger-delay: 40ms;
}
```
