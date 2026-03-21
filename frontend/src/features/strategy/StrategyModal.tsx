import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Button from '@/components/Button';
import type { User } from '@/types';

export type StrategyModalMode = 'rallycry' | 'objective' | 'outcome';

export interface BreadcrumbPart {
  label: string;
  value: string;
}

interface StrategyModalProps {
  open: boolean;
  mode: StrategyModalMode;
  /** Breadcrumb parts rendered as structured label/value pairs */
  breadcrumb: BreadcrumbPart[];
  members: User[];
  isPending: boolean;
  isEdit?: boolean;
  initialTitle?: string;
  initialDescription?: string;
  initialOwnerUserId?: string;
  onSave: (title: string, description: string, ownerUserId: string) => void;
  onClose: () => void;
}

const MODE_LABELS: Record<StrategyModalMode, { heading: string; titlePlaceholder: string; descPlaceholder: string }> = {
  rallycry: {
    heading: 'Add Rally Cry',
    titlePlaceholder: 'Rally cry title...',
    descPlaceholder: 'Describe the strategic narrative \u2014 why this matters, what success looks like, and the urgency behind it...',
  },
  objective: {
    heading: 'Add Objective',
    titlePlaceholder: 'Objective title...',
    descPlaceholder: 'What does success look like?',
  },
  outcome: {
    heading: 'Add Outcome',
    titlePlaceholder: 'Outcome title...',
    descPlaceholder: 'How will this be measured?',
  },
};

export function StrategyModal({
  open,
  mode,
  breadcrumb,
  members,
  isPending,
  isEdit = false,
  initialTitle = '',
  initialDescription = '',
  initialOwnerUserId = '',
  onSave,
  onClose,
}: StrategyModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [ownerUserId, setOwnerUserId] = useState(initialOwnerUserId);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setOwnerUserId(initialOwnerUserId);
      // Focus after transition
      const t = setTimeout(() => titleRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open, initialTitle, initialDescription, initialOwnerUserId]);

  const labels = MODE_LABELS[mode];
  const heading = isEdit
    ? `Edit ${mode === 'rallycry' ? 'Rally Cry' : mode === 'objective' ? 'Objective' : 'Outcome'}`
    : labels.heading;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), description.trim(), ownerUserId);
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => { if (!isPending) onClose(); }}>
        {/* Overlay */}
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
          <Transition.Child
            as={Fragment}
            enter="duration-[300ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            enterFrom="opacity-0 translate-y-4"
            enterTo="opacity-100 translate-y-0"
            leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-4"
          >
            <Dialog.Panel className="w-full max-w-[500px] bg-surface-lowest rounded-sm p-8 shadow-[0_24px_64px_-8px_rgba(45,52,50,0.14)]">
              <Dialog.Title className="font-serif text-[1.25rem] font-normal text-on-surface leading-tight">
                {heading}
              </Dialog.Title>

              {/* Breadcrumb context */}
              {breadcrumb.length > 0 && (
                <p className="mt-1 text-[0.8125rem] text-on-surface-variant">
                  {breadcrumb.map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mx-1 text-muted">&rsaquo;</span>}
                      <span className="text-muted">{part.label}: </span>
                      <strong className="text-accent">{part.value}</strong>
                    </span>
                  ))}
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-1">
                {/* Title */}
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); }}
                  placeholder={labels.titlePlaceholder}
                  className="block w-full bg-transparent border-0 border-b-[1.5px] border-b-outline-variant
                    px-0 py-2 text-body text-on-surface placeholder:text-muted
                    focus:outline-none focus:border-b-accent transition-colors duration-[150ms]"
                />

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); }}
                  placeholder={labels.descPlaceholder}
                  rows={mode === 'rallycry' ? 5 : 3}
                  className="block w-full bg-transparent border-0 border-b-[1.5px] border-b-outline-variant
                    px-0 py-2 mt-2 text-[0.8125rem] text-on-surface placeholder:text-muted
                    focus:outline-none focus:border-b-accent resize-vertical transition-colors duration-[150ms]"
                />

                {/* Owner select — not shown for rally cries */}
                {mode !== 'rallycry' && (
                  <select
                    value={ownerUserId}
                    onChange={(e) => { setOwnerUserId(e.target.value); }}
                    className="mt-2 block w-full bg-surface-container-low border border-outline-variant
                      rounded-sm px-2.5 py-1.5 text-[0.8125rem] text-on-surface-variant
                      focus:outline-none focus:border-accent transition-colors duration-[150ms]
                      cursor-pointer"
                  >
                    <option value="">Assign owner...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-6">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!title.trim() || isPending}
                    loading={isPending}
                  >
                    {isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    className="px-4 py-2 text-body text-muted bg-transparent border-0
                      cursor-pointer hover:text-on-surface-variant transition-colors duration-[150ms]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
