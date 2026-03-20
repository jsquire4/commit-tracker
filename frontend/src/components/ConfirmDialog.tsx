import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-error hover:bg-error/90 text-white'
      : 'bg-accent hover:bg-accent-dark text-white';

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay: fades to 40% opacity */}
        <Transition.Child
          as={Fragment}
          enter="duration-[200ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-on-surface/40" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* Dialog panel: scale-up entrance */}
          <Transition.Child
            as={Fragment}
            enter="duration-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-sm bg-surface-lowest p-6 shadow-whisper">
              <Dialog.Title className="font-serif text-headline text-on-surface">
                {title}
              </Dialog.Title>
              {description && (
                <p className="mt-2 text-body text-on-surface-variant">{description}</p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-body font-medium text-on-surface bg-surface-container-high rounded-sm hover:bg-surface-container transition-colors duration-[150ms] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 disabled:opacity-50 active:translate-y-px"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={`px-4 py-2 text-body font-medium rounded-sm transition-colors duration-[150ms] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 disabled:opacity-50 active:translate-y-px ${confirmButtonClass}`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {confirmLabel}
                    </span>
                  ) : (
                    confirmLabel
                  )}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
