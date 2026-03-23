/**
 * The Briefing — two-column layout (70% main / 30% AI sidebar stub).
 *
 * Main column: BriefingNarrativeCard, BriefingMetricsStrip, RallyCryLevel (restyled),
 * TeamHealthTable. Sidebar: placeholder for AI Chat (Wave 4).
 *
 * Drill-down levels still work via URL params — when drilled in, the two-column
 * layout collapses to a single column showing the detail level.
 */
import { useMemo, useRef, useCallback } from 'react';
import { exportBriefingToPdf } from '@/lib/pdfExport';
import { useToast, ToastContainer } from '@/hooks/useToast';
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
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AIChatSidebar } from '@/components/AIChatSidebar';
import { DIRECTOR_AND_ABOVE } from '@/constants/roles';
// ChatMessage type no longer needed — no seed messages

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


// No seed messages — chat starts fresh each session

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
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const { toast, toasts, dismiss } = useToast();

  // All hooks must be called before any conditional returns (Rules of Hooks)
  const { data: rcdoTree } = useRcdoTree();
  const { data: health } = useExecutiveHealth();
  const { data: cycle } = useCurrentCycle();
  const { data: commitments } = useCommitments(cycle?.id ?? '');
  const { data: briefing } = useBriefing(cycle?.id);

  const handleExportPdf = useCallback(() => {
    if (!mainColumnRef.current) return;
    exportBriefingToPdf(mainColumnRef.current)
      .then(() => { toast.success('Briefing exported as PDF'); })
      .catch(() => { toast.error('Export failed'); });
  }, [toast]);

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

  // Chat starts fresh — no seed messages

  // Role guard — after all hooks
  if (!role || !DIRECTOR_AND_ABOVE.has(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface gap-4 text-center p-8">
        <h1 className="text-title font-medium text-on-surface">Access Restricted</h1>
        <p className="text-body text-on-surface-variant max-w-sm">
          The Briefing is only accessible to Directors, VPs, and Executives.
        </p>
      </div>
    );
  }

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
        <div className="max-w-[1280px] mx-auto px-8 py-8 grid grid-cols-[70%_30%] gap-8 items-stretch">
          {/* Main column */}
          <div ref={mainColumnRef} className="flex flex-col gap-8">
            {/* Narrative card */}
            {briefing && (
              <BriefingNarrativeCard briefing={briefing} onExportPdf={handleExportPdf} />
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

          {/* Sidebar — AI Chat, bottom-aligned within viewport bounds */}
          <div className="relative">
            <div className="sticky bottom-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <AIChatSidebar
                context="briefing"
                placeholder="Ask about this week..."
                footerText="Powered by AI · Based on current cycle data"
                primerMessage="I can help you understand this week's execution data — alignment, coverage, carry-forward, and drift signals. What would you like to know?"
              />
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
          <HealthMapContent onSelectTeam={(managerId) => { drill.drillTo({ team: managerId }); }} />
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
