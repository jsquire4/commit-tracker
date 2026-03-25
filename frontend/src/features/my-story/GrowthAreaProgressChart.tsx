import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { GrowthAreaProgress, WeekSnapshot } from '@/types/ic-insights.types';

// ── Color palette ─────────────────────────────────────────────────────────────

// Muted theme-derived shades — harmonize with the design system
const GA_COLORS = [
  '#036A6A',  // accent teal (--color-accent)
  '#455F87',  // navy (--color-navy)
  '#5A7A6B',  // muted sage — darker teal-green
  '#6B8A9E',  // muted steel blue — lighter navy
  '#7A8B7A',  // muted olive — earthy neutral
] as const;

const UNALIGNED_COLOR = 'var(--color-surface-container)';
const TREND_LINE_COLOR = 'var(--color-accent)';

// ── Data transformation ───────────────────────────────────────────────────────

interface ChartDataPoint {
  cycleLabel: string;
  /** Keyed by growthAreaId, value is percentage of total commits */
  [key: string]: string | number;
  /** Percentage of total commits that are unaligned */
  __unaligned: number;
  /** Overall alignment % (sum of all GA pcts, capped at 100) */
  __alignmentPct: number;
  /** Raw total commitments for this week */
  __total: number;
}

interface BarConfig {
  growthAreaId: string;
  label: string;
  color: string;
  dataKey: string;
}

function buildChartData(
  progress: GrowthAreaProgress[],
  weekSnapshots: WeekSnapshot[],
): { chartData: ChartDataPoint[]; barConfig: BarConfig[] } {
  if (weekSnapshots.length === 0) {
    return { chartData: [], barConfig: [] };
  }

  // Build bar config from growth areas (up to 5 colors)
  const barConfig: BarConfig[] = progress.map((ga, i) => ({
    growthAreaId: ga.growthAreaId,
    label: ga.label,
    color: GA_COLORS[i % GA_COLORS.length] as string,
    dataKey: `ga_${ga.growthAreaId}`,
  }));

  // Build lookup: growthAreaId → weeklyBreakdown map
  const gaWeekMaps = new Map<string, Map<string, number>>();
  for (const ga of progress) {
    const weekMap = new Map<string, number>();
    for (const wb of ga.weeklyBreakdown) {
      weekMap.set(wb.cycleLabel, wb.count);
    }
    gaWeekMaps.set(ga.growthAreaId, weekMap);
  }

  const chartData: ChartDataPoint[] = weekSnapshots.map((snap) => {
    const total = snap.commitmentCount;

    if (total === 0) {
      // All zeros — no work this week
      const point: ChartDataPoint = {
        cycleLabel: snap.cycleLabel,
        __unaligned: 0,
        __alignmentPct: 0,
        __total: 0,
      };
      for (const bc of barConfig) {
        point[bc.dataKey] = 0;
      }
      return point;
    }

    // Raw counts per GA for this week
    const rawCounts = barConfig.map((bc) => {
      const weekMap = gaWeekMaps.get(bc.growthAreaId);
      return weekMap?.get(snap.cycleLabel) ?? 0;
    });

    // Raw sum (may exceed total if a commitment is tagged to multiple GAs)
    const rawSum = rawCounts.reduce((a, b) => a + b, 0);

    let gaPcts: number[];
    if (rawSum <= total) {
      // No multi-tagging inflation — straightforward division
      gaPcts = rawCounts.map((c) => (c / total) * 100);
    } else {
      // Normalize proportionally so total GA pcts = 100 (no unaligned)
      gaPcts = rawCounts.map((c) => (c / rawSum) * 100);
    }

    const gaPctSum = gaPcts.reduce((a, b) => a + b, 0);
    const unaligned = Math.max(0, 100 - gaPctSum);
    // Alignment = proportion of work touching at least one GA (capped at 100)
    const alignmentPct = Math.min(100, gaPctSum);

    const point: ChartDataPoint = {
      cycleLabel: snap.cycleLabel,
      __unaligned: unaligned,
      __alignmentPct: alignmentPct,
      __total: total,
    };
    for (let i = 0; i < barConfig.length; i++) {
      const bc = barConfig[i];
      if (bc) point[bc.dataKey] = gaPcts[i] ?? 0;
    }

    return point;
  });

  return { chartData, barConfig };
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  barConfig: BarConfig[];
  weekSnapshots: WeekSnapshot[];
}

