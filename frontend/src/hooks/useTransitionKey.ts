import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/ui.store';

/**
 * Returns a CSS class that triggers a 150ms fade animation
 * whenever the global date range changes.
 *
 * Usage:
 * ```tsx
 * const { transitionClass } = useTransitionKey();
 * return <div className={transitionClass}>...</div>;
 * ```
 */
export function useTransitionKey() {
  const filters = useUIStore((s) => s.dashboardFilters);
  const key = `${filters.cycleWeekStart ?? ''}-${filters.cycleWeekEnd ?? ''}`;
  const prevKey = useRef(key);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      setFading(true);
      const timer = setTimeout(() => { setFading(false); }, 150);
      return () => { clearTimeout(timer); };
    }
  }, [key]);

  return {
    transitionClass: [
      'transition-opacity duration-150 ease-[var(--ease-standard)]',
      fading ? 'opacity-0' : 'opacity-100',
    ].join(' '),
  };
}
