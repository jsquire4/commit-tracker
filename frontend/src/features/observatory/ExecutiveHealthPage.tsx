import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useExecutiveHealth, useDriftReport, useAlignmentTrend } from '@/hooks/useObservatory';
import { getOrgTree } from '@/api/users.api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { UserRole } from '@/types';
import type {
  ExecutiveHealthResponse,
  OrgUnitHealth,
  DriftSignal,
  HealthGrade,
} from '@/types/observatory.types';
import type { User } from '@/types/user.types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const ALLOWED_ROLES: UserRole[] = ['DIRECTOR', 'VP', 'EXECUTIVE'];

const HEALTH_COLORS: Record<HealthGrade, string> = {
  GREEN: '#22c55e',
  YELLOW: '#f59e0b',
  RED: '#ef4444',
};

const HEALTH_BG: Record<HealthGrade, string> = {
  GREEN: 'bg-green-500/8',
  YELLOW: 'bg-amber-500/8',
  RED: 'bg-red-500/8',
};

const HEALTH_BORDER: Record<HealthGrade, string> = {
  GREEN: 'border-l-green-500',
  YELLOW: 'border-l-amber-500',
  RED: 'border-l-red-500',
};

const HEALTH_GLOW: Record<HealthGrade, string> = {
  GREEN: 'shadow-green-500/10',
  YELLOW: 'shadow-amber-500/10',
  RED: 'shadow-red-500/20',
};

const HEALTH_TEXT: Record<HealthGrade, string> = {
  GREEN: 'text-green-400',
  YELLOW: 'text-amber-400',
  RED: 'text-red-400',
};

