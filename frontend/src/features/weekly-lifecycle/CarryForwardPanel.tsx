import { useState } from 'react';
import type { Commitment } from '@/types';
import Card from '@/components/Card';
import { useDeleteCommitment } from '@/hooks/useCommitments';
import { useToast, ToastContainer } from '@/hooks/useToast';

interface CarryForwardPanelProps {
  carriedItems: Commitment[];
  cycleId: string;
}

interface CarriedItemRowProps {
  commitment: Commitment;
  cycleId: string;
  onAccept: (id: string) => void;
  accepted: boolean;
}

function CarriedItemRow({ commitment, cycleId, onAccept, accepted }: CarriedItemRowProps) {
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const { mutate: deleteCommitment, isPending } = useDeleteCommitment(cycleId);

  // Reconciliation status from the carried commitment
  const reconStatus = commitment.reconciliationStatus;
  const statusLabel =
    reconStatus === 'PARTIALLY_COMPLETED' ? 'Partially Completed' :
    reconStatus === 'NOT_STARTED' ? 'Not Started' :
    reconStatus === 'CARRIED_FORWARD' ? 'Carried Forward' : 'Carried';

  function handleAccept() {
    onAccept(commitment.id);
  }

  if (accepted) {
    return (
      <div className="bg-surface-container-low rounded-sm p-3 flex items-center gap-2 opacity-60 transition-opacity duration-300">
        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-body text-on-surface-variant line-through truncate">{commitment.title}</span>
        <span className="text-small text-accent font-medium ml-auto flex-shrink-0">Accepted</span>
      </div>
    );
  }

  function handleDeclineSubmit() {
    deleteCommitment(commitment.id);
    setDeclining(false);
  }

  return (
    <div className="bg-surface-container-low rounded-sm p-3 flex flex-col gap-2">
      {/* Top: title + status pill */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-body text-on-surface font-medium truncate">
          {commitment.title}
        </span>
        <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium bg-[#FEF3C7] text-[#92400E] whitespace-nowrap">
          {statusLabel}
        </span>
      </div>

      {/* Task bullets with checkboxes */}
      {commitment.bullets.length > 0 && (
        <div className="flex flex-col gap-1 pl-1">
          {commitment.bullets.map((bullet) => (
            <label key={bullet.id} className="flex items-center gap-2 text-[0.8125rem] text-on-surface-variant">
              <input
                type="checkbox"
                checked={bullet.isCompleted}
                readOnly
                className="flex-shrink-0 w-3.5 h-3.5 rounded-sm border-[1.5px] border-outline-variant bg-surface-lowest accent-accent pointer-events-none"
              />
              <span className={bullet.isCompleted ? 'line-through text-muted' : ''}>
                {bullet.body}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Reconciliation notes / why carried */}
      {commitment.reconciliationNote && (
        <div className="text-[0.8125rem] text-on-surface-variant italic p-2 bg-surface-container rounded-sm leading-snug">
          <strong className="font-medium text-on-surface not-italic">Why carried:</strong>{' '}
          {commitment.reconciliationNote}
        </div>
      )}

      {/* Actions */}
      {!declining ? (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleAccept}
            className="px-3 py-1 text-small font-medium text-accent border border-accent rounded-sm bg-transparent hover:bg-accent/[0.08] transition-colors duration-[var(--duration-fast)]"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => { setDeclining(true); }}
            disabled={isPending}
            className="px-3 py-1 text-small font-medium text-error border border-error rounded-sm bg-transparent hover:bg-error/[0.08] transition-colors duration-[var(--duration-fast)] disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-sm p-3 border border-outline-variant">
          <label
            htmlFor={`decline-reason-${commitment.id}`}
            className="mb-1 block text-small font-medium text-on-surface-variant"
          >
            Reason for declining (optional)
          </label>
          <input
            id={`decline-reason-${commitment.id}`}
            type="text"
            value={declineReason}
            onChange={(e) => { setDeclineReason(e.target.value); }}
            placeholder="e.g. no longer relevant"
            className="w-full border-b border-outline-variant bg-transparent px-1 py-1.5 text-small text-on-surface placeholder-muted focus:outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setDeclining(false); }}
              className="text-small text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeclineSubmit}
              disabled={isPending}
              className="px-3 py-1 text-small font-medium bg-error text-white rounded-sm hover:bg-error/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Removing\u2026' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CarryForwardPanel({ carriedItems, cycleId }: CarryForwardPanelProps) {
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const { toast, toasts, dismiss } = useToast();

  if (carriedItems.length === 0) return null;

  function handleAccept(id: string) {
    setAcceptedIds((prev) => new Set(prev).add(id));
    toast.success("Commitment accepted \u2014 it's in your list");
  }

  // Hide the panel entirely once all items are accepted
  const allAccepted = carriedItems.every((item) => acceptedIds.has(item.id));

  return (
    <>
      {!allAccepted && (
        <Card accent="amber" padding="compact" className="!p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="h-4 w-4 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span className="text-[0.8125rem] font-medium text-on-surface">
              {carriedItems.length - acceptedIds.size} item{carriedItems.length - acceptedIds.size !== 1 ? 's' : ''} carried from last week
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {carriedItems.map((item) => (
              <CarriedItemRow
                key={item.id}
                commitment={item}
                cycleId={cycleId}
                onAccept={handleAccept}
                accepted={acceptedIds.has(item.id)}
              />
            ))}
          </div>
        </Card>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
