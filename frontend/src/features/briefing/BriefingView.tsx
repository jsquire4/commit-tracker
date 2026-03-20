/**
 * The Briefing — two-column layout (70% main / 30% AI sidebar stub).
 *
 * Main column: BriefingNarrativeCard, BriefingMetricsStrip, RallyCryLevel (restyled),
 * TeamHealthTable. Sidebar: placeholder for AI Chat (Wave 4).
 *
 * Drill-down levels still work via URL params — when drilled in, the two-column
 * layout collapses to a single column showing the detail level.
 */
import { useMemo, useRef } from 'react';
import { useDrillDown, type BriefingMode } from '@/hooks/useDrillDown';
import { useAuth } from '@/hooks/useAuth';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useExecutiveHealth } from '@/hooks/useObservatory';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useBriefing } from '@/hooks/useBriefing';
import { DrillDownBreadcrumb } from './DrillDownBreadcrumb';
import { BriefingNarrativeCard } from './BriefingNarrativeCard';
import { BriefingMetricsStrip } from './BriefingMetricsStrip';
import { RallyCryLevel } from './levels/RallyCryLevel';
import { TeamHealthTable } from './TeamHealthTable';
import { RallyCryDetailLevel } from './levels/RallyCryDetailLevel';
import { TeamDetailLevel } from './levels/TeamDetailLevel';
import { PersonDetailLevel } from './levels/PersonDetailLevel';
import Button from '@/components/Button';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface gap-4 text-center p-8">
        <h1 className="text-title font-medium text-on-surface">Access Restricted</h1>
        <p className="text-body text-on-surface-variant max-w-sm">
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
  const { data: briefing } = useBriefing(cycle?.id);

  const breadcrumbNames = useMemo(() => {
    const names: { rallyCry?: string; team?: string; person?: string } = {};
    if (drill.rallyCryId && rcdoTree?.rallyCries) {
      const rc = rcdoTree.rallyCries.find((r) => r.id === drill.rallyCryId);
      if (rc) names.rallyCry = rc.title;
    }
    if (drill.teamId) {
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

  const isInDrillMode = drill.mode === 'briefing' && drill.depth > 0;
  const showModeTabs = drill.depth === 0;
  const showBriefingHome = drill.mode === 'briefing' && drill.depth === 0;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Mode switcher (only at top level) */}
      {showModeTabs && (
        <div className="flex items-center gap-1 px-8 pt-4">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => { drill.setMode(tab.mode); }}
              className={[
                'px-3 py-1.5 rounded-sm text-body font-medium transition-colors',
                drill.mode === tab.mode
                  ? 'bg-surface-container text-on-surface'
                  : 'text-muted hover:text-on-surface-variant hover:bg-surface-container-low',
              ].join(' ')}
              style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Breadcrumb (only when drilled in) */}
      {isInDrillMode && <DrillDownBreadcrumb drill={drill} names={breadcrumbNames} />}

      {/* Briefing home: two-column layout */}
      {showBriefingHome && (
        <div className="max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-[70%_30%] gap-8 items-start">
          {/* Main column */}
          <div className="flex flex-col gap-8">
            {/* Narrative card */}
            {briefing && (
              <BriefingNarrativeCard briefing={briefing} onExportPdf={() => { /* TODO: Wire PDF export in Wave 5 */ }} />
            )}

            {/* Metrics strip */}
            {briefing && (
              <BriefingMetricsStrip metrics={briefing.metrics} />
            )}

            {/* Rally Cry Coverage */}
            <RallyCryLevel
              onSelectRallyCry={(id) => { drill.drillTo({ rc: id }); }}
              onDrillToTeam={(teamId) => { drill.drillTo({ team: teamId }); }}
            />

            {/* Team Health Table */}
            {health?.units && health.units.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
                <h2 className="font-serif text-[1.25rem] text-on-surface mb-4 font-normal">Team Health</h2>
                <TeamHealthTable
                  units={health.units}
                  onSelectTeam={(managerId) => { drill.drillTo({ team: managerId }); }}
                />
              </div>
            )}
          </div>

          {/* Sidebar — AI Chat placeholder (Wave 4) */}
          <div className="sticky top-[120px]" style={{ height: 'calc(100vh - 140px)' }}>
            <div className="bg-surface-lowest rounded-sm h-full flex flex-col overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
              {/* Header */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant">
                <svg className="w-[18px] h-[18px] text-accent" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zm-.75-9.25a.75.75 0 011.5 0v3.5a.75.75 0 01-.75.75h-2a.75.75 0 010-1.5h1.25V7.25z"/>
                </svg>
                <span className="text-body font-medium text-on-surface">Compass Intelligence</span>
              </div>

              {/* Placeholder conversation area */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                <div className="bg-surface-container-low rounded-sm p-3 text-[0.8125rem] text-on-surface leading-[1.6] self-end max-w-[92%]">
                  Why did strategic alignment drop this week?
                </div>
                <div className="bg-surface-lowest border border-outline-variant rounded-sm p-3 text-[0.8125rem] text-on-surface-variant leading-[1.6] self-start max-w-[92%]">
                  Strategic alignment fell 7 points because 3 commitments were reassigned by managers from strategic to operational work mid-cycle.
                </div>
              </div>

              {/* Input area */}
              <div className="px-5 py-4 border-t border-outline-variant">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 border-0 border-b border-b-outline-variant/15 bg-transparent text-[0.8125rem] text-on-surface py-2 outline-none focus:border-b-accent transition-colors placeholder:text-muted"
                    style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
                    type="text"
                    placeholder="Ask about this week..."
                    disabled
                  />
                  <Button variant="primary" size="sm" disabled className="!w-8 !h-8 !p-0 flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3.105 2.29a1 1 0 011.307-.376l13 6.5a1 1 0 010 1.79l-13 6.5A1 1 0 013 15.882V11l7-1-7-1V4.118a1 1 0 01.105-1.828z"/>
                    </svg>
                  </Button>
                </div>
              </div>
              <div className="text-center py-2 px-5 text-small text-muted">
                Powered by AI &middot; Coming in Wave 4
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down levels — full width, no two-column */}
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

      {/* Mode content */}
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
    </div>
  );
}
