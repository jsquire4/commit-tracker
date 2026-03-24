import type { ReconciliationStatus } from '@/types';

const RECON_STYLE: Record<ReconciliationStatus, { icon: string; label: string }> = {
  COMPLETED: { icon: '\u2713', label: 'Completed' },
  PARTIALLY_COMPLETED: { icon: '\u25D1', label: 'Partial' },
  NOT_STARTED: { icon: '\u2717', label: 'Not Started' },
  CARRIED_FORWARD: { icon: '\u21B3', label: 'Carried' },
};

export function ReconStatusBadge({ status }: { status: ReconciliationStatus }) {
  const info = RECON_STYLE[status];
  return (
    <span className="flex-shrink-0 inline-flex items-center gap-1 text-small font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
      <span aria-hidden="true">{info.icon}</span>
      {info.label}
    </span>
  );
}
