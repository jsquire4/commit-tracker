import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAlignmentTrend, useObservatoryConfig } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AlignmentDataPoint } from '@/types';
import { CHESS_MUTED } from '@/constants/chess-colors';

const WEEK_OPTIONS = [4, 8, 12, 26, 52] as const;
type WeekOption = (typeof WEEK_OPTIONS)[number];

const AREA_CONFIG = [
  { key: 'strategicPct', label: 'Strategic', color: CHESS_MUTED.strategic },
  { key: 'operationalPct', label: 'Operational', color: CHESS_MUTED.operational },
  { key: 'defensivePct', label: 'Defensive', color: CHESS_MUTED.defensive },
  { key: 'capabilityBuildingPct', label: 'Capability Building', color: CHESS_MUTED.capability },
  { key: 'uncategorizedPct', label: 'Not Categorized', color: CHESS_MUTED.uncategorized },
] as const;

interface ChartDataPoint {
  cycleLabel: string;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  uncategorizedPct: number;
}

function mapToChartData(points: AlignmentDataPoint[]): ChartDataPoint[] {
  return points.map((p) => {
    const categorized = p.strategicPct + p.operationalPct + p.defensivePct + p.capabilityBuildingPct;
    return {
      cycleLabel: p.cycleLabel,
      strategicPct: p.strategicPct,
      operationalPct: p.operationalPct,
      defensivePct: p.defensivePct,
      capabilityBuildingPct: p.capabilityBuildingPct,
      uncategorizedPct: Math.max(0, 100 - categorized),
    };
  });
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3 min-w-[200px]">
      <p className="font-semibold text-on-surface mb-2 text-sm">{label}</p>
      {payload.map((entry) => {
        const config = AREA_CONFIG.find((c) => c.key === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-on-surface-variant">
              {config?.label ?? entry.dataKey}: {entry.value.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface AlignmentTrendChartProps {
  managerId?: string;
  weekCount?: number;
  showTarget?: boolean;
}

export function AlignmentTrendChart({
  managerId,
  weekCount: weekCountProp,
  showTarget = false,
}: AlignmentTrendChartProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<WeekOption>(12);

  // Dual-mode: prop-controlled (e.g., in drill-down) or self-controlled (e.g., standalone)
  const effectiveWeekCount = weekCountProp ?? selectedWeeks;

  const {
    data: trendData,
    isLoading: trendLoading,
    isError: trendError,
  } = useAlignmentTrend(effectiveWeekCount, managerId);

  const { data: config } = useObservatoryConfig();

  const showWeekSelector = weekCountProp === undefined;

  const targetPct = showTarget && config
    ? parseFloat(config.strategicAlignmentTarget)
    : null;

  const chartData = trendData ? mapToChartData(trendData) : [];

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">
          Work Type Distribution
        </h2>
        {showWeekSelector && (
          <select
            value={selectedWeeks}
            onChange={(e) => setSelectedWeeks(Number(e.target.value) as WeekOption)}
            className="text-sm border border-outline-variant rounded-md px-2 py-1 bg-surface-lowest text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} weeks
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {AREA_CONFIG.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-on-surface-variant">{label}</span>
          </div>
        ))}
        {targetPct !== null && !isNaN(targetPct) && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-t-2 border-dashed border-accent" />
            <span className="text-xs text-on-surface-variant">Target</span>
          </div>
        )}
      </div>

      {/* Chart body */}
      {trendLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="md" label="Loading trend data..." />
        </div>
      ) : trendError ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-error">
            Failed to load alignment trend data.
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
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
            <Tooltip content={<CustomTooltip />} />
            {targetPct !== null && !isNaN(targetPct) && (
              <ReferenceLine
                y={targetPct}
                stroke="#036A6A"
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
            )}
            {AREA_CONFIG.map(({ key, color }) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="alignment"
                stroke={color}
                fill={color}
                fillOpacity={0.7}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
