import { Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCommitmentLineage } from '@/hooks/useCommitmentLineage';
import { CommitmentLineageTimeline } from './CommitmentLineageTimeline';

interface HistoryDrawerProps {
  open: boolean;
  commitmentId: string | null;
  /** Omitted when not yet selected */
  commitmentTitle?: string | undefined;
  onClose: () => void;
}

export function HistoryDrawer({ open, commitmentId, commitmentTitle, onClose }: HistoryDrawerProps) {
  const queryClient = useQueryClient();
  const q = useCommitmentLineage(commitmentId, open);
  const pages = q.data?.pages ?? [];
  const nodes = pages.flatMap((p) => p.nodes);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage?.hasMore ?? false;

  const handleClose = useCallback(() => {
    if (commitmentId) {
      queryClient.removeQueries({ queryKey: ['commitment-lineage', commitmentId] });
    }
    onClose();
  }, [commitmentId, onClose, queryClient]);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-[2px]" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 flex items-start justify-center sm:pt-16">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg bg-surface-lowest rounded-sm p-6 shadow-whisper max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <Dialog.Title className="font-serif text-[1.125rem] font-normal text-on-surface">
                    History
                  </Dialog.Title>
                  {commitmentTitle && (
                    <p className="text-small text-on-surface-variant mt-1 line-clamp-2">{commitmentTitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded-sm text-muted hover:text-on-surface transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {q.isError ? (
                <p role="alert" className="text-body text-error py-4">
                  {q.error instanceof Error ? q.error.message : 'Could not load history.'}
                </p>
              ) : (
                <CommitmentLineageTimeline
                  nodes={nodes}
                  isLoading={q.isLoading}
                  hasMore={hasMore}
                  onLoadMore={() => { void q.fetchNextPage(); }}
                  loadMoreLoading={q.isFetchingNextPage}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
