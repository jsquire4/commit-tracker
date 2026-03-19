import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import {
  useExecutiveHealth,
  useCarryChains,
  useCostImpact,
} from '@/hooks/useObservatory';
import { listCycles } from '@/api/cycles.api';
import { getCommitments } from '@/api/commitments.api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { UserRole } from '@/types';
import type { RallyCryNode } from '@/types/rcdo.types';
import type { Commitment } from '@/types/commitment.types';
import type {
  RcdoCoverageResponse,
  AlignmentSignalResponse,
} from '@/types/dashboard.types';
import type {
  CarryForwardChain,
  CostWeightedSignal,
  OrgUnitHealth,
} from '@/types/observatory.types';

// ─── Constants ───────────────────────────────────────────────────────────────────

const ALLOWED_ROLES: UserRole[] = ['DIRECTOR', 'VP', 'EXECUTIVE'];

type RallyCryStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

const STATUS_LABEL: Record<RallyCryStatus, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  OFF_TRACK: 'Off Track',
};

const STATUS_DOT: Record<RallyCryStatus, string> = {
  ON_TRACK: 'bg-green-500',
  AT_RISK: 'bg-amber-500',
  OFF_TRACK: 'bg-red-500',
};

const STATUS_BADGE_BG: Record<RallyCryStatus, string> = {
  ON_TRACK: 'bg-green-500/10 border-green-500/30 text-green-400',
  AT_RISK: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  OFF_TRACK: 'bg-red-500/10 border-red-500/30 text-red-400',
};

const STATUS_GLOW: Record<RallyCryStatus, string> = {
  ON_TRACK: 'shadow-green-500/5',
  AT_RISK: 'shadow-amber-500/5',
  OFF_TRACK: 'shadow-red-500/10',
};

// ─── Derived Types ───────────────────────────────────────────────────────────────

interface CoveredObjectiveDetail {
  definingObjectiveId: string;
  title: string;
  commitmentCount: number;
}

interface RallyCryCard {
  rallyCryId: string;
  title: string;
  status: RallyCryStatus;
  commitmentCount: number;
  narrative: string;
  coveredObjectiveCount: number;
  totalObjectiveCount: number;
  uncoveredObjectives: { definingObjectiveId: string; title: string }[];
  coveredObjectives: CoveredObjectiveDetail[];
  contributingTeams: string[];
  sortOrder: number;
  trendDirection: 'up' | 'down' | 'flat' | null;
}

interface WatchItem {
  id: string;
  message: string;
  severity: 'warning' | 'critical';
  linkTo: string | null;
}

// ─── Data Processing ─────────────────────────────────────────────────────────────

