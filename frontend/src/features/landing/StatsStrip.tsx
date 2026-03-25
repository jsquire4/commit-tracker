import { useRef } from 'react';
import { useCountUp, useFadeUp } from '../../hooks/useMotion';
import { useInView } from '../../hooks/useInView';

const STATS = [
  { value: 27, label: 'Reconciled Weeks' },
  { value: 35, label: 'Simulated Users' },
  { value: 2584, label: 'Commitments' },
  { value: 915, label: 'Personal Reflections' },
];

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function StatItem({ value, label }: { value: number; label: string }) {
  const [ref, started] = useInView<HTMLDivElement>();
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
