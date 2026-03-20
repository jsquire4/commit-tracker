import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Triggers the 'visible' class on an element when it enters the viewport.
 * Expects the element to have the 'reveal' CSS class from global.css.
 * Fires once (unobserves after triggering).
 */
export function useFadeUp(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Applies a --stagger-index CSS custom property to each child of the container,
 * incrementing by 1 per child (0-based). Children can use this for staggered
 * animation delays: `animation-delay: calc(var(--stagger-index) * 40ms)`.
 */
export function useStagger(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      (children[i] as HTMLElement).style.setProperty('--stagger-index', String(i));
    }

    return () => {
      for (let i = 0; i < children.length; i++) {
        (children[i] as HTMLElement).style.removeProperty('--stagger-index');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Easing: easeOutCubic — fast start, gentle settle.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates from 0 to `target` over `duration` ms.
 * Returns the current display value (integer).
 * Re-triggers when `target` changes.
 */
export function useCountUp(target: number, duration = 400): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
