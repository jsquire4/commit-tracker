import type { ReconciliationStatus } from '@/types/enums';

/**
 * Visual properties for reconciliation status pills/badges.
 * Shared between CommitmentRow (collapsed pill) and CommitmentStatusMarker (buttons).
 */
export const STATUS_STYLES: Record<
  ReconciliationStatus,
  { bg: string; text: string; label: string; icon: string }
> = {
  COMPLETED: { bg: 'bg-[#E0F2F1]', text: 'text-accent', label: 'Completed', icon: '\u2713' },
  PARTIALLY_COMPLETED: { bg: 'bg-[#FFF8E1]', text: 'text-[#92650A]', label: 'Partial', icon: '\u00BD' },
  NOT_STARTED: { bg: 'bg-[#FFF0EF]', text: 'text-error', label: 'Not Started', icon: '\u00D7' },
  CARRIED_FORWARD: { bg: 'bg-[#EEF2F8]', text: 'text-navy', label: 'Carried Fwd', icon: '\u2192' },
};
