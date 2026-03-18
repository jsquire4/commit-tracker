import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Commitment } from '@/types';

interface DarkWorkAttributionProps {
  commitments: Commitment[];
}

const CATEGORY_COLORS: Record<string, string> = {
  STRATEGIC: '#2563EB',
  OPERATIONAL: '#6B7280',
  DEFENSIVE: '#DC2626',
  CAPABILITY_BUILDING: '#059669',
};

const CATEGORY_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  OPERATIONAL: 'Operational',
  DEFENSIVE: 'Defensive',
  CAPABILITY_BUILDING: 'Capability',
};

const CATEGORY_KEYS = ['STRATEGIC', 'OPERATIONAL', 'DEFENSIVE', 'CAPABILITY_BUILDING'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

interface AttributionRow {
  name: string;
  STRATEGIC_MANAGER: number;
  OPERATIONAL_MANAGER: number;
  DEFENSIVE_MANAGER: number;
  CAPABILITY_BUILDING_MANAGER: number;
  STRATEGIC_SELF: number;
  OPERATIONAL_SELF: number;
  DEFENSIVE_SELF: number;
  CAPABILITY_BUILDING_SELF: number;
}

function buildAttributionData(commitments: Commitment[]): AttributionRow[] {
  const managerAssigned = { STRATEGIC: 0, OPERATIONAL: 0, DEFENSIVE: 0, CAPABILITY_BUILDING: 0 };
  const selfDirected = { STRATEGIC: 0, OPERATIONAL: 0, DEFENSIVE: 0, CAPABILITY_BUILDING: 0 };

  for (const c of commitments) {
    const cat = (c.chessCategoryName ?? 'OPERATIONAL') as CategoryKey;
    const key = CATEGORY_KEYS.includes(cat) ? cat : 'OPERATIONAL';
    if (c.attribution.kind === 'ASSIGNED_BY') {
      managerAssigned[key] = (managerAssigned[key] ?? 0) + 1;
    } else {
      selfDirected[key] = (selfDirected[key] ?? 0) + 1;
    }
  }

  return [
    {
      name: 'Manager-Assigned',
      STRATEGIC_MANAGER: managerAssigned.STRATEGIC,
      OPERATIONAL_MANAGER: managerAssigned.OPERATIONAL,
      DEFENSIVE_MANAGER: managerAssigned.DEFENSIVE,
      CAPABILITY_BUILDING_MANAGER: managerAssigned.CAPABILITY_BUILDING,
      STRATEGIC_SELF: 0,
      OPERATIONAL_SELF: 0,
      DEFENSIVE_SELF: 0,
      CAPABILITY_BUILDING_SELF: 0,
    },
    {
      name: 'Self-Directed',
      STRATEGIC_MANAGER: 0,
      OPERATIONAL_MANAGER: 0,
      DEFENSIVE_MANAGER: 0,
      CAPABILITY_BUILDING_MANAGER: 0,
      STRATEGIC_SELF: selfDirected.STRATEGIC,
      OPERATIONAL_SELF: selfDirected.OPERATIONAL,
      DEFENSIVE_SELF: selfDirected.DEFENSIVE,
      CAPABILITY_BUILDING_SELF: selfDirected.CAPABILITY_BUILDING,
    },
  ];
}

export function DarkWorkAttribution({ commitments }: DarkWorkAttributionProps) {
  const data = buildAttributionData(commitments);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Dark Work Attribution
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Manager-assigned vs self-directed commitments by chess category
      </p>

      <div className="flex flex-wrap gap-4 mb-4">
        {CATEGORY_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: CATEGORY_COLORS[key] }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">{CATEGORY_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 112 }}
          barCategoryGap="30%"
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
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              const label = name.replace(/_MANAGER|_SELF/, '');
              return [value, CATEGORY_LABELS[label] ?? label];
            }}
            contentStyle={{
              backgroundColor: 'var(--color-gray-900, #111827)',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F9FAFB', fontWeight: 600 }}
            itemStyle={{ color: '#D1D5DB' }}
          />
          <Legend wrapperStyle={{ display: 'none' }} />
          {/* Manager-Assigned bars */}
          {CATEGORY_KEYS.map((key, i) => (
            <Bar
              key={`${key}_MANAGER`}
              dataKey={`${key}_MANAGER`}
              stackId="attribution"
              fill={CATEGORY_COLORS[key]}
              opacity={0.9}
              {...(i === CATEGORY_KEYS.length - 1 ? { radius: [0, 4, 4, 0] as [number, number, number, number] } : {})}
            />
          ))}
          {/* Self-Directed bars */}
          {CATEGORY_KEYS.map((key, i) => (
            <Bar
              key={`${key}_SELF`}
              dataKey={`${key}_SELF`}
              stackId="attribution"
              fill={CATEGORY_COLORS[key]}
              opacity={0.6}
              {...(i === CATEGORY_KEYS.length - 1 ? { radius: [0, 4, 4, 0] as [number, number, number, number] } : {})}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
