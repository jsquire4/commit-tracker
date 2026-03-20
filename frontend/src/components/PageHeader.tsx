import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-headline text-on-surface">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-title text-on-surface-variant">{subtitle}</p>
        )}
        {description && (
          <p className="mt-1 text-body text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}
