/**
 * ExecutionTrendChart — 100% stacked bar (CHESS categories).
 *
 * The RC coverage overlay line has been removed because the only available proxy
 * (strategicPct) would duplicate the Strategic bar segment and misrepresent the metric.
 * TODO: add a dedicated per-cycle rallyCoveragePct field to the alignment trend endpoint
 * and restore the overlay line once the backend exposes real RC coverage data.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useAlignmentTrend, useCompletionTrend, useWeekNarrative } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AlignmentDataPoint, CompletionDataPoint } from '@/types';
import { SpeechBubble, generateWeekNarrative } from './SpeechBubble';
import type { SpeechBubbleMetric } from './SpeechBubble';
import { CHESS_MUTED } from '@/constants/chess-colors';

const BAR_CONFIG = [
  { key: 'strategicPct', label: 'Strategic', color: CHESS_MUTED.strategic },
  { key: 'operationalPct', label: 'Operational', color: CHESS_MUTED.operational },
  { key: 'defensivePct', label: 'Defensive', color: CHESS_MUTED.defensive },
  { key: 'capabilityBuildingPct', label: 'Capability Building', color: CHESS_MUTED.capability },
  { key: 'uncategorizedPct', label: 'Not Categorized', color: CHESS_MUTED.uncategorized },
] as const;

interface ChartDataPoint {
  cycleId: string;
  cycleLabel: string;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  uncategorizedPct: number;
  /** Completion rate from CompletionDataPoint (null if not joined) */
  completionRate: number | null;
  /** Carry-forward rate from CompletionDataPoint (null if not joined) */
  carryForwardRate: number | null;
}

