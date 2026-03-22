import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useExecutiveHealth, useDriftReport } from '@/hooks/useObservatory';
import { getAlignmentTrend } from '@/api/observatory.api';
import { getOrgTree } from '@/api/users.api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CHESS_ACCENT } from '@/constants/chess-colors';
import { DIRECTOR_AND_ABOVE } from '@/constants/roles';
import type {
  ExecutiveHealthResponse,
  OrgUnitHealth,
  DriftSignal,
  HealthGrade,
} from '@/types/observatory.types';
import type { User } from '@/types/user.types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const HEALTH_COLORS: Record<HealthGrade, string> = {
  GREEN: '#036A6A',
  YELLOW: '#C2860B',
  RED: '#9F403D',
};

const HEALTH_BG: Record<HealthGrade, string> = {
  GREEN: 'bg-accent/[0.08]',
  YELLOW: 'bg-warning/[0.08]',
  RED: 'bg-error/[0.08]',
};

const HEALTH_BORDER: Record<HealthGrade, string> = {
  GREEN: 'border-l-accent',
  YELLOW: 'border-l-warning',
  RED: 'border-l-error',
};

const HEALTH_GLOW: Record<HealthGrade, string> = {
  GREEN: '',
  YELLOW: '',
  RED: '',
};

const HEALTH_TEXT: Record<HealthGrade, string> = {
  GREEN: 'text-accent',
  YELLOW: 'text-warning',
  RED: 'text-error',
};

const CHESS_COLORS = CHESS_ACCENT;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function trendArrow(direction: string): string {
  switch (direction.toUpperCase()) {
    case 'IMPROVING':
      return '\u2191';
    case 'DECLINING':
      return '\u2193';
    default:
      return '\u2192';
  }
}

function trendArrowColor(direction: string): string {
  switch (direction.toUpperCase()) {
    case 'IMPROVING':
      return 'text-accent';
    case 'DECLINING':
      return 'text-error';
    default:
      return 'text-muted';
  }
}

// TODO: thresholds (50/30) are hardcoded here but are configurable on the backend via
// ObservatoryConfig.strategicAlignmentTarget and misalignmentWarningPct. These should
// be read from the /api/v1/observatory/config endpoint so they stay in sync.
function gradeFromAlignment(pct: number): HealthGrade {
  if (pct >= 50) return 'GREEN';
  if (pct >= 30) return 'YELLOW';
  return 'RED';
}

