import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CompletionDataPoint } from '@/types';

interface CompletionTrendChartProps {
  data: CompletionDataPoint[];
}

interface TooltipPayload {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3 min-w-[180px]">
      <p className="font-semibold text-on-surface mb-1 text-sm">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-on-surface-variant">
            {entry.dataKey === 'completionRate' ? 'Completion' : 'Carry-Forward'}: {(entry.value * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-1">
        Completion Trend
      </h2>
      <p className="text-sm text-muted mb-4">
        Week-over-week completion and carry-forward rates
      </p>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#036A6A' }} />
          <span className="text-xs text-on-surface-variant">Completion Rate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: '#C2860B' }} />
          <span className="text-xs text-on-surface-variant">Carry-Forward Rate</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#036A6A" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#036A6A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="carryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C2860B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C2860B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="cycleLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#5A605E' }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#5A605E' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="completionRate"
            stroke="#036A6A"
            strokeWidth={2}
            fill="url(#completionGrad)"
          />
          <Area
            type="monotone"
            dataKey="carryForwardRate"
            stroke="#C2860B"
            strokeWidth={2}
            fill="url(#carryGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
