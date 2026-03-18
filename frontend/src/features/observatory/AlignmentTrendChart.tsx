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

const WEEK_OPTIONS = [4, 8, 12, 26, 52] as const;
type WeekOption = (typeof WEEK_OPTIONS)[number];

const AREA_CONFIG = [
  { key: 'strategicPct', label: 'Strategic', color: '#2563EB' },
  { key: 'operationalPct', label: 'Operational', color: '#6B7280' },
  { key: 'defensivePct', label: 'Defensive', color: '#DC2626' },
  { key: 'capabilityBuildingPct', label: 'Capability Building', color: '#059669' },
] as const;

interface ChartDataPoint {
  cycleLabel: string;
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
}

function mapToChartData(points: AlignmentDataPoint[]): ChartDataPoint[] {
  return points.map((p) => ({
    cycleLabel: p.cycleLabel,
    strategicPct: p.strategicPct,
    operationalPct: p.operationalPct,
    defensivePct: p.defensivePct,
    capabilityBuildingPct: p.capabilityBuildingPct,
  }));
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">{label}</p>
      {payload.map((entry) => {
        const config = AREA_CONFIG.find((c) => c.key === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
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

  // Use prop if provided, otherwise use local state
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Alignment Trend
        </h2>
        {showWeekSelector && (
          <select
            value={selectedWeeks}
            onChange={(e) => setSelectedWeeks(Number(e.target.value) as WeekOption)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        ))}
        {targetPct !== null && !isNaN(targetPct) && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-t-2 border-dashed border-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Target</span>
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
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load alignment trend data.
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
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
              tick={{ fontSize: 11, fill: '#6B7280' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            {targetPct !== null && !isNaN(targetPct) && (
              <ReferenceLine
                y={targetPct}
                stroke="#2563EB"
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