function buildRallyCryCards(
  rcdo: RcdoCoverageResponse,
  commitments: Commitment[],
  totalHeadcount: number,
  rcdoTree: RallyCryNode[] | undefined,
  previousCommitments: Commitment[] | undefined,
): RallyCryCard[] {
  // Group commitments by rally cry
  const commitsByRC = new Map<string, Commitment[]>();
  for (const c of commitments) {
    const rcId = c.rcdoLink.rallyCryId;
    if (!rcId) continue;
    if (!commitsByRC.has(rcId)) commitsByRC.set(rcId, []);
    commitsByRC.get(rcId)!.push(c);
  }

  // Group previous-cycle commitments by rally cry for trend comparison
  const prevCommitsByRC = new Map<string, number>();
  if (previousCommitments) {
    for (const c of previousCommitments) {
      const rcId = c.rcdoLink.rallyCryId;
      if (!rcId) continue;
      prevCommitsByRC.set(rcId, (prevCommitsByRC.get(rcId) ?? 0) + 1);
    }
  }

  // Build sortOrder lookup from RCDO tree
  const sortOrderMap = new Map<string, number>();
  if (rcdoTree) {
    for (const rc of rcdoTree) {
      sortOrderMap.set(rc.id, rc.sortOrder);
    }
  }

  // Build a lookup for defining objective titles from the RCDO tree
  const doTitleMap = new Map<string, string>();
  if (rcdoTree) {
    for (const rc of rcdoTree) {
      for (const dObj of rc.definingObjectives) {
        doTitleMap.set(dObj.id, dObj.title);
      }
    }
  }

  // Group uncovered objectives by rally cry title
  const uncoveredByRC = new Map<string, { definingObjectiveId: string; title: string }[]>();
  for (const uo of rcdo.uncoveredObjectives) {
    if (!uncoveredByRC.has(uo.rallyCryTitle)) uncoveredByRC.set(uo.rallyCryTitle, []);
    uncoveredByRC.get(uo.rallyCryTitle)!.push({
      definingObjectiveId: uo.definingObjectiveId,
      title: uo.title,
    });
  }

  return rcdo.byRallyCry.map((rc) => {
    const rcCommitments = commitsByRC.get(rc.rallyCryId) ?? [];
    const uncovered = uncoveredByRC.get(rc.title) ?? [];

    // Find unique contributors
    const contributorNames = new Set<string>();
    for (const c of rcCommitments) {
      contributorNames.add(c.userDisplayName);
    }
    const contributingTeams = [...contributorNames];

    // Build covered objectives with commitment counts
    const coveredObjectiveMap = new Map<string, { title: string; count: number }>();
    for (const c of rcCommitments) {
      const doId = c.rcdoLink.definingObjectiveId;
      if (!doId) continue;
      const existing = coveredObjectiveMap.get(doId);
      if (existing) {
        existing.count += 1;
      } else {
        const title = c.rcdoLink.definingObjectiveTitle ?? doTitleMap.get(doId) ?? 'Unknown Objective';
        coveredObjectiveMap.set(doId, { title, count: 1 });
      }
    }

    const coveredObjectives: CoveredObjectiveDetail[] = [...coveredObjectiveMap.entries()].map(
      ([doId, info]) => ({
        definingObjectiveId: doId,
        title: info.title,
        commitmentCount: info.count,
      }),
    );

    const coveredCount = coveredObjectives.length;
    const totalObjectiveCount = coveredCount + uncovered.length;

    // Determine status
    let status: RallyCryStatus;
    const commitRatio = totalHeadcount > 0
      ? rcCommitments.length / totalHeadcount
      : 0;

    if (rcCommitments.length === 0 || commitRatio < 0.05) {
      status = 'OFF_TRACK';
    } else if (uncovered.length > 0) {
      status = 'AT_RISK';
    } else {
      status = 'ON_TRACK';
    }

    // Build narrative
    const narrative = buildNarrative(
      rc.title,
      status,
      contributingTeams,
      uncovered.length,
      rcCommitments.length,
      totalHeadcount,
    );

    // Trend direction
    let trendDirection: 'up' | 'down' | 'flat' | null = null;
    if (previousCommitments) {
      const prevCount = prevCommitsByRC.get(rc.rallyCryId) ?? 0;
      const currCount = rc.commitmentCount;
      if (currCount > prevCount) {
        trendDirection = 'up';
      } else if (currCount < prevCount) {
        trendDirection = 'down';
      } else {
        trendDirection = 'flat';
      }
    }

    return {
      rallyCryId: rc.rallyCryId,
      title: rc.title,
      status,
      commitmentCount: rc.commitmentCount,
      narrative,
      coveredObjectiveCount: coveredCount,
      totalObjectiveCount,
      uncoveredObjectives: uncovered,
      coveredObjectives,
      contributingTeams,
      sortOrder: sortOrderMap.get(rc.rallyCryId) ?? 999,
      trendDirection,
    };
  });
}

function buildNarrative(
  _title: string,
  status: RallyCryStatus,
  contributors: string[],
  uncoveredCount: number,
  commitmentCount: number,
  headcount: number,
): string {
  const topContributors = contributors.slice(0, 3);
  const remaining = contributors.length - topContributors.length;
  const contributorText = topContributors.length > 0
    ? topContributors.join(', ') + (remaining > 0 ? ` and ${String(remaining)} others` : '')
    : 'No one';

  if (status === 'OFF_TRACK') {
    if (commitmentCount === 0) {
      return `No commitments are linked to this rally cry. None of the ${String(headcount)} team members have prioritized work here this cycle.`;
    }
    return `Only ${String(commitmentCount)} commitment${commitmentCount === 1 ? '' : 's'} linked across ${String(headcount)} team members. ${contributorText} ${contributors.length === 1 ? 'is' : 'are'} contributing, but coverage is critically thin.`;
  }

  if (status === 'AT_RISK') {
    return `${contributorText} ${contributors.length === 1 ? 'is' : 'are'} driving work here with ${String(commitmentCount)} commitment${commitmentCount === 1 ? '' : 's'}, but ${String(uncoveredCount)} objective${uncoveredCount === 1 ? ' has' : 's have'} no commitments mapped to ${uncoveredCount === 1 ? 'it' : 'them'}.`;
  }

  // ON_TRACK
  return `${contributorText} ${contributors.length === 1 ? 'is' : 'are'} actively contributing with ${String(commitmentCount)} commitment${commitmentCount === 1 ? '' : 's'}. All objectives have coverage this cycle.`;
}