function formatWeekLabel(computedAt: string): string {
  try {
    const d = new Date(computedAt);
    // Find Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } catch {
    return '';
  }
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

// ─── VP Grouping ────────────────────────────────────────────────────────────────

interface VPGroup {
  vpId: string;
  vpName: string;
  vpGrade: HealthGrade;
  vpTrend: string;
  vpAlignment: number;
  managers: OrgUnitHealth[];
}

function buildVPGroups(
  units: OrgUnitHealth[],
  orgTree: User[] | undefined,
): VPGroup[] {
  if (!orgTree || orgTree.length === 0) {
    // Fallback: group VPs as headers, and directors/managers flat underneath
    const vps = units.filter((u) => u.role === 'VP');
    const nonVps = units.filter((u) => u.role !== 'VP' && u.role !== 'EXECUTIVE');

    if (vps.length === 0) {
      // No VPs, show all as a single ungrouped section
      return [{
        vpId: '__all__',
        vpName: 'All Teams',
        vpGrade: nonVps.length > 0
          ? gradeFromAlignment(nonVps.reduce((s, u) => s + u.strategicAlignmentPct, 0) / nonVps.length)
          : 'GREEN',
        vpTrend: 'FLAT',
        vpAlignment: nonVps.length > 0
          ? nonVps.reduce((s, u) => s + u.strategicAlignmentPct, 0) / nonVps.length
          : 0,
        managers: nonVps,
      }];
    }

    // If we have VPs but no org tree, show each VP as a header but don't
    // duplicate managers — split non-VPs evenly by index as a rough grouping,
    // or just show them all in one ungrouped section if we can't determine hierarchy.
    // Better to show one honest "All Teams" than duplicated data.
    const allManagers = [...nonVps].sort((a, b) => a.strategicAlignmentPct - b.strategicAlignmentPct);
    const result: VPGroup[] = vps.map((vp) => ({
      vpId: vp.managerId,
      vpName: vp.managerName,
      vpGrade: vp.grade,
      vpTrend: vp.trendDirection,
      vpAlignment: vp.strategicAlignmentPct,
      managers: [], // Can't assign without org tree
    }));
    // Put all non-VP managers in a single "All Teams" group
    if (allManagers.length > 0) {
      const avg = allManagers.reduce((s, u) => s + u.strategicAlignmentPct, 0) / allManagers.length;
      result.push({
        vpId: '__all_teams__',
        vpName: 'All Teams',
        vpGrade: gradeFromAlignment(avg),
        vpTrend: 'FLAT',
        vpAlignment: avg,
        managers: allManagers,
      });
    }
    // Remove empty VP groups
    return result.filter((g) => g.managers.length > 0 || g.vpId.startsWith('__'));
  }

  // Build a lookup: userId -> User
  const userMap = new Map<string, User>();
  for (const u of orgTree) {
    userMap.set(u.id, u);
  }

  // Build a lookup: managerId -> OrgUnitHealth
  const unitMap = new Map<string, OrgUnitHealth>();
  for (const u of units) {
    unitMap.set(u.managerId, u);
  }

  // For each unit, walk up the org tree to find its VP
  function findVP(userId: string): User | null {
    const visited = new Set<string>();
    let current = userMap.get(userId);
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (current.role === 'VP') return current;
      if (!current.reportsTo) break;
      current = userMap.get(current.reportsTo);
    }
    return null;
  }

  // Group non-VP, non-Executive units under their VP
  const vpGroupMap = new Map<string, { vp: User; managers: OrgUnitHealth[] }>();
  const ungrouped: OrgUnitHealth[] = [];

  for (const unit of units) {
    if (unit.role === 'VP' || unit.role === 'EXECUTIVE') continue;

    const vp = findVP(unit.managerId);
    if (vp) {
      if (!vpGroupMap.has(vp.id)) {
        vpGroupMap.set(vp.id, { vp, managers: [] });
      }
      vpGroupMap.get(vp.id)!.managers.push(unit);
    } else {
      ungrouped.push(unit);
    }
  }

  const groups: VPGroup[] = [];

  for (const [vpId, { vp, managers }] of vpGroupMap) {
    const vpUnit = unitMap.get(vpId);
    const avgAlignment = managers.length > 0
      ? managers.reduce((s, m) => s + m.strategicAlignmentPct, 0) / managers.length
      : (vpUnit?.strategicAlignmentPct ?? 0);

    groups.push({
      vpId,
      vpName: vp.displayName,
      vpGrade: vpUnit?.grade ?? gradeFromAlignment(avgAlignment),
      vpTrend: vpUnit?.trendDirection ?? 'FLAT',
      vpAlignment: vpUnit?.strategicAlignmentPct ?? avgAlignment,
      managers: managers.sort((a, b) => a.strategicAlignmentPct - b.strategicAlignmentPct),
    });
  }

  if (ungrouped.length > 0) {
    const avg = ungrouped.reduce((s, u) => s + u.strategicAlignmentPct, 0) / ungrouped.length;
    groups.push({
      vpId: '__ungrouped__',
      vpName: 'Other Teams',
      vpGrade: gradeFromAlignment(avg),
      vpTrend: 'FLAT',
      vpAlignment: avg,
      managers: ungrouped.sort((a, b) => a.strategicAlignmentPct - b.strategicAlignmentPct),
    });
  }

  // Sort groups: RED first, then YELLOW, then GREEN
  const gradeOrder: Record<HealthGrade, number> = { RED: 0, YELLOW: 1, GREEN: 2 };
  groups.sort((a, b) => gradeOrder[a.vpGrade] - gradeOrder[b.vpGrade]);

  return groups;
}

// ─── Alert Generation ───────────────────────────────────────────────────────────

interface Alert {
  id: string;
  icon: 'drift' | 'red' | 'declining';
  message: string;
}

