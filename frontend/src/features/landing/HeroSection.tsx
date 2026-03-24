import { useEffect, useMemo, useRef, useState } from 'react';
import { GridCanvas } from './GridCanvas';

export function HeroSection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const stagger = useMemo(() => (index: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity 300ms cubic-bezier(0.16,1,0.3,1), transform 300ms cubic-bezier(0.16,1,0.3,1)`,
    transitionDelay: `${index * 120}ms`,
  }), [visible]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-surface py-[140px] pb-[100px]">
      <GridCanvas />

      <div className="relative z-[2] mx-auto max-w-[1080px] px-10 grid grid-cols-1 md:grid-cols-2 gap-[60px] items-center">
        {/* Text column */}
        <div className="relative z-[3] text-left">
          <div
            className="font-serif text-[3rem] font-normal text-on-surface tracking-[0.12em] mb-6"
            style={{ ...stagger(0), fontVariant: 'small-caps' }}
          >
            Compass
          </div>

          <h1
            className="font-serif text-[2.5rem] font-normal text-on-surface leading-[1.25] mb-5"
            style={stagger(1)}
          >
            See Whether Your Organization Is Executing on Strategy
          </h1>

          <p
            className="font-sans text-[1.125rem] text-on-surface-variant max-w-[600px] leading-[1.7] mb-10"
            style={stagger(2)}
          >
            Know whether execution matches intent — in 60 seconds, not 60 days.
            Compass turns weekly commitments into a live signal of strategic alignment.
          </p>

          <div className="flex gap-4 mb-8" style={stagger(3)}>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 px-7 py-3 bg-accent text-white font-sans text-body font-medium rounded-sm no-underline transition-colors duration-150 hover:bg-accent-dark active:translate-y-px"
            >
              View Demo <span aria-hidden="true">&rarr;</span>
            </a>
            <a
              href="#see-it"
              className="inline-flex items-center gap-1.5 px-7 py-3 bg-surface text-accent font-sans text-body font-medium rounded-sm no-underline border-[1.5px] border-accent transition-colors duration-150 hover:bg-accent hover:text-white active:translate-y-px"
            >
              See the Views <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          <p
            className="text-label text-muted tracking-[0.02em]"
            style={stagger(4)}
          >
            Built for leaders who need to know if execution matches intent.
          </p>
        </div>

        {/* Right column — viz placeholder (canvas renders behind) */}
        <div
          className="relative w-full aspect-square max-w-[440px] justify-self-center z-[3]"
          style={stagger(5)}
        />
      </div>
    </section>
  );
}
