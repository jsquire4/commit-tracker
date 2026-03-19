/**
 * The Briefing — single-route executive view with progressive drill-down.
 *
 * Modes: briefing (default), health, strategy, config
 * Drill levels: Rally Cry overview → Rally Cry detail → Team detail → Person detail
 *
 * State is URL-driven via search params. Browser back/forward works naturally.
 */
import { useMemo, useRef } from 'react';
import { useDrillDown, type BriefingMode } from '@/hooks/useDrillDown';
import { useAuth } from '@/hooks/useAuth';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useExecutiveHealth } from '@/hooks/useObservatory';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { DrillDownBreadcrumb } from './DrillDownBreadcrumb';
import { RallyCryLevel } from './levels/RallyCryLevel';
import { RallyCryDetailLevel } from './levels/RallyCryDetailLevel';
import { TeamDetailLevel } from './levels/TeamDetailLevel';
import { PersonDetailLevel } from './levels/PersonDetailLevel';

// Lazy imports for mode content (these are heavy pages)
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { UserRole } from '@/types';

const HealthMapContent = lazy(() =>
  import('@/features/observatory/ExecutiveHealthPage').then((m) => ({
    default: m.ExecutiveHealthPage,
  })),
);
const StrategyContent = lazy(() =>
  import('@/features/strategy/StrategyPage').then((m) => ({
    default: m.StrategyPage,
  })),
);
const ConfigContent = lazy(() =>
  import('@/features/observatory/ObservatoryConfigPage').then((m) => ({
    default: m.ObservatoryConfigPage,
  })),
);

const ALLOWED_ROLES: UserRole[] = ['DIRECTOR', 'VP', 'EXECUTIVE'];

const MODE_TABS: { mode: BriefingMode; label: string }[] = [
  { mode: 'briefing', label: 'Briefing' },
  { mode: 'health', label: 'Health Map' },
  { mode: 'strategy', label: 'Strategy' },
  { mode: 'config', label: 'Config' },
];

export function BriefingView() {
  const { role } = useAuth();
  const drill = useDrillDown();
  const directionRef = useRef(drill.direction);
  directionRef.current = drill.direction;

  // Role guard
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          The Briefing is only accessible to Directors, VPs, and Executives.
        </p>
      </div>
    );
  }

  // Resolve display names for breadcrumb from cached data
  const { data: rcdoTree } = useRcdoTree();
  const { data: health } = useExecutiveHealth();
  const { data: cycle } = useCurrentCycle();
  const { data: commitments } = useCommitments(cycle?.id ?? '');

  const breadcrumbNames = useMemo(() => {
    const names: { rallyCry?: string; team?: string; person?: string } = {};
    if (drill.rallyCryId && rcdoTree?.rallyCries) {
      const rc = rcdoTree.rallyCries.find((r) => r.id === drill.rallyCryId);
      if (rc) names.rallyCry = rc.title;
    }
    if (drill.teamId) {
      // Try health units first (managers), fall back to commitments (any user)
      const unit = health?.units?.find((u) => u.managerId === drill.teamId);
      if (unit) {
        names.team = unit.managerName;
      } else if (commitments) {
        const c = commitments.find((cm) => cm.userId === drill.teamId);
        if (c) names.team = c.userDisplayName;
      }
    }
    if (drill.personId && commitments) {
      const c = commitments.find((cm) => cm.userId === drill.personId);
      if (c) names.person = c.userDisplayName;
    }
    return names;
  }, [drill.rallyCryId, drill.teamId, drill.personId, rcdoTree, health, commitments]);

  // Determine content to render
  const isInDrillMode = drill.mode === 'briefing' && drill.depth > 0;
  const showModeTabs = drill.depth === 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Mode switcher (only at top level) */}
      {showModeTabs && (
        <div className="flex items-center gap-1 px-8 pt-4">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => { drill.setMode(tab.mode); }}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                drill.mode === tab.mode
                  ? 'bg-gray-800 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Breadcrumb (only when drilled in) */}
      {isInDrillMode && <DrillDownBreadcrumb drill={drill} names={breadcrumbNames} />}

      {/* Content — each level/mode is its own keyed element to avoid Suspense reconciliation conflicts */}
      {drill.mode === 'briefing' && drill.depth === 0 && (
        <div key="briefing-0" className={directionRef.current === 'in' ? 'animate-drill-in' : 'animate-drill-out'}>
          <RallyCryLevel
            onSelectRallyCry={(id) => { drill.drillTo({ rc: id }); }}
            onDrillToTeam={(teamId) => { drill.drillTo({ team: teamId }); }}
          />
        </div>
      )}
      {drill.mode === 'briefing' && drill.depth === 1 && drill.rallyCryId && (
        <div key={`rc-${drill.rallyCryId}`} className={directionRef.current === 'in' ? 'animate-drill-in' : 'animate-drill-out'}>
          <RallyCryDetailLevel
            rallyCryId={drill.rallyCryId}
            onSelectTeam={(teamId) => { drill.drillTo({ rc: drill.rallyCryId!, team: teamId }); }}
          />
        </div>
      )}
      {drill.mode === 'briefing' && drill.depth === 2 && drill.teamId && (
        <div key={`team-${drill.teamId}`} className={directionRef.current === 'in' ? 'animate-drill-in' : 'animate-drill-out'}>
          <TeamDetailLevel
            teamId={drill.teamId}
            onSelectPerson={(personId) => { drill.drillTo({ rc: drill.rallyCryId!, team: drill.teamId!, person: personId }); }}
          />
        </div>
      )}
      {drill.mode === 'briefing' && drill.depth === 3 && drill.personId && (
        <div key={`person-${drill.personId}`} className={directionRef.current === 'in' ? 'animate-drill-in' : 'animate-drill-out'}>
          <PersonDetailLevel personId={drill.personId} />
        </div>
      )}

      {/* Mode content — each in its own Suspense boundary, not inside a shared keyed div */}
      {drill.mode === 'health' && (
        <Suspense key="health" fallback={<LoadingSpinner size="lg" fullPage label="Loading health map..." />}>
          <HealthMapContent />
        </Suspense>
      )}
      {drill.mode === 'strategy' && (
        <Suspense key="strategy" fallback={<LoadingSpinner size="lg" fullPage label="Loading strategy..." />}>
          <StrategyContent />
        </Suspense>
      )}
      {drill.mode === 'config' && (
        <Suspense key="config" fallback={<LoadingSpinner size="lg" fullPage label="Loading config..." />}>
          <ConfigContent />
        </Suspense>
      )}

      {/* CSS animations are in global.css */}
    </div>
  );
}
