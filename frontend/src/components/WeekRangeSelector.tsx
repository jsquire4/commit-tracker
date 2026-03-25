import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/stores/ui.store';
import { useSortedCycles } from '@/hooks/useDateRange';
import { getPresetRange } from '@/lib/dateRangeUtils';
import type { Cycle, DashboardFilters } from '@/types';

/** Format a cycle as "Mar 16–22, 2026" */
function formatCycleOption(cycle: Cycle): string {
  const s = new Date(cycle.startsAt);
  const e = new Date(cycle.endsAt);
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = s.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}–${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay}–${eMonth} ${eDay}, ${year}`;
}

/** Custom dropdown — renders menu via portal so it escapes nav overflow */
function CycleDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Cycle[];
  value: string;
  onChange: (startsAt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Position the menu below the button
  const updatePosition = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  const selected = options.find((c) => c.startsAt === value);
  const displayText = selected ? formatCycleOption(selected) : label;

  // Descending order — newest first
  const descOptions = useMemo(() => [...options].reverse(), [options]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen(!open);
        }}
        className={[
          'px-3 py-1.5 text-body font-medium whitespace-nowrap text-center',
          'border-b-2 transition-colors cursor-pointer',
          open
            ? 'text-accent border-accent'
            : 'text-on-surface-variant border-transparent hover:text-accent hover:border-accent',
        ].join(' ')}
      >
        {displayText}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-surface-lowest border border-outline-variant rounded-sm shadow-whisper max-h-[228px] overflow-y-auto scrollbar-thin"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            transform: 'translateX(-50%)',
          }}
        >
          {descOptions.map((c) => {
            const isSelected = c.startsAt === value;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.startsAt);
                  setOpen(false);
                }}
                className={[
                  'w-full px-2.5 py-1.5 text-small text-center whitespace-nowrap transition-colors',
                  isSelected
                    ? 'text-accent font-medium bg-accent/[0.06]'
                    : 'text-on-surface hover:bg-surface-container-low',
                ].join(' ')}
              >
                {formatCycleOption(c)}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * Self-contained global date range selector.
 * Reads and writes directly to Zustand dashboardFilters.
 * Renders two custom dropdown buttons plus quick range presets.
 */
export function WeekRangeSelector() {
  const filters = useUIStore((s) => s.dashboardFilters);
  const setFilters = useUIStore((s) => s.setDashboardFilters);
  const { data: cycles = [] } = useSortedCycles();

  // Default: last completed week → current week
  const { defaultFrom, defaultTo } = useMemo(() => {
    if (cycles.length === 0) return { defaultFrom: null, defaultTo: null };
    const current = cycles.find((c) => c.isActive) ?? cycles[cycles.length - 1];
    const reversed = [...cycles].reverse();
    const lastCompleted = reversed.find(
      (c) => c.state === 'LOCKED' || c.state === 'RECONCILED' || c.state === 'RECONCILING',
    );
    return {
      defaultFrom: lastCompleted ?? current,
      defaultTo: current,
    };
  }, [cycles]);

  useEffect(() => {
    if (
      cycles.length > 0 &&
      !filters.cycleWeekStart &&
      !filters.cycleWeekEnd &&
      defaultFrom
    ) {
      const initial: Partial<DashboardFilters> = {
        cycleWeekStart: defaultFrom.startsAt,
      };
      if (defaultTo) {
        initial.cycleWeekEnd = defaultTo.startsAt;
      }
      setFilters(initial);
    }
    // Intentionally omits filters/setFilters from deps — one-time initialization.
    // setFilters is a stable Zustand reference; filters are read only as a guard.
  }, [cycles.length, defaultFrom, defaultTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFrom = cycles.find((c) => c.startsAt === filters.cycleWeekStart);

  const toOptions = useMemo(() => {
    if (!selectedFrom) return cycles;
    const fromTime = new Date(selectedFrom.startsAt).getTime();
    return cycles.filter((c) => new Date(c.startsAt).getTime() >= fromTime);
  }, [cycles, selectedFrom]);

  function applyPreset(preset: 'last4' | 'quarter' | 'ytd') {
    const range = getPresetRange(preset, cycles);
    if (range) {
      setFilters({ cycleWeekStart: range.from, cycleWeekEnd: range.to });
    }
  }

  if (cycles.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {/* From dropdown */}
      <CycleDropdown
        label="From"
        options={cycles}
        value={filters.cycleWeekStart ?? ''}
        onChange={(startsAt) => {
          const toTime = filters.cycleWeekEnd
            ? new Date(filters.cycleWeekEnd).getTime()
            : 0;
          const fromTime = new Date(startsAt).getTime();
          if (toTime < fromTime) {
            setFilters({ cycleWeekStart: startsAt, cycleWeekEnd: startsAt });
          } else {
            setFilters({ cycleWeekStart: startsAt });
          }
        }}
      />

      <span className="text-muted text-body select-none">–</span>

      {/* To dropdown */}
      <CycleDropdown
        label="To"
        options={toOptions}
        value={filters.cycleWeekEnd ?? filters.cycleWeekStart ?? ''}
        onChange={(startsAt) => {
          setFilters({ cycleWeekEnd: startsAt });
        }}
      />

      {/* Quick presets */}
      <div className="flex items-center gap-0.5 ml-1">
        {(['last4', 'quarter', 'ytd'] as const).map((preset) => {
          const label = preset === 'last4' ? '4w' : preset === 'quarter' ? 'Qtr' : 'YTD';
          return (
            <button
              key={preset}
              type="button"
              onClick={() => { applyPreset(preset); }}
              className="px-2 py-1.5 text-small font-medium text-on-surface-variant hover:text-accent border-b-2 border-transparent hover:border-accent transition-colors duration-[var(--duration-fast)] cursor-pointer"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Returns whether the selected date range includes any DRAFT cycles.
 */
export function useHasDraftCycles(): {
  hasDraft: boolean;
  draftLabel: string | null;
} {
  const filters = useUIStore((s) => s.dashboardFilters);
  const { data: cycles = [] } = useSortedCycles();

  return useMemo(() => {
    if (!filters.cycleWeekStart || cycles.length === 0) {
      return { hasDraft: false, draftLabel: null };
    }

    const fromTime = new Date(filters.cycleWeekStart).getTime();
    const toTime = filters.cycleWeekEnd
      ? new Date(filters.cycleWeekEnd).getTime()
      : fromTime;

    const inRange = cycles.filter((c) => {
      const t = new Date(c.startsAt).getTime();
      return t >= fromTime && t <= toTime;
    });

    const drafts = inRange.filter((c) => c.state === 'DRAFT');
    if (drafts.length === 0) return { hasDraft: false, draftLabel: null };

    const labels = drafts.map((c) => formatCycleOption(c)).join(', ');
    return { hasDraft: true, draftLabel: labels };
  }, [cycles, filters.cycleWeekStart, filters.cycleWeekEnd]);
}
