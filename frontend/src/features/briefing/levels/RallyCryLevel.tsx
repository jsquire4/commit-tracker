/**
 * Level 0: Rally Cry overview — the landing view of the Briefing.
 * Restyled to Compass design: 3-column grid of rally cry cards with
 * expandable linked commitments grouped by person.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useExecutiveHealth, useCarryChains, useCostImpact } from '@/hooks/useObservatory';
import { listCycles } from '@/api/cycles.api';
import { getCommitments } from '@/api/commitments.api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import type { RallyCryNode } from '@/types/rcdo.types';
import type { Commitment } from '@/types/commitment.types';
import type { RcdoCoverageResponse, AlignmentSignalResponse } from '@/types/dashboard.types';
import type { CarryForwardChain, CostWeightedSignal, OrgUnitHealth } from '@/types/observatory.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type RallyCryStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

interface RallyCryCard {
  rallyCryId: string;
  title: string;
  description?: string | undefined;
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
  /** Grouped commitments by person for drill-down */
  commitmentsByPerson: { name: string; titles: string[] }[];
}

interface WatchItem {
  id: string;
  message: string;
  severity: 'warning' | 'critical';
  drillTarget: { team?: string; person?: string } | null;
}

// ─── Data Processing ────────────────────────────────────────────────────────

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
  const rcDescriptionMap = new Map<string, string>();
  if (rcdoTree) {
    for (const rc of rcdoTree) {
      sortOrderMap.set(rc.id, rc.sortOrder);
      if (rc.description) rcDescriptionMap.set(rc.id, rc.description);
      for (const dObj of rc.definingObjectives) {
        doTitleMap.set(dObj.id, dObj.title);
      }
    }
  }

  const uncoveredByRC = new Map<string, { definingObjectiveId: string; title: string }[]>();
  for (const uo of rcdo.uncoveredObjectives) {
    if (!uncoveredByRC.has(uo.rallyCryId)) uncoveredByRC.set(uo.rallyCryId, []);
    uncoveredByRC.get(uo.rallyCryId)!.push({ definingObjectiveId: uo.definingObjectiveId, title: uo.title });
  }

  return rcdo.byRallyCry.map((rc) => {
    const rcCommitments = commitsByRC.get(rc.rallyCryId) ?? [];
    const uncovered = uncoveredByRC.get(rc.rallyCryId) ?? [];

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

    // Deduplicate: an objective may appear in both covered (from commitments) and
    // uncovered (from the coverage API) lists. Covered takes priority.
    const coveredIds = new Set(coveredObjectiveMap.keys());
    const deduplicatedUncovered = uncovered.filter(
      (obj) => !coveredIds.has(obj.definingObjectiveId),
    );

    const commitRatio = totalHeadcount > 0 ? rcCommitments.length / totalHeadcount : 0;
    let status: RallyCryStatus;
    if (rcCommitments.length === 0 || commitRatio < 0.05) status = 'OFF_TRACK';
    else if (deduplicatedUncovered.length > 0) status = 'AT_RISK';
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
      narrative = `${contributorText} driving work with ${rcCommitments.length} commitment${rcCommitments.length === 1 ? '' : 's'}, but ${deduplicatedUncovered.length} objective${deduplicatedUncovered.length === 1 ? ' has' : 's have'} no coverage.`;
    } else {
      narrative = `${contributorText} actively contributing with ${rcCommitments.length} commitment${rcCommitments.length === 1 ? '' : 's'}. All objectives covered.`;
    }

    let trendDirection: 'up' | 'down' | 'flat' | null = null;
    if (previousCommitments) {
      const prevCount = prevCommitsByRC.get(rc.rallyCryId) ?? 0;
      trendDirection = rc.commitmentCount > prevCount ? 'up' : rc.commitmentCount < prevCount ? 'down' : 'flat';
    }

    // Group commitments by person
    const byPerson = new Map<string, string[]>();
    for (const c of rcCommitments) {
      if (!byPerson.has(c.userDisplayName)) byPerson.set(c.userDisplayName, []);
      byPerson.get(c.userDisplayName)!.push(c.title);
    }

    const desc = rcDescriptionMap.get(rc.rallyCryId);
    return {
      rallyCryId: rc.rallyCryId, title: rc.title,
      ...(desc ? { description: desc } : {}),
      status, commitmentCount: rc.commitmentCount,
      narrative, coveredObjectiveCount: coveredObjectives.length,
      totalObjectiveCount: coveredObjectives.length + deduplicatedUncovered.length,
      uncoveredObjectives: deduplicatedUncovered, coveredObjectives, contributingTeams: contributors,
      sortOrder: sortOrderMap.get(rc.rallyCryId) ?? 999, trendDirection,
      commitmentsByPerson: [...byPerson.entries()].map(([name, titles]) => ({ name, titles })),
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
      (m) => m.unlinkedCount > 0,
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

// ─── Expandable Rally Card ────────────────────────────────────────────────────

function RallyCryCardComponent({
  card,
  index,
  onSelect,
}: {
  card: RallyCryCard;
  index: number;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isGapWarning = card.status === 'AT_RISK' || card.status === 'OFF_TRACK';

  return (
    <div
      className={[
        'bg-surface-lowest rounded-sm p-5 animate-fade-up transition-colors hover:bg-surface cursor-pointer',
        isGapWarning ? 'border-l-[3px] border-l-warning' : 'border-l-[3px] border-l-transparent',
      ].join(' ')}
      style={{
        animationDelay: `${(index + 6) * 40}ms`,
        transitionDuration: 'var(--duration-fast, 150ms)',
      }}
      onClick={onSelect}
    >
      <h3 className="text-[0.9375rem] font-medium text-on-surface mb-1">{card.title}</h3>
      {card.description && (
        <p className="text-[0.8125rem] text-muted italic leading-[1.5] mb-2.5">{card.description}</p>
      )}
      <p className="text-[0.8125rem] text-muted mb-3.5">
        {card.commitmentCount} commitment{card.commitmentCount !== 1 ? 's' : ''} linked across{' '}
        {card.contributingTeams.length} {card.contributingTeams.length === 1 ? 'person' : 'people'}
      </p>

      {/* Objectives list */}
      <ul className="space-y-1.5 mb-3.5">
        {card.coveredObjectives.map((obj) => (
          <li key={obj.definingObjectiveId} className="flex items-center justify-between text-[0.8125rem] text-on-surface-variant">
            <span>{obj.title}</span>
            <span className="text-[0.75rem] text-muted whitespace-nowrap">{obj.commitmentCount} linked</span>
          </li>
        ))}
        {card.uncoveredObjectives.map((obj) => (
          <li key={obj.definingObjectiveId} className="flex items-center justify-between text-[0.8125rem] text-on-surface-variant">
            <span>{obj.title}</span>
            <span className="text-[0.75rem] text-warning whitespace-nowrap">0 linked</span>
          </li>
        ))}
      </ul>

      {/* Expandable linked commitments */}
      {card.commitmentsByPerson.length > 0 && (
        <div className="border-t border-outline-variant pt-2.5">
          <button
            type="button"
            className="text-[0.75rem] text-muted bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-on-surface-variant"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide linked commitments' : 'Show linked commitments'}{' '}
            <span className="text-[0.625rem]">{expanded ? '\u25B4' : '\u25BE'}</span>
          </button>

          <div
            className="overflow-hidden transition-all"
            style={{
              maxHeight: expanded ? '300px' : '0',
              opacity: expanded ? 1 : 0,
              transitionDuration: 'var(--duration-entrance, 300ms)',
              transitionTimingFunction: 'var(--ease-entrance)',
            }}
          >
            {card.commitmentsByPerson.map((group) => (
              <div key={group.name} className="mt-2">
                <div className="text-[0.75rem] font-medium text-on-surface mb-0.5">{group.name}</div>
                <div className="text-[0.75rem] text-on-surface-variant leading-[1.5] pl-3 mb-1.5">
                  {group.titles.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

      for (const doNode of rc.definingObjectives) {
        const doCommitments = rcCommitments.filter((c) => c.rcdoLink.definingObjectiveId === doNode.id);
        if (doCommitments.length === 0) {
          uncoveredObjectives.push({
            definingObjectiveId: doNode.id,
            title: doNode.title,
            rallyCryTitle: rc.title,
            rallyCryId: rc.id,
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

    return buildRallyCryCards(syntheticCoverage, commitments, new Set(commitments.map(c => c.userId)).size, rcdoTree.rallyCries, previousCommitments)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dashboard, commitments, rcdoTree, previousCommitments]);

  const watchItems = useMemo(
    () => buildWatchList(carryChains, costSignals, health?.units, dashboard?.alignmentSignal),
    [carryChains, costSignals, health, dashboard],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center p-8">
        <h1 className="text-title font-medium text-on-surface">No data available</h1>
        <p className="text-body text-on-surface-variant max-w-sm">Could not load data. Please try again.</p>
      </div>
    );
  }

  return (
    <>
      {/* Rally Cry Coverage heading */}
      <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
        <h2 className="font-serif text-[1.25rem] text-on-surface mb-4 font-normal">Rally Cry Coverage</h2>
      </div>

      {/* 3-column rally cry grid */}
      {rallyCryCards.length === 0 ? (
        <div className="bg-surface-lowest rounded-sm p-8 text-center">
          <p className="text-body text-muted">No rally cries with commitment linkage this cycle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {rallyCryCards.map((card, i) => (
            <RallyCryCardComponent
              key={card.rallyCryId}
              card={card}
              index={i}
              onSelect={() => onSelectRallyCry(card.rallyCryId)}
            />
          ))}
        </div>
      )}

      {/* Watch List */}
      {watchItems.length > 0 && (
        <div className="mt-8 animate-fade-up" style={{ animationDelay: '600ms' }}>
          <h2 className="font-serif text-[1.25rem] text-on-surface mb-4 font-normal">Watch List</h2>
          <div className="bg-surface-lowest rounded-sm p-5">
            <ul className="space-y-3">
              {watchItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.severity === 'critical' ? 'bg-error' : 'bg-warning'}`} />
                  {item.drillTarget?.team ? (
                    <button
                      type="button"
                      onClick={() => { onDrillToTeam(item.drillTarget!.team!); }}
                      className="text-body text-on-surface-variant leading-relaxed hover:underline hover:text-on-surface transition-colors text-left"
                      style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
                    >
                      {item.message}
                    </button>
                  ) : (
                    <span className="text-body text-on-surface-variant leading-relaxed">{item.message}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
