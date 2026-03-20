import type { ComponentType, ReactNode } from 'react';
import { EmptyCommitments } from '../assets/illustrations/EmptyCommitments';
import { EmptyRallyCries } from '../assets/illustrations/EmptyRallyCries';
import { EmptyTeam } from '../assets/illustrations/EmptyTeam';
import { EmptyReconciliation } from '../assets/illustrations/EmptyReconciliation';

const illustrationMap: Record<string, ComponentType<{ className?: string }>> = {
  commitments: EmptyCommitments,
  'rally-cries': EmptyRallyCries,
  team: EmptyTeam,
  reconciliation: EmptyReconciliation,
};

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  illustration?: string;
}

export function EmptyState({ title, description, action, icon, illustration }: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrationMap[illustration] : null;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {IllustrationComponent && (
        <div className="mb-6 text-accent">
          <IllustrationComponent className="w-[120px] h-[120px]" />
        </div>
      )}
      {!IllustrationComponent && icon && (
        <div className="mb-4 text-muted">
          {icon}
        </div>
      )}
      {!IllustrationComponent && !icon && (
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-muted mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
      )}
      <h3 className="text-headline font-serif text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="text-body text-on-surface-variant mb-6 max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
