import { useState } from 'react';
import type { Commitment } from '@/types';
import Button from '@/components/Button';
import { HistoryDrawer } from './HistoryDrawer';

interface MyWeekHistorySectionProps {
  commitments: Commitment[];
}

export function MyWeekHistorySection({ commitments }: MyWeekHistorySectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();

  return (
    <>
      <section className="border-t border-outline-variant/15 pt-6 mt-6" aria-labelledby="my-week-history-heading">
        <h2 id="my-week-history-heading" className="font-serif text-lg text-on-surface mb-2">
          History
        </h2>
        {commitments.length === 0 ? (
          <p className="text-body text-on-surface-variant">
            No commitments this week yet. Add a commitment to see week-by-week history here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {commitments.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 bg-surface-container-low rounded-sm px-3 py-2.5"
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
