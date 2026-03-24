import { useRef, type ReactNode } from 'react';
import { useFadeUp } from '../hooks/useMotion';

interface RevealCardProps {
  index: number;
  className?: string;
  children: ReactNode;
}

export function RevealCard({ index, className = '', children }: RevealCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      {children}
    </div>
  );
}
