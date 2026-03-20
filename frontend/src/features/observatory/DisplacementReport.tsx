import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DisplacementSummary, CategoryCount } from '@/types';

interface DisplacementReportProps {
  summary: DisplacementSummary;
}

const CATEGORY_LABELS: Record<string, string> = {
  MANAGER_REASSIGNED: 'Manager Reassigned',
  PRODUCTION_EMERGENCY: 'Production Emergency',
  RESOURCE_BLOCKED: 'Resource Blocked',
  SCOPE_CHANGE: 'Scope Change',
  DEPRIORITIZED: 'Deprioritized',
  EXTERNAL_DEPENDENCY: 'External Dependency',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  MANAGER_REASSIGNED: '#036A6A',
  PRODUCTION_EMERGENCY: '#9F403D',
  RESOURCE_BLOCKED: '#C2860B',
  SCOPE_CHANGE: '#455F87',
  DEPRIORITIZED: '#5A605E',
  EXTERNAL_DEPENDENCY: '#94A3B8',
  OTHER: '#E8E8E6',
};

interface TooltipPayload {
  payload: CategoryCount;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3">
      <p className="font-semibold text-on-surface text-sm mb-1">
        {CATEGORY_LABELS[row.category] ?? row.category}
      </p>
      <p className="text-sm text-on-surface-variant">
        {row.count} displacement{row.count !== 1 ? 's' : ''} ({row.percentage.toFixed(1)}%)
      </p>
    </div>
  );
}

export function DisplacementReport({ summary }: DisplacementReportProps) {
  const chartData = summary.byCategory.map((cat) => ({
    ...cat,
    label: CATEGORY_LABELS[cat.category] ?? cat.category,
  }));

  const clusters = summary.noteClusters ?? [];

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-1">
        Displacement Patterns
      </h2>
      <p className="text-sm text-muted mb-4">
        {summary.totalDisplacements} total displacement{summary.totalDisplacements !== 1 ? 's' : ''} across reporting period
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Bar chart by category */}
        <div>
          <h3 className="text-sm font-medium text-on-surface-variant mb-3">By Category</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">
              No displacement data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 120 }}
                barCategoryGap="20%"
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#5A605E' }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={112}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#5A605E' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] ?? '#94A3B8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right: Note clusters */}
        <div>
          <h3 className="text-sm font-medium text-on-surface-variant mb-3">Note Clusters</h3>
          {clusters.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">
              No note clusters identified
            </div>
          ) : (
            <ul className="space-y-4">
              {clusters.map((cluster, idx) => (
                <li key={idx} className="border-l-2 border-outline-variant pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-on-surface">
                      {cluster.theme}
                    </span>
                    <span className="text-xs text-muted">
                      ({cluster.count})
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {cluster.representativeNotes.slice(0, 3).map((note, ni) => (
                      <li
                        key={ni}
                        className="text-xs italic text-on-surface-variant ml-2"
                      >
                        "{note}"
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
