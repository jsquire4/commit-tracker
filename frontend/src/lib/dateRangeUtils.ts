import type { Cycle } from '@/types';

/**
 * Count how many cycles fall within the selected date range (inclusive).
 * Cycles are matched by their startsAt falling between start and end.
 */
export function computeWeekCount(
  cycleWeekStart: string,
  cycleWeekEnd: string,
  cycles: Cycle[],
): number {
  const from = new Date(cycleWeekStart).getTime();
  const to = new Date(cycleWeekEnd).getTime();
  return cycles.filter((c) => {
    const t = new Date(c.startsAt).getTime();
    return t >= from && t <= to;
  }).length;
}

/**
 * Find the cycle whose startsAt matches the given date string.
 */
export function findCycleForDate(
  startsAt: string,
  cycles: Cycle[],
): Cycle | undefined {
  return cycles.find((c) => c.startsAt === startsAt);
}

/**
 * Simple week diff fallback when cycle list isn't available.
 * Returns at least 1.
 */
export function dateRangeToWeekCount(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)) + 1);
}

/**
 * Quick preset date helpers — returns cycle startsAt values for common ranges.
 */
export function getPresetRange(
  preset: 'last4' | 'quarter' | 'ytd',
  cycles: Cycle[],
): { from: string; to: string } | null {
  if (cycles.length === 0) return null;

  // Cycles are sorted oldest-first
  const newest = cycles[cycles.length - 1]!;
  const newestDate = new Date(newest.startsAt);

  switch (preset) {
    case 'last4': {
      const target = cycles.slice(-4);
      return target.length > 0
        ? { from: target[0]!.startsAt, to: newest.startsAt }
        : null;
    }
    case 'quarter': {
      const target = cycles.slice(-13); // ~13 weeks in a quarter
      return target.length > 0
        ? { from: target[0]!.startsAt, to: newest.startsAt }
        : null;
    }
    case 'ytd': {
      const yearStart = new Date(newestDate.getFullYear(), 0, 1).getTime();
      const ytdCycles = cycles.filter(
        (c) => new Date(c.startsAt).getTime() >= yearStart,
      );
      return ytdCycles.length > 0
        ? { from: ytdCycles[0]!.startsAt, to: newest.startsAt }
        : null;
    }
  }
}