function mapToChartData(
  points: AlignmentDataPoint[],
  completionPoints?: CompletionDataPoint[],
): ChartDataPoint[] {
  const completionByCycleId = new Map<string, CompletionDataPoint>();
  if (completionPoints) {
    for (const cp of completionPoints) {
      completionByCycleId.set(cp.cycleId, cp);
    }
  }

  return points.map((p) => {
    const categorizedSum =
      p.strategicPct + p.operationalPct + p.defensivePct + p.capabilityBuildingPct;
    const uncategorizedPct = Math.max(0, 100 - categorizedSum);
    const cp = completionByCycleId.get(p.cycleId);
    return {
      cycleId: p.cycleId,
      cycleLabel: p.cycleLabel,
      strategicPct: p.strategicPct,
      operationalPct: p.operationalPct,
      defensivePct: p.defensivePct,
      capabilityBuildingPct: p.capabilityBuildingPct,
      uncategorizedPct,
      completionRate: cp?.completionRate ?? null,
      carryForwardRate: cp?.carryForwardRate ?? null,
    };
  });
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3 min-w-[210px]">
      <p className="font-semibold text-on-surface mb-2 text-sm">{label}</p>
      {payload.map((entry) => {
        const config = BAR_CONFIG.find((c) => c.key === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-on-surface-variant">{config?.label ?? entry.dataKey}</span>
            </div>
            <span className="text-on-surface tabular-nums">{entry.value.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center mt-3">
      {BAR_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-on-surface-variant">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Active bar state ──────────────────────────────────────────────────────────

interface ActiveBar {
  /** Left offset in px relative to the chart container */
  x: number;
  /** Top of chart area in px, used to anchor the bubble above the bar */
  chartAreaTop: number;
  data: ChartDataPoint;
}

// ── Main component ────────────────────────────────────────────────────────────

interface ExecutionTrendChartProps {
  weekCount?: number;
  /** Optional vertical reference line markers: { cycleLabel, label }[] */
  eventMarkers?: Array<{ cycleLabel: string; label: string }>;
  /** When set, fetches data scoped to this manager's team */
  managerId?: string | undefined;
}

export function ExecutionTrendChart({
  weekCount = 26,
  eventMarkers,
  managerId,
}: ExecutionTrendChartProps) {
  const { data: trendData, isLoading, isError } = useAlignmentTrend(weekCount, managerId);
  const { data: completionData } = useCompletionTrend(weekCount, managerId);

  const chartData = trendData ? mapToChartData(trendData, completionData) : [];

  const [activeBar, setActiveBar] = useState<ActiveBar | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // LLM narrative for the clicked bar — fires only when a bar is selected.
  // While loading, the template fallback from generateWeekNarrative() is shown.
  const { data: llmNarrativeData } = useWeekNarrative(activeBar?.data.cycleId ?? null);

  // Dismiss on outside click (document level)
  useEffect(() => {
    if (!activeBar) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If click is inside the container or the bubble, ignore
      if (containerRef.current?.contains(target)) {
        // Still inside container — the bar click handler will update state
        return;
      }
      setActiveBar(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeBar]);

  // Recharts chart area margins must match the ComposedChart margin prop
  const CHART_MARGIN = { top: 8, right: 16, bottom: 0, left: 0 };
  // Y-axis width — must match the YAxis width prop below
  const Y_AXIS_WIDTH = 45;

  const handleBarClick = useCallback(
    (barData: ChartDataPoint, _index: number, event: React.MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      // clientX of the click gives us the bar's horizontal center
      const clickX = event.clientX - containerRect.left;

      // Recharts chart area begins after the Y-axis and left margin
      // We use clickX directly since that IS the center of the clicked bar.
      const bubbleX = clickX;

      // Chart area top = CHART_MARGIN.top (in px from top of ResponsiveContainer)
      // The ResponsiveContainer sits below the card header (~48px)
      const chartContainerTop =
        (containerRef.current.querySelector('.recharts-wrapper') as HTMLElement | null)
          ?.offsetTop ?? 0;
      const chartAreaTop = chartContainerTop + CHART_MARGIN.top;

      setActiveBar({
        x: bubbleX,
        chartAreaTop,
        data: barData,
      });
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="bg-surface-lowest border border-outline-variant rounded-lg p-6"
      style={{ position: 'relative' }}
    >

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg text-on-surface">Execution Trend</h2>
        <span className="text-small text-on-surface-variant">Last {weekCount} weeks</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-72">
          <LoadingSpinner size="md" label="Loading trend data..." />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-72">
          <p className="text-sm text-error">Failed to load execution trend data.</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-72">
          <p className="text-sm text-muted">No data available for this period.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              barCategoryGap="10%"
              margin={CHART_MARGIN}
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
                width={Y_AXIS_WIDTH}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />

              {/* Event markers */}
              {eventMarkers?.map((marker) => (
                <ReferenceLine
                  key={marker.cycleLabel}
                  x={marker.cycleLabel}
                  stroke="#94A3B8"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{
                    value: marker.label,
                    position: 'top',
                    fontSize: 10,
                    fill: 'var(--color-on-surface-variant)',
                  }}
                />
              ))}

              {/* Stacked bars — CHESS categories + uncategorized */}
              {BAR_CONFIG.map(({ key, color }, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="chess"
                  fill={color}
                  stroke="none"
                  {...(idx === BAR_CONFIG.length - 1 ? { radius: [2, 2, 0, 0] as [number, number, number, number] } : {})}
                  style={{ cursor: 'pointer' }}
                  onClick={(barData, index, event) =>
                    handleBarClick(barData as ChartDataPoint, index, event as React.MouseEvent)
                  }
                />
              ))}

            </ComposedChart>
          </ResponsiveContainer>

          {/* Speech bubble — rendered outside ResponsiveContainer but inside relative wrapper */}
          {activeBar && (() => {
            const { data } = activeBar;
            const completionPct =
              data.completionRate !== null
                ? `${data.completionRate.toFixed(0)}%`
                : '—';
            const carryPct =
              data.carryForwardRate !== null
                ? `${data.carryForwardRate.toFixed(0)}%`
                : '—';
            const metrics: SpeechBubbleMetric[] = [
              { label: 'Completion', value: completionPct },
              { label: 'Carry-Forward', value: carryPct },
            ];
            // Use LLM narrative when available; fall back to deterministic template while loading
            const narrative = llmNarrativeData?.narrative ?? generateWeekNarrative(data, chartData);
            return (
              <SpeechBubble
                anchorX={activeBar.x}
                anchorY={activeBar.chartAreaTop}
                position="above"
                weekLabel={data.cycleLabel}
                narrative={narrative}
                metrics={metrics}
                linkUrl={`/?cycleId=${data.cycleId}`}
                onDismiss={() => setActiveBar(null)}
              />
            );
          })()}
        </>
      )}
    </div>
  );
}
