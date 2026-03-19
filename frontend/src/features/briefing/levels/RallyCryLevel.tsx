/**
 * Level 0: Rally Cry overview — the landing view of the Briefing.
 * Adapted from the original BriefingPage. Shows headline, rally cry status cards, and watch list.
 * Rally cry cards are now clickable — drilling into Level 1 (RallyCryDetailLevel).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useExecutiveHealth, useCarryChains, useCostImpact } from '@/hooks/useObservatory';
import { listCycles } from '@/api/cycles.api';
import { getCommitments } from '@/api/commitments.api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { RallyCryNode } from '@/types/rcdo.types';
import type { Commitment } from '@/types/commitment.types';
import type { RcdoCoverageResponse, AlignmentSignalResponse } from '@/types/dashboard.types';
import type { CarryForwardChain, CostWeightedSignal, OrgUnitHealth } from '@/types/observatory.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type RallyCryStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

interface RallyCryCard {
  rallyCryId: string;
  title: string;
  status: RallyCryStatus;
  commitmentCount: number;
  narrative: string;
  coveredObjectiveCount: number;
  totalObjectiveCount: number;
  uncoveredObjectives: { definingObjectiveId: string; title: string }[];
  coveredObjectives: { definingObjectiveId: string; title: string; commitmentCount: number }[];
  contributingTeams: string[];
  sortOrder: number;
  trendDirection: 'up' | 'down' | 'flat' | null;
}

interface WatchItem {
  id: string;
  message: string;
  severity: 'warning' | 'critical';
  drillTarget: { team?: string; person?: string } | null;
}

// ─── Data Processing (preserved from BriefingPage) ────────────────────────────

function buildRallyCryCards(
  rcdo: RcdoCoverageResponse,
  commitments: Commitment[],
  totalHeadcount: number,
  rcdoTree: RallyCryNode[] | undefined,
  previousCommitments: Commitment[] | undefined,
): RallyCryCard[] {
  const commitsByRC = new Map<string, Commitment[]>();
  for (const c of commitments) {
    const rcId = c.rcdoLink.rallyCryId;
    if (!rcId) continue;
    if (!commitsByRC.has(rcId)) commitsByRC.set(rcId, []);
    commitsByRC.get(rcId)!.push(c);
  }

  const prevCommitsByRC = new Map<string, number>();
  if (previousCommitments) {
    for (const c of previousCommitments) {
      const rcId = c.rcdoLink.rallyCryId;
      if (!rcId) continue;
      prevCommitsByRC.set(rcId, (prevCommitsByRC.get(rcId) ?? 0) + 1);
    }
  }

  const sortOrderMap = new Map<string, number>();
  const doTitleMap = new Map<string, string>();
  if (rcdoTree) {
    for (const rc of rcdoTree) {
      sortOrderMap.set(rc.id, rc.sortOrder);
      for (const dObj of rc.definingObjectives) {
        doTitleMap.set(dObj.id, dObj.title);
      }
    }
  }

  const uncoveredByRC = new Map<string, { definingObjectiveId: string; title: string }[]>();
  for (const uo of rcdo.uncoveredObjectives) {
    if (!uncoveredByRC.has(uo.rallyCryTitle)) uncoveredByRC.set(uo.rallyCryTitle, []);
    uncoveredByRC.get(uo.rallyCryTitle)!.push({ definingObjectiveId: uo.definingObjectiveId, title: uo.title });
  }

  return rcdo.byRallyCry.map((rc) => {
    const rcCommitments = commitsByRC.get(rc.rallyCryId) ?? [];
    const uncovered = uncoveredByRC.get(rc.title) ?? [];

    const contributorNames = new Set<string>();
    for (const c of rcCommitments) contributorNames.add(c.userDisplayName);

    const coveredObjectiveMap = new Map<string, { title: string; count: number }>();
    for (const c of rcCommitments) {
      const doId = c.rcdoLink.definingObjectiveId;
      if (!doId) continue;
      const existing = coveredObjectiveMap.get(doId);
      if (existing) { existing.count += 1; }
      else { coveredObjectiveMap.set(doId, { title: c.rcdoLink.definingObjectiveTitle ?? doTitleMap.get(doId) ?? 'Unknown', count: 1 }); }
    }

    const coveredObjectives = [...coveredObjectiveMap.entries()].map(([doId, info]) => ({
      definingObjectiveId: doId, title: info.title, commitmentCount: info.count,
    }));

    const commitRatio = totalHeadcount > 0 ? rcCommitments.length / totalHeadcount : 0;
    let status: RallyCryStatus;
    if (rcCommitments.length === 0 || commitRatio < 0.05) status = 'OFF_TRACK';
    else if (uncovered.length > 0) status = 'AT_RISK';
    else status = 'ON_TRACK';

    const contributors = [...contributorNames];
    const topContributors = contributors.slice(0, 3);
    const remaining = contributors.length - topContributors.length;
    const contributorText = topContributors.length > 0
      ? topContributors.join(', ') + (remaining > 0 ? ` and ${remaining} others` : '')
      : 'No one';

    let narrative: string;
    if (status === 'OFF_TRACK') {
      narrative = rcCommitments.length === 0
        ? `No commitments linked. None of the ${totalHeadcount} team members have prioritized work here.`
        : `Only ${rcCommitments.length} commitment${rcCommitments.length === 1 ? '' : 's'} across ${totalHeadcount} members. Coverage is critically thin.`;
    } else if (status === 'AT_RISK') {
      narrative = `${contributorText} driving work with ${rcCommitments.length} commitment${rcCommitments.length === 1 ? '' : 's'}, but ${uncovered.length} objective${uncovered.length === 1 ? ' has' : 's have'} no coverage.`;
    } else {
      narrative = `${contributorText} actively contributing with ${rcCommitments.length} commitment${rcCommitments.length === 1 ? '' : 's'}. All objectives covered.`;
    }

    let trendDirection: 'up' | 'down' | 'flat' | null = null;
    if (previousCommitments) {
      const prevCount = prevCommitsByRC.get(rc.rallyCryId) ?? 0;
      trendDirection = rc.commitmentCount > prevCount ? 'up' : rc.commitmentCount < prevCount ? 'down' : 'flat';
    }

    return {
      rallyCryId: rc.rallyCryId, title: rc.title, status, commitmentCount: rc.commitmentCount,
      narrative, coveredObjectiveCount: coveredObjectives.length,
      totalObjectiveCount: coveredObjectives.length + uncovered.length,
      uncoveredObjectives: uncovered, coveredObjectives, contributingTeams: contributors,
      sortOrder: sortOrderMap.get(rc.rallyCryId) ?? 999, trendDirection,
    };
  });
}

function buildWatchList(
  carryChains: CarryForwardChain[] | undefined,
  costSignals: CostWeightedSignal[] | undefined,
  healthUnits: OrgUnitHealth[] | undefined,
  alignment: AlignmentSignalResponse | undefined,
): WatchItem[] {
  const items: WatchItem[] = [];

  if (alignment?.byTeamMember) {
    const unlinked = alignment.byTeamMember.filter(
      (m) => m.unlinkedCount > 0 && m.unlinkedCount === Object.values(m.distribution).reduce((s, d) => s + d.count, 0),
    );
    for (const m of unlinked.slice(0, 5)) {
      items.push({ id: `unlinked-${m.userId}`, message: `${m.displayName} has ${m.unlinkedCount} commitment${m.unlinkedCount === 1 ? '' : 's'} with no rally cry linkage`, severity: 'warning', drillTarget: { team: m.userId } });
    }
  }

  if (carryChains) {
    for (const chain of carryChains.filter((c) => c.chainLength > 2).slice(0, 5)) {
      items.push({ id: `carry-${chain.commitmentId}`, message: `"${chain.title}" carried forward ${chain.chainLength} weeks by ${chain.userDisplayName}`, severity: chain.chainLength > 4 ? 'critical' : 'warning', drillTarget: { team: chain.userId } });
    }
  }

  if (costSignals) {
    for (const signal of costSignals.filter((s) => parseFloat(s.misalignmentCost) > 0).sort((a, b) => parseFloat(b.misalignmentCost) - parseFloat(a.misalignmentCost)).slice(0, 3)) {
      const cost = parseFloat(signal.misalignmentCost);
      items.push({ id: `cost-${signal.userId}`, message: `${signal.displayName}: ${Math.round(cost)}h misalignment cost`, severity: cost > 20 ? 'critical' : 'warning', drillTarget: { team: signal.userId } });
    }
  }

  if (healthUnits) {
    for (const unit of healthUnits.filter((u) => u.trendDirection === 'DECLINING' && u.weeksTrending >= 2).slice(0, 5)) {
      items.push({ id: `decline-${unit.managerId}`, message: `${unit.managerName}'s team declining for ${unit.weeksTrending} weeks (${Math.round(unit.strategicAlignmentPct)}% alignment)`, severity: unit.weeksTrending >= 4 ? 'critical' : 'warning', drillTarget: { team: unit.managerId } });
    }
  }

  return items;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RallyCryStatus, string> = {
  ON_TRACK: 'bg-green-500/10 border-green-500/30 text-green-400',
  AT_RISK: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  OFF_TRACK: 'bg-red-500/10 border-red-500/30 text-red-400',
};
const STATUS_LABEL: Record<RallyCryStatus, string> = { ON_TRACK: 'On Track', AT_RISK: 'At Risk', OFF_TRACK: 'Off Track' };
const STATUS_DOT: Record<RallyCryStatus, string> = { ON_TRACK: 'bg-green-500', AT_RISK: 'bg-amber-500', OFF_TRACK: 'bg-red-500' };
const STATUS_GLOW: Record<RallyCryStatus, string> = { ON_TRACK: 'shadow-green-500/5', AT_RISK: 'shadow-amber-500/5', OFF_TRACK: 'shadow-red-500/10' };
const TREND_INDICATOR: Record<'up' | 'down' | 'flat', { symbol: string; color: string }> = {
  up: { symbol: '\u2191', color: 'text-green-400' }, down: { symbol: '\u2193', color: 'text-red-400' }, flat: { symbol: '\u2192', color: 'text-gray-500' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface RallyCryLevelProps {
  onSelectRallyCry: (id: string) => void;
  onDrillToTeam: (teamId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RallyCryLevel({ onSelectRallyCry, onDrillToTeam }: RallyCryLevelProps) {
  const { data: cycle, isLoading: cycleLoading } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';
  const { data: dashboard, isLoading: dashLoading } = useDashboard({ includeSubtree: true });
  const { data: commitments, isLoading: commitmentsLoading } = useCommitments(cycleId);
  const { data: rcdoTree } = useRcdoTree();
  const { data: health } = useExecutiveHealth(6);
  const { data: carryChains } = useCarryChains(cycleId);
  const { data: costSignals } = useCostImpact(cycleId);

  const { data: previousCycleData } = useQuery({
    queryKey: ['cycles', 'previous', cycle?.startsAt],
    queryFn: async () => {
      if (!cycle?.startsAt) return null;
      const result = await listCycles({ dateTo: cycle.startsAt });
      const previous = result.items.filter((c: { id: string }) => c.id !== cycle.id).sort((a: { startsAt: string }, b: { startsAt: string }) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      return previous[0] ?? null;
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(cycle?.startsAt),
  });
  const { data: previousCommitments } = useQuery({
    queryKey: ['commitments', 'previous', previousCycleData?.id ?? ''],
    queryFn: () => getCommitments(previousCycleData!.id),
    staleTime: 5 * 60_000,
    enabled: Boolean(previousCycleData?.id),
  });

  const isLoading = cycleLoading || dashLoading || commitmentsLoading;

  const rallyCryCards = useMemo(() => {
    if (!commitments || !rcdoTree?.rallyCries) return [];

    // Build RCDO coverage from commitments directly (the dashboard endpoint
    // may return empty coverage for executives whose direct reports are VPs
    // with no personal commitments)
    const dashCoverage = dashboard?.rcdoCoverage;
    const hasDashData = dashCoverage && dashCoverage.byRallyCry.length > 0;

    if (hasDashData) {
      const headcount = dashboard.teamRollup?.members?.length ?? commitments.length;
      return buildRallyCryCards(dashCoverage, commitments, headcount, rcdoTree.rallyCries, previousCommitments)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Fallback: build coverage from commitments + RCDO tree
    const byRallyCry: RcdoCoverageResponse['byRallyCry'] = [];
    const uncoveredObjectives: RcdoCoverageResponse['uncoveredObjectives'] = [];
    let linkedCount = 0;

    for (const rc of rcdoTree.rallyCries) {
      const rcCommitments = commitments.filter((c) => c.rcdoLink.rallyCryId === rc.id);
      byRallyCry.push({
        rallyCryId: rc.id,
        title: rc.title,
        commitmentCount: rcCommitments.length,
        percentage: commitments.length > 0 ? (rcCommitments.length / commitments.length) * 100 : 0,
      });
      linkedCount += rcCommitments.length;

      // Check objective coverage
      for (const doNode of rc.definingObjectives) {
        const doCommitments = rcCommitments.filter((c) => c.rcdoLink.definingObjectiveId === doNode.id);
        if (doCommitments.length === 0) {
          uncoveredObjectives.push({
            definingObjectiveId: doNode.id,
            title: doNode.title,
            rallyCryTitle: rc.title,
          });
        }
      }
    }

    const syntheticCoverage: RcdoCoverageResponse = {
      totalCommitments: commitments.length,
      linkedCount,
      unlinkedCount: commitments.length - linkedCount,
      linkedPercentage: commitments.length > 0 ? (linkedCount / commitments.length) * 100 : 0,
      byRallyCry,
      uncoveredObjectives,
    };

    return buildRallyCryCards(syntheticCoverage, commitments, commitments.length, rcdoTree.rallyCries, previousCommitments)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dashboard, commitments, rcdoTree, previousCommitments]);

  const onTrackCount = rallyCryCards.filter((c) => c.status === 'ON_TRACK').length;
  const needAttentionCount = rallyCryCards.filter((c) => c.status === 'AT_RISK' || c.status === 'OFF_TRACK').length;

  const watchItems = useMemo(
    () => buildWatchList(carryChains, costSignals, health?.units, dashboard?.alignmentSignal),
    [carryChains, costSignals, health, dashboard],
  );

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" label="Preparing your briefing\u2026" /></div>;
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-100">No data available</h1>
        <p className="text-sm text-gray-400 max-w-sm">Could not load data. Please try again.</p>
      </div>
    );
  }

  const completionRate = health?.completionRate ?? 0;

  return (
    <>
      {/* Headline */}
      <header className="px-8 py-10 animate-briefing-fade-in">
        <h1 className="text-3xl font-bold text-gray-50 tracking-tight">
          You set {rallyCryCards.length} priorit{rallyCryCards.length === 1 ? 'y' : 'ies'}.{' '}
          <span className="text-green-400">{onTrackCount} on track</span>
          {needAttentionCount > 0 && (
            <>, <span className="text-amber-400">{needAttentionCount} need{needAttentionCount === 1 ? 's' : ''} attention</span></>
          )}.
        </h1>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-sm text-gray-500">{cycle.label}</span>
          <span className="text-xs text-gray-600">|</span>
          <span className="text-sm text-gray-500">{Math.round(completionRate)}% completion rate</span>
        </div>
      </header>

      {/* Rally Cry Cards */}
      <section className="px-8 pb-8">
        {rallyCryCards.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">No rally cries with commitment linkage this cycle.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rallyCryCards.map((card, i) => (
              <button
                key={card.rallyCryId}
                type="button"
                onClick={() => { onSelectRallyCry(card.rallyCryId); }}
                className={`text-left bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg animate-briefing-stagger hover:border-gray-600 hover:-translate-y-0.5 transition-all cursor-pointer ${STATUS_GLOW[card.status]}`}
                style={{ animationDelay: `${(i + 1) * 100}ms`, animationFillMode: 'backwards' }}
              >
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${STATUS_BADGE[card.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[card.status]}`} />
                    {STATUS_LABEL[card.status]}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-50 mb-3 leading-snug">{card.title}</h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{card.narrative}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
                  <span><span className="text-gray-300 font-medium">{card.coveredObjectiveCount}</span> of <span className="text-gray-300 font-medium">{card.totalObjectiveCount}</span> objectives covered</span>
                  <span><span className="text-gray-300 font-medium">{card.commitmentCount}</span> commitment{card.commitmentCount === 1 ? '' : 's'}
                    {card.trendDirection !== null && (
                      <span className={`ml-1 ${TREND_INDICATOR[card.trendDirection].color}`}>{TREND_INDICATOR[card.trendDirection].symbol}</span>
                    )}
                  </span>
                </div>
                {/* Progress bar */}
                {card.totalObjectiveCount > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((card.coveredObjectiveCount / card.totalObjectiveCount) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums">{Math.round((card.coveredObjectiveCount / card.totalObjectiveCount) * 100)}%</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Watch List */}
      {watchItems.length > 0 && (
        <section className="px-8 pb-10 animate-briefing-stagger" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
          <h2 className="text-lg font-bold text-gray-100 mb-4">Watch List</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <ul className="space-y-3">
              {watchItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {item.drillTarget?.team ? (
                    <button type="button" onClick={() => { onDrillToTeam(item.drillTarget!.team!); }} className="text-sm text-gray-400 leading-relaxed hover:underline hover:text-gray-200 transition-colors text-left">
                      {item.message}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400 leading-relaxed">{item.message}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