function CustomTooltip({ active, payload, label, barConfig, weekSnapshots }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  const snap = weekSnapshots.find((w) => w.cycleLabel === label);
  const total = snap?.commitmentCount ?? 0;

  // Separate GA entries from the unaligned entry and the trend line
  const gaEntries = payload.filter((e) => e.dataKey.startsWith('ga_'));
  const unalignedEntry = payload.find((e) => e.dataKey === '__unaligned');

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3 min-w-[220px]">
      <p className="font-semibold text-on-surface mb-1 text-sm">{label}</p>
      <p className="text-xs text-on-surface-variant mb-2 tabular-nums">
        {total} commitment{total !== 1 ? 's' : ''} total
      </p>
      {gaEntries.map((entry) => {
        const bc = barConfig.find((b) => b.dataKey === entry.dataKey);
        const rawCount = total > 0 ? Math.round((entry.value / 100) * total) : 0;
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm mb-0.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-on-surface-variant truncate max-w-[120px]">
                {bc?.label ?? entry.dataKey}
              </span>
            </div>
            <span className="text-on-surface tabular-nums">
              {rawCount} · {entry.value.toFixed(1)}%
            </span>
          </div>
        );
      })}
      {unalignedEntry !== undefined && unalignedEntry.value > 0 && (
        <div className="flex items-center justify-between gap-4 text-sm mt-0.5 pt-1.5 border-t border-outline-variant/40">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: UNALIGNED_COLOR }}
            />
            <span className="text-on-surface-variant">Unaligned</span>
          </div>
          <span className="text-on-surface tabular-nums">
            {total > 0 ? Math.round((unalignedEntry.value / 100) * total) : 0} · {unalignedEntry.value.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

interface CustomLegendProps {
  barConfig: BarConfig[];
}

function CustomLegend({ barConfig }: CustomLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center mt-3">
      {barConfig.map(({ dataKey, label, color }) => (
        <div key={dataKey} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-on-surface-variant">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: UNALIGNED_COLOR }}
        />
        <span className="text-xs text-on-surface-variant">Unaligned</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-8 h-0.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: TREND_LINE_COLOR }}
        />
        <span className="text-xs text-on-surface-variant">Alignment %</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GrowthAreaProgressChartProps {
  progress: GrowthAreaProgress[];
  weekSnapshots: WeekSnapshot[];
}

export function GrowthAreaProgressChart({
  progress,
  weekSnapshots,
}: GrowthAreaProgressChartProps) {
  if (progress.length === 0 || weekSnapshots.length === 0) return null;

  const { chartData, barConfig } = buildChartData(progress, weekSnapshots);

  const weekCount = weekSnapshots.length;

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg text-on-surface">Where you've been growing</h2>
        <span className="text-small text-on-surface-variant">Last {weekCount} weeks</span>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-72">
          <p className="text-sm text-muted">No data available for this period.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            barCategoryGap="10%"
            margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="cycleLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
              tickFormatter={(v: number) => `${Math.round(v)}%`}
              width={45}
            />
            <Tooltip
              content={
                <CustomTooltip barConfig={barConfig} weekSnapshots={weekSnapshots} />
              }
            />
            <Legend content={<CustomLegend barConfig={barConfig} />} />

            {/* Stacked bars — one per growth area */}
            {barConfig.map((bc, idx) => (
              <Bar
                key={bc.dataKey}
                dataKey={bc.dataKey}
                name={bc.label}
                stackId="growth"
                fill={bc.color}
                stroke="none"
                {...(idx === barConfig.length - 1 && chartData.every((d) => (d['__unaligned'] as number) === 0)
                  ? { radius: [2, 2, 0, 0] as [number, number, number, number] }
                  : {})}
              />
            ))}

            {/* Unaligned segment — always on top of the stack */}
            <Bar
              dataKey="__unaligned"
              name="Unaligned"
              stackId="growth"
              fill={UNALIGNED_COLOR}
              stroke="none"
              radius={[2, 2, 0, 0]}
            />

            {/* Trend line — overall alignment % */}
            <Line
              type="monotone"
              dataKey="__alignmentPct"
              name="Alignment %"
              stroke={TREND_LINE_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
