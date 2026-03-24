import { useEffect, useRef, useState } from 'react';

/**
 * Returns [ref, isInView] — sets isInView to true once the element
 * enters the viewport. Disconnects after first intersection (one-shot).
 */
export function useInView<T extends HTMLElement>(threshold = 0.1): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return [ref, inView];
}
