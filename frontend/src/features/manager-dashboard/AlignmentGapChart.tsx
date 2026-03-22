import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { AlignmentSignalResponse, MemberAlignment } from '@/types';
import { CHESS_ACCENT } from '@/constants/chess-colors';
import { CHESS_LABELS } from '@/constants/chess-colors';

const CATEGORY_COLORS: Record<string, string> = {
  STRATEGIC: CHESS_ACCENT.strategic,
  OPERATIONAL: CHESS_ACCENT.operational,
  DEFENSIVE: CHESS_ACCENT.defensive,
  CAPABILITY_BUILDING: CHESS_ACCENT.capability,
  UNLINKED: '#94a3b8',
};

const CATEGORY_LABELS: Record<string, string> = {
  ...CHESS_LABELS,
  UNLINKED: 'Unlinked',
};

const CATEGORY_KEYS = ['STRATEGIC', 'OPERATIONAL', 'DEFENSIVE', 'CAPABILITY_BUILDING', 'UNLINKED'] as const;

interface ChartRow {
  name: string;
  userId: string | null;
  isTeamTotal: boolean;
  STRATEGIC: number;
  OPERATIONAL: number;
  DEFENSIVE: number;
  CAPABILITY_BUILDING: number;
  UNLINKED: number;
  totalCommitments: number;
}

interface AlignmentGapChartProps {
  aggregate: AlignmentSignalResponse;
  members: MemberAlignment[];
  onSegmentClick?: (userId: string | null, category: string) => void;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  payload: ChartRow;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg shadow-whisper p-3 min-w-[220px]">
      <p className="font-semibold text-on-surface mb-2">{label}</p>
      {payload.map((entry) => {
        const key = entry.dataKey;
        const pct =
          row.totalCommitments > 0
            ? Math.round((entry.value / row.totalCommitments) * 100)
            : 0;
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[key] ?? '#ccc' }}
            />
            <span className="text-on-surface-variant">
              {CATEGORY_LABELS[key] ?? key}: {pct}% ({entry.value} of {row.totalCommitments})
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildChartData(
  aggregate: AlignmentSignalResponse,
  members: MemberAlignment[]
): ChartRow[] {
  const teamCategorized = Object.values(aggregate.distribution).reduce(
    (sum, d) => sum + d.count,
    0
  );
  const teamTotal: ChartRow = {
    name: 'Team Total',
    userId: null,
    isTeamTotal: true,
    STRATEGIC: aggregate.distribution['STRATEGIC']?.count ?? 0,
    OPERATIONAL: aggregate.distribution['OPERATIONAL']?.count ?? 0,
    DEFENSIVE: aggregate.distribution['DEFENSIVE']?.count ?? 0,
    CAPABILITY_BUILDING: aggregate.distribution['CAPABILITY_BUILDING']?.count ?? 0,
    UNLINKED: aggregate.unlinkedCount,
    totalCommitments: teamCategorized + aggregate.unlinkedCount,
  };

  const memberRows: ChartRow[] = members.map((m) => {
    const memberCategorized = Object.values(m.distribution).reduce((sum, d) => sum + d.count, 0);
    return {
      name: m.displayName,
      userId: m.userId,
      isTeamTotal: false,
      STRATEGIC: m.distribution['STRATEGIC']?.count ?? 0,
      OPERATIONAL: m.distribution['OPERATIONAL']?.count ?? 0,
      DEFENSIVE: m.distribution['DEFENSIVE']?.count ?? 0,
      CAPABILITY_BUILDING: m.distribution['CAPABILITY_BUILDING']?.count ?? 0,
      UNLINKED: m.unlinkedCount,
      totalCommitments: memberCategorized + m.unlinkedCount,
    };
  });

  return [teamTotal, ...memberRows];
}

export function AlignmentGapChart({
  aggregate,
  members,
  onSegmentClick,
}: AlignmentGapChartProps) {
  const data = buildChartData(aggregate, members ?? []);

  const barHeight = 36;
  const teamTotalHeight = 52;
  const chartHeight = Math.max(
    300,
    teamTotalHeight + data.length * barHeight + 40
  );

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-1">
        Alignment Gap
      </h2>
      <p className="text-sm text-muted mb-4">
        Commitment distribution by chess category across the team
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {CATEGORY_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: CATEGORY_COLORS[key] }}
            />
            <span className="text-xs text-on-surface-variant">{CATEGORY_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 96 }}
          barCategoryGap="20%"
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tickLine={false}
            axisLine={false}
            tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
              const isTotal = payload.value === 'Team Total';
              return (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fill={isTotal ? '#1D4ED8' : '#374151'}
                  fontWeight={isTotal ? 700 : 400}
                  fontSize={isTotal ? 13 : 12}
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {CATEGORY_KEYS.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="alignment"
              fill={CATEGORY_COLORS[key]}
              cursor={onSegmentClick ? 'pointer' : 'default'}
              {...(key === 'UNLINKED' ? { radius: [0, 4, 4, 0] as [number, number, number, number] } : {})}
              onClick={(entry: ChartRow) => {
                if (onSegmentClick) {
                  onSegmentClick(entry.userId, key);
                }
              }}
            >
              {data.map((row) => (
                <Cell
                  key={row.userId ?? 'team'}
                  fill={CATEGORY_COLORS[key]}
                  opacity={row.isTeamTotal ? 1 : 0.8}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
