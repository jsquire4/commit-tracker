import type { CSSProperties, ReactNode } from 'react';

type AccentColor = 'teal' | 'amber' | 'rose';
type PaddingSize = 'compact' | 'normal' | 'spacious';

interface CardProps {
  children: ReactNode;
  accent?: AccentColor;
  hoverable?: boolean;
  floating?: boolean;
  padding?: PaddingSize;
  className?: string;
  style?: CSSProperties;
}

const accentClasses: Record<AccentColor, string> = {
  teal: 'border-l-2 border-l-accent',
  amber: 'border-l-2 border-l-warning',
  rose: 'border-l-2 border-l-error',
};

const paddingClasses: Record<PaddingSize, string> = {
  compact: 'p-3',
  normal: 'p-5',
  spacious: 'p-8',
};

export default function Card({
  children,
  accent,
  hoverable = false,
  floating = false,
  padding = 'normal',
  className = '',
  style,
}: CardProps) {
  return (
    <div
      style={style}
      className={[
        'bg-surface-lowest rounded-sm',
        paddingClasses[padding],
        accent ? accentClasses[accent] : '',
        hoverable
          ? 'transition-colors duration-[150ms] ease-[var(--ease-standard,cubic-bezier(0.25,0.1,0.25,1))] hover:bg-surface'
          : '',
        floating ? 'shadow-whisper' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
