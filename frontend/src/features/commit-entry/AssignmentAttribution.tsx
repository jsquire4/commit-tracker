import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { getTeam } from '@/api/users.api';
import type { AssignmentAttribution as AssignmentAttributionType } from '@/types';

interface AssignmentAttributionProps {
  value: AssignmentAttributionType;
  onChange: (a: AssignmentAttributionType) => void;
  disabled?: boolean;
}

export function AssignmentAttribution({ value, onChange, disabled = false }: AssignmentAttributionProps) {
  const isSelf = value.kind === 'SELF_DIRECTED';

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['users', 'team'],
    queryFn: getTeam,
    staleTime: 5 * 60_000,
    enabled: true,
  });

  const selectedAssigner =
    value.kind === 'ASSIGNED_BY'
      ? teamMembers.find((m) => m.id === value.assignedById) ?? null
      : null;

  function handleToggle(kind: 'SELF_DIRECTED' | 'ASSIGNED_BY') {
    if (kind === 'SELF_DIRECTED') {
      onChange({ kind: 'SELF_DIRECTED' });
    } else {
      onChange({
        kind: 'ASSIGNED_BY',
        assignedById: selectedAssigner?.id ?? '',
        assignedByName: selectedAssigner?.displayName ?? '',
      });
    }
  }

  function handleAssignerSelect(userId: string) {
    const member = teamMembers.find((m) => m.id === userId);
    if (member) {
      onChange({ kind: 'ASSIGNED_BY', assignedById: member.id, assignedByName: member.displayName });
    }
  }

  const toggleBase = [
    'flex-1 py-2 text-[0.8125rem] font-medium border-none',
    'transition-all duration-[150ms] ease-[var(--ease-standard)]',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  ].join(' ');

  return (
    <div className="bg-surface-container-low rounded-sm p-3.5 border border-outline-variant">
      <div className="flex rounded-sm overflow-hidden border border-outline-variant" role="group" aria-label="Assignment attribution">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { handleToggle('SELF_DIRECTED'); }}
          aria-pressed={isSelf}
          className={[
            toggleBase,
            'border-r border-r-outline-variant',
            isSelf
              ? 'bg-surface-lowest text-accent shadow-[inset_0_-2px_0_var(--color-accent)]'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
          ].join(' ')}
        >
          Self-directed
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => { handleToggle('ASSIGNED_BY'); }}
          aria-pressed={!isSelf}
          className={[
            toggleBase,
            !isSelf
              ? 'bg-surface-lowest text-accent shadow-[inset_0_-2px_0_var(--color-accent)]'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
          ].join(' ')}
        >
          Assigned by...
        </button>
      </div>

      {!isSelf && (
        <div className="mt-2.5">
          <Listbox
            value={selectedAssigner?.id ?? ''}
            onChange={handleAssignerSelect}
            disabled={disabled}
          >
            <div className="relative">
              <Listbox.Button className="relative w-full cursor-pointer rounded-sm border border-outline-variant bg-surface-lowest py-2 pl-2.5 pr-8 text-left text-[0.8125rem] focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[200ms]">
                <span className="block truncate text-on-surface">
                  {selectedAssigner ? selectedAssigner.displayName : 'Select who assigned this...'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-muted">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition-opacity duration-100 ease-[var(--ease-exit)]"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-sm bg-surface-lowest py-1 shadow-whisper border border-outline-variant focus:outline-none text-[0.8125rem]">
                  {teamMembers.length === 0 ? (
                    <li className="px-3 py-2 text-muted text-[0.8125rem]">No team members found</li>
                  ) : (
                    teamMembers.map((member) => (
                      <Listbox.Option
                        key={member.id}
                        value={member.id}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2 pl-3 pr-9 transition-colors duration-[120ms] ${active ? 'bg-surface-container-low text-on-surface' : 'text-on-surface'}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {member.displayName}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-accent">
                                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))
                  )}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>
      )}
    </div>
  );
}