function buildWatchList(
  _commitments: Commitment[],
  carryChains: CarryForwardChain[] | undefined,
  costSignals: CostWeightedSignal[] | undefined,
  healthUnits: OrgUnitHealth[] | undefined,
  alignment: AlignmentSignalResponse | undefined,
): WatchItem[] {
  const items: WatchItem[] = [];

  // Teams/people with 0 rally cry linkage
  if (alignment?.byTeamMember) {
    const unlinkedMembers = alignment.byTeamMember.filter(
      (m) => m.unlinkedCount > 0 && m.unlinkedCount === Object.values(m.distribution).reduce((s, d) => s + d.count, 0),
    );
    for (const m of unlinkedMembers.slice(0, 5)) {
      items.push({
        id: `unlinked-${m.userId}`,
        message: `${m.displayName} has ${String(m.unlinkedCount)} commitment${m.unlinkedCount === 1 ? '' : 's'} with no rally cry linkage`,
        severity: 'warning',
        linkTo: `/observatory/team/${m.userId}`,
      });
    }
  }

  // Carry-forward chains > 2 weeks
  if (carryChains) {
    const longChains = carryChains.filter((c) => c.chainLength > 2);
    for (const chain of longChains.slice(0, 5)) {
      items.push({
        id: `carry-${chain.commitmentId}`,
        message: `"${chain.title}" carried forward ${String(chain.chainLength)} weeks by ${chain.userDisplayName} (since ${chain.originCycleLabel})`,
        severity: chain.chainLength > 4 ? 'critical' : 'warning',
        linkTo: `/observatory/team/${chain.userId}`,
      });
    }
  }

  // High misalignment cost individuals
  if (costSignals) {
    const highCost = costSignals
      .filter((s) => parseFloat(s.misalignmentCost) > 0)
      .sort((a, b) => parseFloat(b.misalignmentCost) - parseFloat(a.misalignmentCost))
      .slice(0, 3);
    for (const signal of highCost) {
      const cost = parseFloat(signal.misalignmentCost);
      items.push({
        id: `cost-${signal.userId}`,
        message: `${signal.displayName} (${signal.costBandName}): ${String(Math.round(cost))}h equivalent misalignment cost from non-strategic work`,
        severity: cost > 20 ? 'critical' : 'warning',
        linkTo: `/observatory/team/${signal.userId}`,
      });
    }
  }

  // Declining trend teams
  if (healthUnits) {
    const declining = healthUnits.filter(
      (u) => u.trendDirection === 'DECLINING' && u.weeksTrending >= 2,
    );
    for (const unit of declining.slice(0, 5)) {
      items.push({
        id: `decline-${unit.managerId}`,
        message: `${unit.managerName}'s team declining for ${String(unit.weeksTrending)} consecutive weeks (${String(Math.round(unit.strategicAlignmentPct))}% strategic alignment)`,
        severity: unit.weeksTrending >= 4 ? 'critical' : 'warning',
        linkTo: `/observatory/team/${unit.managerId}`,
      });
    }
  }

  return items;
}

// ─── Sub-components ──────────────────────────────────────────────────────────────

