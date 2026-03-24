import { useState } from 'react';
import type { Commitment } from '@/types';
import Button from '@/components/Button';
import { HistoryDrawer } from './HistoryDrawer';

const STORAGE_KEY = 'compass.myRollingWork.expanded';

function readExpanded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function writeExpanded(expanded: boolean) {
  localStorage.setItem(STORAGE_KEY, expanded ? 'true' : 'false');
}

interface MyRollingWorkSectionProps {
  commitments: Commitment[];
}

export function MyRollingWorkSection({ commitments }: MyRollingWorkSectionProps) {
  const [expanded, setExpanded] = useState(readExpanded);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();

  function toggle() {
    setExpanded((e) => {
      const next = !e;
      writeExpanded(next);
      return next;
    });
  }

  return (
    <>
      <section
        className="bg-surface-container-low rounded-sm border border-outline-variant/15 overflow-hidden"
        aria-labelledby="my-rolling-work-heading"
      >
        <button
          type="button"
          id="my-rolling-work-heading"
          onClick={toggle}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-container/80 transition-colors duration-[var(--duration-fast)]"
        >
          <span className="font-serif text-[1.0625rem] text-on-surface">My rolling work</span>
          <svg
            className={`w-5 h-5 text-muted flex-shrink-0 transition-transform duration-[var(--duration-fast)] ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-outline-variant/10">
            {commitments.length === 0 ? (
              <p className="text-body text-on-surface-variant pt-3">
                No commitments for you this cycle. Your week-by-week history will appear here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 pt-3">
                {commitments.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 bg-surface-lowest rounded-sm px-3 py-2.5 border border-outline-variant/10"
                  >
                    <span className="text-body text-on-surface truncate min-w-0">{c.title}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setSelectedTitle(c.title);
                        setDrawerOpen(true);
                      }}
                    >
                      History
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <HistoryDrawer
        open={drawerOpen}
        commitmentId={selectedId}
        commitmentTitle={selectedTitle}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedId(null);
          setSelectedTitle(undefined);
        }}
      />
    </>
  );
}