const CHESS_COLORS = {
  strategic: '#2563EB',
  operational: '#6B7280',
  defensive: '#DC2626',
  capability: '#059669',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function trendArrow(direction: string): string {
  switch (direction) {
    case 'IMPROVING':
      return '\u2191';
    case 'DECLINING':
      return '\u2193';
    default:
      return '\u2192';
  }
}

function trendArrowColor(direction: string): string {
  switch (direction) {
    case 'IMPROVING':
      return 'text-green-400';
    case 'DECLINING':
      return 'text-red-400';
    default:
      return 'text-gray-500';
  }
}

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

    // If we have VPs but no org tree, create groups but can't assign managers
    return vps.map((vp) => ({
      vpId: vp.managerId,
      vpName: vp.managerName,
      vpGrade: vp.grade,
      vpTrend: vp.trendDirection,
      vpAlignment: vp.strategicAlignmentPct,
      managers: nonVps, // Can't determine which managers belong to which VP without tree
    }));
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
      if (!current.reportsToId) break;
      current = userMap.get(current.reportsToId);
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
    if (unit.trendDirection === 'DECLINING' && unit.grade !== 'RED' && unit.weeksTrending >= 3) {
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
  const decliningCount = health.units.filter((u) => u.trendDirection === 'DECLINING').length;
  const improvingCount = health.units.filter((u) => u.trendDirection === 'IMPROVING').length;
  const overallTrend = improvingCount > decliningCount
    ? 'IMPROVING'
    : decliningCount > improvingCount
      ? 'DECLINING'
      : 'FLAT';

  return (
    <div className="flex items-center justify-between h-20 px-6 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
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
          <span className="text-xs text-gray-500 uppercase tracking-wider">
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
        <p className="text-sm font-medium text-gray-300">{health.orgName}</p>
        <p className="text-xs text-gray-500">{formatWeekLabel(health.computedAt)}</p>
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
    ? 'border-amber-500/30'
    : variant === 'success'
      ? 'border-green-500/30'
      : 'border-gray-700';

  const valueClass = variant === 'warning'
    ? 'text-amber-400'
    : variant === 'success'
      ? 'text-green-400'
      : 'text-gray-200';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${borderClass} bg-gray-900/60`}>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// --- Manager Card ---

interface ManagerCardProps {
  unit: OrgUnitHealth;
  index: number;
  onClick: () => void;
}

function ManagerCard({ unit, index, onClick }: ManagerCardProps) {
  const { data: trendData } = useAlignmentTrend(8, unit.managerId);

  // Build sparkline data from trend response
  const sparklineData = useMemo(() => {
    if (!trendData) return [];
    return trendData.map((dp) => ({ value: dp.strategicPct }));
  }, [trendData]);

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
        'bg-gray-900/50 backdrop-blur border-gray-800 hover:border-gray-700',
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
        <span className="text-sm font-bold text-gray-100 truncate max-w-[120px]">
          {firstName(unit.managerName)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums text-gray-200">
            {Math.round(unit.strategicAlignmentPct)}%
          </span>
          <span className={`text-sm font-bold ${trendArrowColor(unit.trendDirection)}`}>
            {trendArrow(unit.trendDirection)}
          </span>
        </div>
      </div>

      {/* CHESS distribution bar */}
      <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden flex">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(strategicW)}%`, backgroundColor: CHESS_COLORS.strategic }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(remainingW * 0.4)}%`, backgroundColor: CHESS_COLORS.operational }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(remainingW * 0.35)}%`, backgroundColor: CHESS_COLORS.defensive }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${String(remainingW * 0.25)}%`, backgroundColor: CHESS_COLORS.capability }}
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
      <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-blue-500/30 transition-colors pointer-events-none" />
    </button>
  );
}

// --- VP Section ---

interface VPSectionProps {
  group: VPGroup;
  sectionIndex: number;
}

function VPSection({ group, sectionIndex }: VPSectionProps) {
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
        <h3 className="text-sm font-semibold text-gray-300">
          VP: {group.vpName}
        </h3>
        <span className={`text-sm font-bold ${HEALTH_TEXT[group.vpGrade]}`}>
          ({group.vpGrade} {trendArrow(group.vpTrend)})
        </span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* Manager cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {group.managers.map((unit, i) => (
          <ManagerCard
            key={unit.managerId}
            unit={unit}
            index={sectionIndex * 10 + i}
            onClick={() => {
              void navigate(`/observatory/team/${unit.managerId}`);
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
}

function OrgHealthMap({ health, orgTree }: OrgHealthMapProps) {
  const vpGroups = useMemo(
    () => buildVPGroups(health.units, orgTree),
    [health.units, orgTree],
  );

  if (health.units.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-600 text-sm">
        No org units found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {vpGroups.map((group, i) => (
        <VPSection key={group.vpId} group={group} sectionIndex={i} />
      ))}

      {/* CHESS legend */}
      <div className="flex items-center gap-4 px-1 pt-2 border-t border-gray-800/50">
        {[
          { color: CHESS_COLORS.strategic, label: 'Strategic' },
          { color: CHESS_COLORS.operational, label: 'Operational' },
          { color: CHESS_COLORS.defensive, label: 'Defensive' },
          { color: CHESS_COLORS.capability, label: 'Capability' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
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
    <div className="border-t border-gray-800 bg-gray-950/80 backdrop-blur px-6 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent pb-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0',
              'bg-gray-900/60 backdrop-blur text-xs max-w-xs',
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

export function ExecutiveHealthPage() {
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
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-400"
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
        <h1 className="text-xl font-semibold text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          The Executive Health Dashboard is only accessible to Directors, VPs, and Executives.
        </p>
      </div>
    );
  }

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <LoadingSpinner size="lg" label="Loading executive health data\u2026" />
      </div>
    );
  }

  if (healthError || !health) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-400"
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
        <h1 className="text-xl font-semibold text-gray-100">Failed to load health data</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          {healthErrorObj instanceof Error
            ? healthErrorObj.message
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
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
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 animate-fade-in">
      {/* Zone 1: Headline Strip */}
      <HeadlineStrip health={health} />

      {/* Zone 2: Org Health Map */}
      <OrgHealthMap health={health} orgTree={orgTreeQuery.data} />

      {/* Zone 3: Exception Alerts */}
      <ExceptionAlerts alerts={alerts} />

      {/* CSS animations injected via style tag */}
      <style>{`
        @keyframes fade-slide-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
          50% {
            box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.15);
          }
        }

        .animate-fade-slide-in {
          animation: fade-slide-in 0.4s ease-out;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }

        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thumb-gray-800::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 2px;
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