function Headline({
  totalRallyCries,
  onTrackCount,
  needAttentionCount,
  cycleLabel,
  completionRate,
}: {
  totalRallyCries: number;
  onTrackCount: number;
  needAttentionCount: number;
  cycleLabel: string;
  completionRate: number;
}) {
  return (
    <header className="px-8 py-10 bg-gray-950 animate-briefing-fade-in">
      <h1 className="text-3xl font-bold text-gray-50 tracking-tight">
        You set {String(totalRallyCries)} priorit{totalRallyCries === 1 ? 'y' : 'ies'}.{' '}
        <span className="text-green-400">{String(onTrackCount)} on track</span>
        {needAttentionCount > 0 && (
          <>
            ,{' '}
            <span className="text-amber-400">
              {String(needAttentionCount)} need{needAttentionCount === 1 ? 's' : ''} attention
            </span>
          </>
        )}
        .
      </h1>
      <div className="mt-3 flex items-center gap-4">
        <span className="text-sm text-gray-500">{cycleLabel}</span>
        <span className="text-xs text-gray-600">|</span>
        <span className="text-sm text-gray-500">
          {String(Math.round(completionRate))}% completion rate
        </span>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: RallyCryStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${STATUS_BADGE_BG[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ObjectiveProgressBar({
  covered,
  total,
}: {
  covered: number;
  total: number;
}) {
  if (total === 0) return null;
  const pct = Math.round((covered / total) * 100);
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${String(pct)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
        {String(pct)}%
      </span>
    </div>
  );
}

const TREND_INDICATOR: Record<'up' | 'down' | 'flat', { symbol: string; color: string }> = {
  up: { symbol: '\u2191', color: 'text-green-400' },
  down: { symbol: '\u2193', color: 'text-red-400' },
  flat: { symbol: '\u2192', color: 'text-gray-500' },
};

function RallyCryStatusCard({
  card,
  index,
}: {
  card: RallyCryCard;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg animate-briefing-stagger ${STATUS_GLOW[card.status]}`}
      style={{
        animationDelay: `${(index + 1) * 100}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Status badge */}
      <div className="mb-3">
        <StatusBadge status={card.status} />
      </div>

      {/* Rally cry title */}
      <h2 className="text-xl font-bold text-gray-50 mb-3 leading-snug">
        {card.title}
      </h2>

      {/* Narrative */}
      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        {card.narrative}
      </p>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
        <span>
          <span className="text-gray-300 font-medium">
            {String(card.coveredObjectiveCount)}
          </span>{' '}
          of{' '}
          <span className="text-gray-300 font-medium">
            {String(card.totalObjectiveCount)}
          </span>{' '}
          objectives covered
        </span>
        {card.contributingTeams.length > 0 && (
          <span>
            Contributors:{' '}
            <span className="text-gray-300 font-medium">
              {card.contributingTeams.length <= 3
                ? card.contributingTeams.join(', ')
                : `${card.contributingTeams.slice(0, 3).join(', ')} +${String(card.contributingTeams.length - 3)}`}
            </span>
          </span>
        )}
        <span>
          <span className="text-gray-300 font-medium">
            {String(card.commitmentCount)}
          </span>{' '}
          commitment{card.commitmentCount === 1 ? '' : 's'}
          {card.trendDirection !== null && (
            <span
              className={`ml-1 ${TREND_INDICATOR[card.trendDirection].color}`}
              title={
                card.trendDirection === 'up'
                  ? 'Up from previous cycle'
                  : card.trendDirection === 'down'
                    ? 'Down from previous cycle'
                    : 'Same as previous cycle'
              }
            >
              {TREND_INDICATOR[card.trendDirection].symbol}
            </span>
          )}
        </span>
      </div>

      {/* Inline progress bar */}
      <ObjectiveProgressBar
        covered={card.coveredObjectiveCount}
        total={card.totalObjectiveCount}
      />

      {/* Expandable objective breakdown */}
      {card.totalObjectiveCount > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800/60">
          <button
            type="button"
            onClick={() => { setExpanded(!expanded); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {expanded ? 'Hide' : 'Show'} objective breakdown
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-briefing-fade-in">
              {card.coveredObjectives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-1.5 uppercase tracking-wider">
                    Covered ({String(card.coveredObjectiveCount)})
                  </p>
                  {card.coveredObjectives.map((obj) => (
                    <div
                      key={obj.definingObjectiveId}
                      className="flex items-center justify-between gap-2 py-1 text-sm text-gray-400"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 flex-shrink-0" />
                        {obj.title}
                      </span>
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {String(obj.commitmentCount)} commitment{obj.commitmentCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {card.uncoveredObjectives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1.5 uppercase tracking-wider">
                    Uncovered
                  </p>
                  {card.uncoveredObjectives.map((obj) => (
                    <div
                      key={obj.definingObjectiveId}
                      className="flex items-center gap-2 py-1 text-sm text-gray-400"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />
                      {obj.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WatchList({ items }: { items: WatchItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      className="px-8 pb-10 animate-briefing-stagger"
      style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
    >
      <h2 className="text-lg font-bold text-gray-100 mb-4">Watch List</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span
                className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  item.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
              {item.linkTo ? (
                <Link
                  to={item.linkTo}
                  className="text-sm text-gray-400 leading-relaxed hover:underline hover:text-gray-200 transition-colors"
                >
                  {item.message}
                </Link>
              ) : (
                <span className="text-sm text-gray-400 leading-relaxed">
                  {item.message}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export function BriefingPage() {
  const { role } = useAuth();

  // All hooks must be called unconditionally (React rules of hooks)
  const { data: cycle, isLoading: cycleLoading } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';

  const { data: dashboard, isLoading: dashLoading } = useDashboard({
    includeSubtree: true,
  });
  const { data: commitments, isLoading: commitmentsLoading } = useCommitments(cycleId);
  const { data: rcdoTree } = useRcdoTree();
  const { data: health } = useExecutiveHealth(6);
  const { data: carryChains } = useCarryChains(cycleId);
  const { data: costSignals } = useCostImpact(cycleId);

  // Fetch previous cycle for trend comparison
  const { data: previousCycleData } = useQuery({
    queryKey: ['cycles', 'previous', cycle?.startsAt],
    queryFn: async () => {
      if (!cycle?.startsAt) return null;
      const result = await listCycles({
        dateTo: cycle.startsAt,
      });
      // The current cycle may appear in results — filter it out and take the most recent
      const previous = result.items
        .filter((c: { id: string }) => c.id !== cycle.id)
        .sort((a: { startsAt: string }, b: { startsAt: string }) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      return previous[0] ?? null;
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(cycle?.startsAt),
  });

  const previousCycleId = previousCycleData?.id ?? '';

  const { data: previousCommitments } = useQuery({
    queryKey: ['commitments', 'previous', previousCycleId],
    queryFn: () => getCommitments(previousCycleId),
    staleTime: 5 * 60_000,
    enabled: Boolean(previousCycleId),
  });

  const isLoading = cycleLoading || dashLoading || commitmentsLoading;

  // Role guard (after hooks)
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          The Weekly Briefing is only accessible to Directors, VPs, and Executives.
        </p>
      </div>
    );
  }

  // Derive rally cry cards — sorted by RCDO tree sortOrder
  const rallyCryCards = useMemo(() => {
    if (!dashboard?.rcdoCoverage || !commitments) return [];
    const headcount = dashboard.teamRollup?.members?.length ?? 0;
    const cards = buildRallyCryCards(
      dashboard.rcdoCoverage,
      commitments,
      headcount,
      rcdoTree?.rallyCries,
      previousCommitments,
    );
    // Sort by executive-defined sortOrder from RCDO tree
    return cards.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dashboard, commitments, rcdoTree, previousCommitments]);

  // Derive headline counts
  const onTrackCount = rallyCryCards.filter((c) => c.status === 'ON_TRACK').length;
  const needAttentionCount = rallyCryCards.filter(
    (c) => c.status === 'AT_RISK' || c.status === 'OFF_TRACK',
  ).length;

  // Derive watch list
  const watchItems = useMemo(
    () =>
      buildWatchList(
        commitments ?? [],
        carryChains,
        costSignals,
        health?.units,
        dashboard?.alignmentSignal,
      ),
    [commitments, carryChains, costSignals, health, dashboard],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <LoadingSpinner size="lg" label="Preparing your briefing\u2026" />
      </div>
    );
  }

  if (!dashboard || !cycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-100">No data available</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          Could not load dashboard or cycle data. Please try again later.
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

  const completionRate = health?.completionRate ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Section A: Headline */}
      <Headline
        totalRallyCries={rallyCryCards.length}
        onTrackCount={onTrackCount}
        needAttentionCount={needAttentionCount}
        cycleLabel={cycle.label}
        completionRate={completionRate}
      />

      {/* Section B: Rally Cry Status Cards */}
      <section className="px-8 pb-8">
        {rallyCryCards.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">
              No rally cries with commitment linkage this cycle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {rallyCryCards.map((card, i) => (
              <RallyCryStatusCard key={card.rallyCryId} card={card} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Section C: Watch List */}
      <WatchList items={watchItems} />

      {/* CSS animations */}
      <style>{`
        @keyframes briefing-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes briefing-stagger {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-briefing-fade-in {
          animation: briefing-fade-in 0.35s ease-out;
        }

        .animate-briefing-stagger {
          animation: briefing-stagger 0.45s ease-out;
        }
      `}</style>
    </div>
  );
}
