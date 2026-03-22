import { useAlignmentTrend, useCompletionTrend, useDisplacementReport } from '@/hooks/useObservatory';
import type { AlignmentDataPoint, CompletionDataPoint } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CycleColumn {
  cycleId: string;
  cycleLabel: string;
  isEventCycle: boolean;
}

interface TableRow {
  metricName: string;
  values: (string | null)[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a cycle label for a compact column header.
 * Strips "Week of " prefix and trims the year so "Week of Mar 16, 2026" → "Mar 16".
 */
function formatColumnLabel(cycleLabel: string): string {
  // Strip "Week of " prefix (case-insensitive)
  const stripped = cycleLabel.replace(/^week\s+of\s+/i, '');
  // Remove the year portion (", YYYY" at end)
  return stripped.replace(/,\s*\d{4}$/, '').trim();
}

function fmt(value: number, isPercent: boolean): string {
  if (isPercent) return `${Math.round(value)}%`;
  return Math.round(value).toLocaleString();
}

/**
 * A cycle is an "event cycle" if displacement events occurred in its week window,
 * or if carry-forward rate is notably high (>= 30%).
 */
function buildEventCycleSet(
  completion: CompletionDataPoint[] | undefined,
  displacementWeeklyTrend: Record<string, number> | undefined,
): Set<string> {
  const eventSet = new Set<string>();

  if (completion) {
    for (const point of completion) {
      if (point.carryForwardRate >= 30) {
        eventSet.add(point.cycleId);
      }
    }
  }

  // weeklyTrend keys are week identifiers; we match them to cycleLabel heuristically
  if (displacementWeeklyTrend && completion) {
    const weekKeys = Object.keys(displacementWeeklyTrend);
    for (const key of weekKeys) {
      const count = displacementWeeklyTrend[key] ?? 0;
      if (count >= 3) {
        // Try to find a matching cycle by label
        const match = completion.find(
          (p) => p.cycleLabel === key || p.cycleLabel.includes(key),
        );
        if (match) eventSet.add(match.cycleId);
      }
    }
  }

  return eventSet;
}

function buildColumns(
  alignment: AlignmentDataPoint[] | undefined,
  completion: CompletionDataPoint[] | undefined,
  eventCycleSet: Set<string>,
): CycleColumn[] {
  // Prefer completion data for column list; fall back to alignment
  const source = completion ?? alignment ?? [];
  return source.map((p) => ({
    cycleId: p.cycleId,
    cycleLabel: p.cycleLabel,
    isEventCycle: eventCycleSet.has(p.cycleId),
  }));
}

function buildRows(
  columns: CycleColumn[],
  alignment: AlignmentDataPoint[] | undefined,
  completion: CompletionDataPoint[] | undefined,
): TableRow[] {
  const alignMap = new Map(alignment?.map((p) => [p.cycleId, p]) ?? []);
  const compMap = new Map(completion?.map((p) => [p.cycleId, p]) ?? []);

  const rows: TableRow[] = [
    {
      metricName: 'Rally Cry Coverage %',
      values: columns.map((col) => {
        const p = alignMap.get(col.cycleId);
        if (!p) return null;
        // Rally cry coverage = strategic %; best approximation from alignment data
        return fmt(p.strategicPct, true);
      }),
    },
    {
      metricName: 'Completion Rate %',
      values: columns.map((col) => {
        const p = compMap.get(col.cycleId);
        if (!p) return null;
        return fmt(p.completionRate, true);
      }),
    },
    {
      metricName: 'Carry-Forward %',
      values: columns.map((col) => {
        const p = compMap.get(col.cycleId);
        if (!p) return null;
        return fmt(p.carryForwardRate, true);
      }),
    },
    {
      metricName: 'Unplanned Work %',
      values: columns.map((col) => {
        const p = compMap.get(col.cycleId);
        if (!p) return null;
        // Not started = unplanned/blocked work that never began
        return fmt(p.notStartedRate, true);
      }),
    },
    {
      metricName: 'Displacement Events',
      values: columns.map((_col) => {
        // Displacement data is not per-cycle from the API; show dash
        return '—';
      }),
    },
    {
      metricName: 'Total Commitments',
      values: columns.map((col) => {
        const p = compMap.get(col.cycleId) ?? alignMap.get(col.cycleId);
        if (!p) return null;
        return fmt(p.totalCommitments, false);
      }),
    },
  ];

  return rows;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton({ weekCount }: { weekCount: number }) {
  const cols = Math.min(weekCount, 12);
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="inline-block min-w-full">
        {/* Header row skeleton */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-surface-container)' }}>
          <div className="w-44 flex-shrink-0 pr-4 py-2">
            <div className="h-3 w-24 rounded shimmer" />
          </div>
          {Array.from({ length: cols }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="w-12 flex-shrink-0 text-center py-2">
              <div className="h-3 w-8 rounded shimmer mx-auto" />
            </div>
          ))}
        </div>
        {/* Row skeletons */}
        {Array.from({ length: 6 }).map((_, ri) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={ri} className="flex border-b items-center" style={{ borderColor: 'var(--color-surface-container)' }}>
            <div className="w-44 flex-shrink-0 pr-4 py-2.5">
              <div className="h-3 w-32 rounded shimmer" />
            </div>
            {Array.from({ length: cols }).map((_, ci) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={ci} className="w-12 flex-shrink-0 text-center py-2.5">
                <div className="h-3 w-8 rounded shimmer mx-auto" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WeekOnWeekProps {
  weekCount: number;
}

export function WeekOnWeek({ weekCount }: WeekOnWeekProps) {
  const { data: alignment, isLoading: alignmentLoading } = useAlignmentTrend(weekCount);
  const { data: completion, isLoading: completionLoading } = useCompletionTrend(weekCount);
  const { data: displacement, isLoading: displacementLoading } = useDisplacementReport(weekCount);

  const isLoading = alignmentLoading || completionLoading || displacementLoading;

  if (isLoading) {
    return (
      <div className="bg-surface-lowest border border-outline-variant rounded-lg p-4">
        <TableSkeleton weekCount={weekCount} />
      </div>
    );
  }

  const hasData = (alignment && alignment.length > 0) || (completion && completion.length > 0);

  if (!hasData) {
    return (
      <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
        <p className="text-sm text-on-surface-variant text-center py-8">
          No week-on-week data available for this period.
        </p>
      </div>
    );
  }

  const eventCycleSet = buildEventCycleSet(completion, displacement?.weeklyTrend);
  const columns = buildColumns(alignment, completion, eventCycleSet);
  const rows = buildRows(columns, alignment, completion);

  return (
    <div
      className="bg-surface-lowest border border-outline-variant rounded-lg overflow-hidden"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table
          className="w-full border-collapse"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.6875rem',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {/* Sticky header row */}
          <thead>
            <tr>
              {/* Sticky metric label header cell */}
              <th
                className="text-left font-medium text-on-surface-variant bg-surface-lowest border-b"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  borderColor: 'var(--color-surface-container)',
                  padding: '8px 16px 8px 16px',
                  minWidth: '176px',
                  width: '176px',
                }}
              >
                Metric
              </th>
              {/* Week column headers */}
              {columns.map((col) => (
                <th
                  key={col.cycleId}
                  className="text-center font-medium text-on-surface-variant border-b"
                  style={{
                    borderColor: 'var(--color-surface-container)',
                    padding: '8px 4px',
                    minWidth: '48px',
                    whiteSpace: 'nowrap',
                    background: col.isEventCycle ? '#F3F3F1' : 'var(--color-surface-lowest)',
                  }}
                  title={col.isEventCycle ? 'Significant event cycle' : undefined}
                >
                  {formatColumnLabel(col.cycleLabel)}
                </th>
              ))}
            </tr>
          </thead>

          {/* Data rows */}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.metricName}>
                {/* Sticky metric name cell */}
                <td
                  className="font-medium text-on-surface-variant bg-surface-lowest border-b"
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    borderColor: 'var(--color-surface-container)',
                    padding: '8px 16px',
                    minWidth: '176px',
                    width: '176px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.metricName}
                </td>
                {/* Value cells */}
                {row.values.map((value, colIndex) => {
                  const col = columns[colIndex];
                  const isLast = rowIndex === rows.length - 1;
                  return (
                    <td
                      key={col?.cycleId ?? colIndex}
                      className="text-center text-on-surface"
                      style={{
                        borderBottom: isLast ? 'none' : `1px solid var(--color-surface-container)`,
                        padding: '8px 4px',
                        minWidth: '48px',
                        fontVariantNumeric: 'tabular-nums',
                        background: col?.isEventCycle ? '#F3F3F1' : 'transparent',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      {value ?? <span style={{ color: 'var(--color-muted)' }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
