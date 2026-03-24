/**
 * Pure data-processing functions for the Rally Cry Level view.
 * Extracted from RallyCryLevel.tsx to reduce file size and improve testability.
 */
import type { Commitment } from '@/types/commitment.types';
import type { RallyCryNode } from '@/types/rcdo.types';
import type { RcdoCoverageResponse, AlignmentSignalResponse } from '@/types/dashboard.types';
import type { CarryForwardChain, OrgUnitHealth } from '@/types/observatory.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RallyCryStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

export interface RallyCryCard {
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
  commitmentsByPerson: { name: string; titles: string[] }[];
}

export interface WatchItem {
  id: string;
  message: string;
  severity: 'warning' | 'critical';
  drillTarget: { team?: string; person?: string } | null;
}

// ─── buildRallyCryCards ─────────────────────────────────────────────────────

export function buildRallyCryCards(
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

// ─── buildWatchList ─────────────────────────────────────────────────────────

export function buildWatchList(
  carryChains: CarryForwardChain[] | undefined,
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

  if (healthUnits) {
    for (const unit of healthUnits.filter((u) => u.trendDirection.toUpperCase() === 'DECLINING' && u.weeksTrending >= 2).slice(0, 5)) {
      items.push({ id: `decline-${unit.managerId}`, message: `${unit.managerName}'s team: rally cry coverage trending down for ${unit.weeksTrending} weeks (${Math.round(unit.strategicAlignmentPct)}%)`, severity: unit.weeksTrending >= 4 ? 'critical' : 'warning', drillTarget: { team: unit.managerId } });
    }
  }

  return items;
}
