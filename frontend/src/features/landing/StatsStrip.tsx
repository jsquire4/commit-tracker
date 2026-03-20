import { useEffect, useRef, useState } from 'react';
import { useCountUp, useFadeUp } from '../../hooks/useMotion';

const STATS = [
  { value: 3, label: 'Views' },
  { value: 26, label: 'Week Simulation' },
  { value: 18500, label: 'Commitments' },
  { value: 178, label: 'Simulated Users' },
];

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function StatItem({ value, label }: { value: number; label: string }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const display = useCountUp(started ? value : 0, 800);

  return (
    <div ref={ref} className="text-center">
      <div className="font-serif text-headline text-accent tabular-nums">
        {formatNumber(display)}
      </div>
      <div className="font-sans text-label text-muted uppercase tracking-[0.04em] mt-1">
        {label}
      </div>
    </div>
  );
}

export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref);

  return (
    <div
      ref={ref}
      className="reveal mx-auto max-w-[1080px] px-10"
    >
      <div className="flex justify-center gap-12 py-10 border-t border-b border-outline-variant mt-16">
        {STATS.map((s) => (
          <StatItem key={s.label} value={s.value} label={s.label} />
        ))}
      </div>
    </div>
  );
}