function generateAlerts(
  units: OrgUnitHealth[],
  driftSignals: DriftSignal[],
): Alert[] {
  const alerts: Alert[] = [];

  // RED-graded teams
  for (const unit of units) {
    if (unit.grade === 'RED') {
      const weekNote = unit.weeksTrending > 1
        ? `, trending down for ${String(unit.weeksTrending)} weeks`
        : '';
      alerts.push({
        id: `red-${unit.managerId}`,
        icon: 'red',
        message: `${unit.managerName}'s team: ${String(Math.round(unit.strategicAlignmentPct))}% strategic alignment${weekNote}`,
      });
    }
  }

  // Sustained or structural drift signals
  for (const signal of driftSignals) {
    if (signal.severity === 'SUSTAINED' || signal.severity === 'STRUCTURAL') {
      alerts.push({
        id: `drift-${signal.unitId}-${signal.metric}`,
        icon: 'drift',
        message: `${signal.unitName}: ${signal.severity.toLowerCase()} ${signal.metric.toLowerCase()} drift (${String(signal.weekCount)} weeks)`,
      });
    }
  }

  // Declining teams that aren't already RED
  for (const unit of units) {
    if (unit.trendDirection.toUpperCase() === 'DECLINING' && unit.grade !== 'RED' && unit.weeksTrending >= 3) {
      alerts.push({
        id: `declining-${unit.managerId}`,
        icon: 'declining',
        message: `${unit.managerName}'s team declining for ${String(unit.weeksTrending)} consecutive weeks`,
      });
    }
  }

  return alerts;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

// --- Headline Strip ---

interface HeadlineStripProps {
  health: ExecutiveHealthResponse;
}

function HeadlineStrip({ health }: HeadlineStripProps) {
  const alignGrade = gradeFromAlignment(health.strategicAlignmentPct);
  const alignColor = HEALTH_COLORS[alignGrade];

  // Determine overall trend from units
  const decliningCount = health.units.filter((u) => u.trendDirection.toUpperCase() === 'DECLINING').length;
  const improvingCount = health.units.filter((u) => u.trendDirection.toUpperCase() === 'IMPROVING').length;
  const overallTrend = improvingCount > decliningCount
    ? 'IMPROVING'
    : decliningCount > improvingCount
      ? 'DECLINING'
      : 'FLAT';

  return (
    <div className="flex items-center justify-between h-20 px-6 bg-surface-lowest/85 backdrop-blur-sm border-b border-outline-variant">
      {/* Left: Strategic Alignment headline */}
      <div className="flex items-center gap-3">
        <span
          className="text-5xl font-bold tabular-nums tracking-tight"
          style={{ color: alignColor, fontVariantNumeric: 'tabular-nums' }}
        >
          {health.strategicAlignmentPct.toFixed(1)}%
        </span>
        <div className="flex flex-col">
          <span className={`text-lg font-semibold ${trendArrowColor(overallTrend)}`}>
            {trendArrow(overallTrend)}
          </span>
          <span className="text-xs text-muted uppercase tracking-wider">
            Strategic Alignment
          </span>
        </div>
      </div>

      {/* Center: Secondary metric pills */}
      <div className="hidden md:flex items-center gap-3">
        <StatPill
          value={`${String(Math.round(health.completionRate))}%`}
          label="Completion"
          variant="neutral"
        />
        <StatPill
          value={`${health.carryForwardRate.toFixed(1)}%`}
          label="Carry-Forward"
          variant={health.carryForwardRate > 10 ? 'warning' : 'neutral'}
        />
        <StatPill
          value={String(health.activeDriftSignals)}
          label="Drift Signals"
          variant={health.activeDriftSignals > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Right: Org name + week label */}
      <div className="text-right">
        <p className="text-sm font-medium text-on-surface-variant">{health.orgName}</p>
        <p className="text-xs text-muted">{formatWeekLabel(health.computedAt)}</p>
      </div>
    </div>
  );
}

function StatPill({
  value,
  label,
  variant,
}: {
  value: string;
  label: string;
  variant: 'neutral' | 'warning' | 'success';
}) {
  const borderClass = variant === 'warning'
    ? 'border-warning/30'
    : variant === 'success'
      ? 'border-accent/30'
      : 'border-outline-variant';

  const valueClass = variant === 'warning'
    ? 'text-warning'
    : variant === 'success'
      ? 'text-accent'
      : 'text-on-surface';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${borderClass} bg-surface-container`}>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

// --- Manager Card ---

interface ManagerCardProps {
  unit: OrgUnitHealth;
  index: number;
  onClick: () => void;
  sparklineData: { value: number }[];
}

function ManagerCard({ unit, index, onClick, sparklineData }: ManagerCardProps) {

  const gradeColor = HEALTH_COLORS[unit.grade];
  const isRed = unit.grade === 'RED';

  // CHESS bar: use strategicAlignmentPct as strategic, distribute the rest
  const strategicW = unit.strategicAlignmentPct;
  const remainingW = 100 - strategicW;

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
        HEALTH_GLOW[unit.grade],
        isRed ? 'animate-pulse-subtle' : '',
      ].join(' ')}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'backwards',
      }}
      aria-label={`View ${unit.managerName}'s team — ${String(Math.round(unit.strategicAlignmentPct))}% strategic alignment, grade ${unit.grade}`}
    >
      {/* Header row: name + trend */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-on-surface truncate max-w-[120px]">
          {firstName(unit.managerName)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums text-on-surface">
            {Math.round(unit.strategicAlignmentPct)}%
          </span>
          <span className={`text-sm font-bold ${trendArrowColor(unit.trendDirection)}`}>
            {trendArrow(unit.trendDirection)}
          </span>
        </div>
      </div>

      {/* CHESS distribution bar: Strategic vs Other (only real data available) */}
      <div className="w-full h-2 rounded-full bg-outline-variant overflow-hidden flex">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(strategicW)}%`, backgroundColor: CHESS_COLORS.strategic }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(remainingW)}%`, backgroundColor: '#64748B' }}
        />
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

// --- VP Section ---

interface VPSectionProps {
  group: VPGroup;
  sectionIndex: number;
  sparklineMap: Map<string, { value: number }[]>;
  onSelectTeam?: ((managerId: string) => void) | undefined;
}

function VPSection({ group, sectionIndex, sparklineMap, onSelectTeam }: VPSectionProps) {
  const navigate = useNavigate();

  return (
    <div
      className="animate-fade-slide-in"
      style={{
        animationDelay: `${sectionIndex * 120}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* VP header */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: HEALTH_COLORS[group.vpGrade] }}
        />
        <h3 className="text-sm font-semibold text-on-surface-variant">
          VP: {group.vpName}
        </h3>
        <span className={`text-sm font-bold ${HEALTH_TEXT[group.vpGrade]}`}>
          ({group.vpGrade} {trendArrow(group.vpTrend)})
        </span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>

      {/* Manager cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {group.managers.map((unit, i) => (
          <ManagerCard
            key={unit.managerId}
            unit={unit}
            index={sectionIndex * 10 + i}
            sparklineData={sparklineMap.get(unit.managerId) ?? []}
            onClick={() => {
              if (onSelectTeam) {
                onSelectTeam(unit.managerId);
              } else {
                void navigate(`/observatory/team/${unit.managerId}`);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Org Health Map ---

interface OrgHealthMapProps {
  health: ExecutiveHealthResponse;
  orgTree: User[] | undefined;
  onSelectTeam?: ((managerId: string) => void) | undefined;
}

function OrgHealthMap({ health, orgTree, onSelectTeam }: OrgHealthMapProps) {
  const vpGroups = useMemo(
    () => buildVPGroups(health.units, orgTree),
    [health.units, orgTree],
  );

  // Batch-fetch all manager alignment trends in parallel (one useQueries call
  // instead of N useAlignmentTrend hooks inside each ManagerCard).
  const managerIds = useMemo(
    () => health.units.filter(u => u.role !== 'VP' && u.role !== 'EXECUTIVE').map(u => u.managerId),
    [health.units],
  );

  const trendQueries = useQueries({
    queries: managerIds.map((managerId) => ({
      queryKey: ['observatory', 'alignmentTrend', 8, managerId] as const,
      queryFn: () => getAlignmentTrend(8, managerId),
      staleTime: 60_000,
    })),
  });

  const sparklineMap = useMemo(() => {
    const map = new Map<string, { value: number }[]>();
    for (let i = 0; i < managerIds.length; i++) {
      const data = trendQueries[i]?.data;
      if (data && Array.isArray(data)) {
        map.set(managerIds[i]!, data.map((dp) => ({ value: dp.strategicPct })));
      }
    }
    return map;
  }, [managerIds, trendQueries]);

  if (health.units.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted text-sm">
        No org units found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {vpGroups.map((group, i) => (
        <VPSection key={group.vpId} group={group} sectionIndex={i} sparklineMap={sparklineMap} onSelectTeam={onSelectTeam} />
      ))}

      {/* CHESS legend */}
      <div className="flex items-center gap-4 px-1 pt-2 border-t border-outline-variant/50">
        {[
          { color: CHESS_COLORS.strategic, label: 'Strategic' },
          { color: '#64748B', label: 'Other' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Exception Alerts ---

interface ExceptionAlertsProps {
  alerts: Alert[];
}

function ExceptionAlerts({ alerts }: ExceptionAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 px-6 bg-green-500/5 border-t border-green-500/20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-green-600">All teams on course</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-outline-variant bg-surface/85 backdrop-blur px-6 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent pb-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0',
              'bg-surface-container backdrop-blur text-xs max-w-xs',
              alert.icon === 'red'
                ? 'border-red-500/30 text-red-300'
                : alert.icon === 'drift'
                  ? 'border-amber-500/30 text-amber-300'
                  : 'border-yellow-500/30 text-yellow-300',
            ].join(' ')}
          >
            {/* Icon */}
            <span className="flex-shrink-0">
              {alert.icon === 'red' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              )}
              {alert.icon === 'drift' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {alert.icon === 'declining' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              )}
            </span>
            <span className="truncate">{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface ExecutiveHealthPageProps {
  /** Optional override for card clicks. When omitted, navigates to /observatory/team/:id. */
  onSelectTeam?: ((managerId: string) => void) | undefined;
}

export function ExecutiveHealthPage({ onSelectTeam }: ExecutiveHealthPageProps = {}) {
  const { role } = useAuth();

  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErrorObj,
  } = useExecutiveHealth();

  const { data: driftReport } = useDriftReport();

  const orgTreeQuery = useQuery({
    queryKey: ['users', 'org-tree'],
    queryFn: getOrgTree,
    staleTime: 60_000,
  });

  // Role guard
  if (!role || !DIRECTOR_AND_ABOVE.has(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface gap-4 text-center p-8">
        <div className="w-12 h-12 bg-error/[0.08] rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-on-surface">Access Restricted</h1>
        <p className="text-sm text-on-surface-variant max-w-sm">
          The Executive Health Dashboard is only accessible to Directors, VPs, and Executives.
        </p>
      </div>
    );
  }

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <LoadingSpinner size="lg" label="Loading executive health data\u2026" />
      </div>
    );
  }

  if (healthError || !health) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface gap-4 text-center p-8">
        <div className="w-12 h-12 bg-error/[0.08] rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-on-surface">Failed to load health data</h1>
        <p className="text-sm text-on-surface-variant max-w-sm">
          {healthErrorObj instanceof Error
            ? healthErrorObj.message
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark transition-colors"
          onClick={() => { window.location.reload(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  const driftSignals = driftReport?.signals ?? [];
  const alerts = generateAlerts(health.units, driftSignals);

  return (
    <div className="flex flex-col h-screen bg-surface text-on-surface animate-fade-in">
      {/* Zone 1: Headline Strip */}
      <HeadlineStrip health={health} />

      {/* Zone 2: Org Health Map */}
      <OrgHealthMap health={health} orgTree={orgTreeQuery.data} onSelectTeam={onSelectTeam} />

      {/* Zone 3: Exception Alerts */}
      <ExceptionAlerts alerts={alerts} />

      {/* CSS animations are in global.css */}
    </div>
  );
}
