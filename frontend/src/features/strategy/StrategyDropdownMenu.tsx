import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';

interface StrategyDropdownMenuProps {
  onEdit: () => void;
  onArchive: () => void;
}

export function StrategyDropdownMenu({ onEdit, onArchive }: StrategyDropdownMenuProps) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="p-1 text-muted opacity-0 group-hover:opacity-100
          transition-opacity duration-[150ms] hover:text-on-surface-variant
          focus:opacity-100 focus:outline-none"
        aria-label="Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition duration-[150ms] ease-[var(--ease-standard)]"
        enterFrom="opacity-0 -translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-[100ms] ease-[var(--ease-exit)]"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <Menu.Items
          className="absolute right-0 top-full z-20 mt-1 min-w-[120px]
            bg-surface-lowest rounded-sm shadow-whisper overflow-hidden
            focus:outline-none"
        >
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={onEdit}
                className={`block w-full text-left px-3.5 py-2 text-[0.8125rem]
                  text-on-surface-variant transition-colors duration-[150ms]
                  ${active ? 'bg-surface-container-low' : ''}`}
              >
                Edit
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={onArchive}
                className={`block w-full text-left px-3.5 py-2 text-[0.8125rem]
                  text-error transition-colors duration-[150ms]
                  ${active ? 'bg-error/5' : ''}`}
              >
                Archive
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
