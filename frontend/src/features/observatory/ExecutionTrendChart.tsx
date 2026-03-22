/**
 * ExecutionTrendChart — 100% stacked bar (CHESS categories) + rally cry coverage line.
 *
 * Rally cry coverage is approximated per-cycle using strategicPct from the alignment
 * trend endpoint. A dedicated per-cycle rallyCoveragePct field can replace this when
 * the backend exposes it.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useAlignmentTrend, useCompletionTrend } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AlignmentDataPoint, CompletionDataPoint } from '@/types';
import { SpeechBubble, generateWeekNarrative } from './SpeechBubble';
import type { SpeechBubbleMetric } from './SpeechBubble';

// Muted CHESS palette as specified
const CHESS_COLORS = {
  strategic: '#5B7FA6',
  operational: '#8E9AA0',
  defensive: '#B07070',
  capability: '#6B9F7F',
  uncategorized: '#E2E2E0',
} as const;

const RC_LINE_COLOR = '#036A6A';

const BAR_CONFIG = [
  { key: 'strategicPct', label: 'Strategic', color: CHESS_COLORS.strategic },
  { key: 'operationalPct', label: 'Operational', color: CHESS_COLORS.operational },
  { key: 'defensivePct', label: 'Defensive', color: CHESS_COLORS.defensive },
  { key: 'capabilityBuildingPct', label: 'Capability Building', color: CHESS_COLORS.capability },
  { key: 'uncategorizedPct', label: 'Not Categorized', color: CHESS_COLORS.uncategorized },
] as const;

interface ChartDataPoint {
  cycleId: string;
  cycleLabel: string;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  uncategorizedPct: number;
  /** Rally cry coverage line — currently proxied from strategicPct */
  rcCoverage: number;
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
      rcCoverage: p.strategicPct,
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

  const bars = payload.filter((e) => e.dataKey !== 'rcCoverage');
  const rcEntry = payload.find((e) => e.dataKey === 'rcCoverage');

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3 min-w-[210px]">
      <p className="font-semibold text-on-surface mb-2 text-sm">{label}</p>
      {bars.map((entry) => {
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
      {rcEntry !== undefined && (
        <div className="flex items-center justify-between gap-4 text-sm mt-2 pt-2 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-0.5 flex-shrink-0"
              style={{ backgroundColor: RC_LINE_COLOR }}
            />
            <span className="text-on-surface-variant">RC Coverage</span>
          </div>
          <span className="text-on-surface tabular-nums">{rcEntry.value.toFixed(1)}%</span>
        </div>
      )}
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
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-5 h-0.5 flex-shrink-0"
          style={{ backgroundColor: RC_LINE_COLOR }}
        />
        <span className="text-xs text-on-surface-variant">Rally Cry Coverage</span>
      </div>
    </div>
  );
}

// ── AI narrative generator ────────────────────────────────────────────────────

/**
 * Chart-specific wrapper around the shared generateWeekNarrative helper.
 * Delegates to the shared util while keeping the internal call-site unchanged.
 */
function generateNarrative(data: ChartDataPoint, allData: ChartDataPoint[]): string {
  return generateWeekNarrative(data, allData);
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
}

export function ExecutionTrendChart({
  weekCount = 26,
  eventMarkers,
}: ExecutionTrendChartProps) {
  const { data: trendData, isLoading, isError } = useAlignmentTrend(weekCount);
  const { data: completionData } = useCompletionTrend(weekCount);

  const chartData = trendData ? mapToChartData(trendData, completionData) : [];

  const [activeBar, setActiveBar] = useState<ActiveBar | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dismiss when clicking outside the bubble
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeBar === null) return;
      // If the click target is inside the bubble itself, don't dismiss
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"]')) return;
    },
    [activeBar],
  );

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
  const Y_AXIS_WIDTH = 40;

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
      onClick={handleContainerClick}
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
                tick={{ fontSize: 11, fill: '#5A605E' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#5A605E' }}
                tickFormatter={(v: number) => `${v}%`}
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
                    fill: '#5A605E',
                  }}
                />
              ))}

              {/* Stacked bars — CHESS categories + uncategorized */}
              {BAR_CONFIG.map(({ key, color }, idx) =>
                idx === BAR_CONFIG.length - 1 ? (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="chess"
                    fill={color}
                    stroke="none"
                    radius={[2, 2, 0, 0]}
                    style={{ cursor: 'pointer' }}
                    onClick={(barData, index, event) =>
                      handleBarClick(barData as ChartDataPoint, index, event as React.MouseEvent)
                    }
                  />
                ) : (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="chess"
                    fill={color}
                    stroke="none"
                    style={{ cursor: 'pointer' }}
                    onClick={(barData, index, event) =>
                      handleBarClick(barData as ChartDataPoint, index, event as React.MouseEvent)
                    }
                  />
                )
              )}

              {/* Rally cry coverage line overlay */}
              <Line
                type="monotone"
                dataKey="rcCoverage"
                stroke={RC_LINE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: RC_LINE_COLOR }}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Speech bubble — rendered outside ResponsiveContainer but inside relative wrapper */}
          {activeBar && (() => {
            const { data } = activeBar;
            const rcPct = `${data.rcCoverage.toFixed(0)}%`;
            const completionPct =
              data.completionRate !== null
                ? `${(data.completionRate * 100).toFixed(0)}%`
                : '—';
            const carryPct =
              data.carryForwardRate !== null
                ? `${(data.carryForwardRate * 100).toFixed(0)}%`
                : '—';
            const metrics: SpeechBubbleMetric[] = [
              { label: 'RC Coverage', value: rcPct },
              { label: 'Completion', value: completionPct },
              { label: 'Carry-Forward', value: carryPct },
            ];
            return (
              <SpeechBubble
                anchorX={activeBar.x}
                anchorY={activeBar.chartAreaTop}
                position="above"
                weekLabel={data.cycleLabel}
                narrative={generateNarrative(data, chartData)}
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
