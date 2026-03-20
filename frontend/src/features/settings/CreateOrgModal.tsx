import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Button from '@/components/Button';
import Input from '@/components/Input';

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'Central (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (America/Los_Angeles)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'Europe/Berlin', label: 'Berlin (Europe/Berlin)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Asia/Tokyo)' },
];

interface CreateOrgModalProps {
  open: boolean;
  isPending: boolean;
  error: string | null;
  onSave: (name: string, timezone: string) => void;
  onClose: () => void;
}

export function CreateOrgModal({ open, isPending, error, onSave, onClose }: CreateOrgModalProps) {
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');

  useEffect(() => {
    if (open) {
      setName('');
      setTimezone('America/Chicago');
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), timezone);
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => { if (!isPending) onClose(); }}>
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
            enterFrom="opacity-0 translate-y-2"
            enterTo="opacity-100 translate-y-0"
            leave="duration-[200ms] ease-[cubic-bezier(0.4,0,1,1)]"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-2"
          >
            <Dialog.Panel className="w-full max-w-[440px] bg-surface-lowest rounded-sm p-8 shadow-whisper">
              <Dialog.Title className="font-serif text-[1.125rem] font-normal text-on-surface mb-6">
                Create Organization
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Organization Name"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); }}
                  placeholder="Acme Manufacturing Inc."
                />

                <div className="flex flex-col gap-1">
                  <label className="text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium">
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => { setTimezone(e.target.value); }}
                    className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant
                      px-0 py-2 text-body text-on-surface focus:outline-none focus:border-b-accent
                      cursor-pointer appearance-none transition-colors duration-[200ms]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0 center',
                    }}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-sm bg-error/10 border border-error/20 px-4 py-3">
                    <p className="text-body text-error">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={onClose} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isPending || !name.trim()}
                    loading={isPending}
                  >
                    Create
                  </Button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
