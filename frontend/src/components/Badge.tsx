import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'status' | 'category';
type BadgeSize = 'sm' | 'md';

type StatusColor = 'on-track' | 'watch' | 'at-risk';
type CategoryColor = 'strategic' | 'operational' | 'defensive' | 'capability';

/** Legacy variant names kept for backward compatibility — all render as default pill */
type LegacyVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'strategic' | 'operational' | 'defensive' | 'capability';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant | LegacyVariant;
  color?: StatusColor | CategoryColor | string;
  size?: BadgeSize;
  className?: string;
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[0.6875rem]',
  md: 'px-2.5 py-0.5 text-xs',
};

const statusDotColors: Record<StatusColor, string> = {
  'on-track': 'bg-accent',
  watch: 'bg-warning',
  'at-risk': 'bg-error',
};

const categoryStyles: Record<CategoryColor, string> = {
  strategic: 'border-l-2 border-l-navy bg-navy/10 text-navy',
  operational: 'border-l-2 border-l-operational bg-operational/10 text-operational',
  defensive: 'border-l-2 border-l-error bg-error/10 text-error',
  capability: 'border-l-2 border-l-capability bg-capability/10 text-capability',
};

const legacyCategoryVariants = new Set<string>(['strategic', 'operational', 'defensive', 'capability']);

export function Badge({
  children,
  variant = 'default',
  color,
  size = 'md',
  className = '',
}: BadgeProps) {
  // Map legacy CHESS category variants to the category variant
  if (legacyCategoryVariants.has(variant)) {
    return (
      <Badge variant="category" color={variant as CategoryColor} size={size} className={className}>
        {children}
      </Badge>
    );
  }

  // Default variant (includes legacy color names like blue/green/yellow/red/gray): neutral pill
  if (variant === 'default' || !['status', 'category'].includes(variant)) {
    return (
      <span
        className={[
          'inline-flex items-center rounded-full font-medium',
          'bg-surface-container-highest text-on-surface',
          sizeClasses[size],
          className,
        ].join(' ')}
      >
        {children}
      </span>
    );
  }

  // Status variant: tiny dot + text
  if (variant === 'status') {
    const dotColor = statusDotColors[(color as StatusColor) ?? 'on-track'] ?? 'bg-accent';
    return (
      <span
        className={[
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          'bg-surface-container-highest text-on-surface',
          sizeClasses[size],
          className,
        ].join(' ')}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
        {children}
      </span>
    );
  }

  // Category variant: left-border tonal pill with CHESS colors
  if (variant === 'category') {
    const catStyle = categoryStyles[(color as CategoryColor) ?? 'strategic'] ?? '';
    return (
      <span
        className={[
          'inline-flex items-center rounded-full font-medium',
          sizeClasses[size],
          catStyle,
          className,
        ].join(' ')}
      >
        {children}
      </span>
    );
  }

  // Fallback
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium',
        'bg-surface-container-highest text-on-surface',
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
