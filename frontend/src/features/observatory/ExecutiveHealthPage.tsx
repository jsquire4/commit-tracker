import { useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useExecutiveHealth, useDriftReport, useObservatoryConfig } from '@/hooks/useObservatory';
import { getAlignmentTrend } from '@/api/observatory.api';
import { getOrgTree } from '@/api/users.api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CHESS_ACCENT } from '@/constants/chess-colors';
import { DIRECTOR_AND_ABOVE } from '@/constants/roles';
import type { ExecutiveHealthResponse } from '@/types/observatory.types';
import type { User } from '@/types/user.types';
import { HeadlineStrip } from './HeadlineStrip';
import { VPSection, buildVPGroups } from './VPSection';
import type { VPGroup } from './VPSection';
import { ExceptionAlerts, generateAlerts } from './ExceptionAlerts';

// ─── Org Health Map ───────────────────────────────────────────────────────────

interface OrgHealthMapProps {
  health: ExecutiveHealthResponse;
  orgTree: User[] | undefined;
  onSelectTeam?: ((managerId: string) => void) | undefined;
  alignmentTarget?: number;
  warningPct?: number;
}

function OrgHealthMap({ health, orgTree, onSelectTeam, alignmentTarget = 50, warningPct = 30 }: OrgHealthMapProps) {
  const vpGroups: VPGroup[] = useMemo(
    () => buildVPGroups(health.units, orgTree, alignmentTarget, warningPct),
    [health.units, orgTree, alignmentTarget, warningPct],
  );

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
          { color: CHESS_ACCENT.strategic, label: 'Strategic' },
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

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const { data: obsConfig } = useObservatoryConfig();

  const alignmentTarget = obsConfig ? parseFloat(obsConfig.strategicAlignmentTarget) : 50;
  const warningPct = obsConfig ? parseFloat(obsConfig.misalignmentWarningPct) : 30;

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
      <HeadlineStrip health={health} alignmentTarget={alignmentTarget} warningPct={warningPct} />

      {/* Zone 2: Org Health Map */}
      <OrgHealthMap health={health} orgTree={orgTreeQuery.data} onSelectTeam={onSelectTeam} alignmentTarget={alignmentTarget} warningPct={warningPct} />

      {/* Zone 3: Exception Alerts */}
      <ExceptionAlerts alerts={alerts} />

      {/* CSS animations are in global.css */}
    </div>
  );
}
