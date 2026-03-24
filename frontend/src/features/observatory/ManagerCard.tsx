import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { CHESS_ACCENT } from '@/constants/chess-colors';
import type { OrgUnitHealth } from '@/types/observatory.types';
import {
  HEALTH_COLORS,
  HEALTH_BG,
  HEALTH_BORDER,
  HEALTH_TEXT,
  trendArrow,
  trendArrowColor,
  firstName,
} from './health.utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ManagerCardProps {
  unit: OrgUnitHealth;
  index: number;
  onClick: () => void;
  sparklineData: { value: number }[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ManagerCard({ unit, index, onClick, sparklineData }: ManagerCardProps) {
  const gradeColor = HEALTH_COLORS[unit.grade];
  const isRed = unit.grade === 'RED';

  // CHESS bar: full 4-category breakdown
  const strategicW = unit.strategicAlignmentPct;
  const operationalW = unit.operationalPct;
  const defensiveW = unit.defensivePct;
  const capabilityW = unit.capabilityBuildingPct;
  const categorizedTotal = strategicW + operationalW + defensiveW + capabilityW;
  const uncategorizedW = Math.max(0, 100 - categorizedTotal);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex flex-col gap-2 p-4 rounded-lg border-l-4 border transition-all duration-300',
        'bg-surface-lowest backdrop-blur border-outline-variant hover:border-outline-variant',
        'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer text-left',
        HEALTH_BORDER[unit.grade],
        HEALTH_BG[unit.grade],
        isRed ? 'animate-pulse-subtle' : '',
      ].join(' ')}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'backwards',
      }}
      aria-label={`View ${unit.managerName}'s team — ${String(Math.round(unit.rallyCoveragePct))}% rally cry coverage, grade ${unit.grade}`}
    >
      {/* Header row: name + trend */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-on-surface truncate max-w-[120px]">
          {firstName(unit.managerName)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums text-on-surface">
            {Math.round(unit.rallyCoveragePct)}%
          </span>
          <span className={`text-sm font-bold ${trendArrowColor(unit.trendDirection)}`}>
            {trendArrow(unit.trendDirection)}
          </span>
        </div>
      </div>

      {/* CHESS distribution bar: 4-category breakdown */}
      <div className="w-full h-2 rounded-full bg-outline-variant overflow-hidden flex" title={`Strategic ${Math.round(strategicW)}% · Operational ${Math.round(operationalW)}% · Defensive ${Math.round(defensiveW)}% · Capability ${Math.round(capabilityW)}%`}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(strategicW)}%`, backgroundColor: CHESS_ACCENT.strategic }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(operationalW)}%`, backgroundColor: CHESS_ACCENT.operational }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(defensiveW)}%`, backgroundColor: CHESS_ACCENT.defensive }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(capabilityW)}%`, backgroundColor: CHESS_ACCENT.capability }}
        />
        {uncategorizedW > 0 && (
          <div
            className="h-full transition-all duration-500 bg-surface-container"
            style={{ width: `${String(uncategorizedW)}%` }}
          />
        )}
      </div>

      {/* Bottom row: grade label + sparkline */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${HEALTH_TEXT[unit.grade]}`}
        >
          {unit.grade}
        </span>

        {/* Sparkline trend */}
        {sparklineData.length > 1 && (
          <div className="w-16 h-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={gradeColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-accent/30 transition-colors pointer-events-none" />
    </button>
  );
}
