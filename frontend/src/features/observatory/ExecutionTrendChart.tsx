/**
 * ExecutionTrendChart — 100% stacked bar (CHESS categories) + rally cry coverage line.
 *
 * Rally cry coverage is approximated per-cycle using strategicPct from the alignment
 * trend endpoint. A dedicated per-cycle rallyCoveragePct field can replace this when
 * the backend exposes it.
 */
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
import { useAlignmentTrend } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AlignmentDataPoint } from '@/types';

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
  cycleLabel: string;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  uncategorizedPct: number;
  /** Rally cry coverage line — currently proxied from strategicPct */
  rcCoverage: number;
}

function mapToChartData(points: AlignmentDataPoint[]): ChartDataPoint[] {
  return points.map((p) => {
    const categorizedSum =
      p.strategicPct + p.operationalPct + p.defensivePct + p.capabilityBuildingPct;
    const uncategorizedPct = Math.max(0, 100 - categorizedSum);
    return {
      cycleLabel: p.cycleLabel,
      strategicPct: p.strategicPct,
      operationalPct: p.operationalPct,
      defensivePct: p.defensivePct,
      capabilityBuildingPct: p.capabilityBuildingPct,
      uncategorizedPct,
      rcCoverage: p.strategicPct,
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

  const chartData = trendData ? mapToChartData(trendData) : [];

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
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
              margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
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
                width={40}
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
                  />
                ) : (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="chess"
                    fill={color}
                    stroke="none"
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
        </>
      )}
    </div>
  );
}
