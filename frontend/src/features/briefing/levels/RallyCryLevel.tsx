/**
 * Level 0: Rally Cry overview — the landing view of the Briefing.
 * Data processing extracted to rallyCryUtils.ts.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useDashboard } from '@/hooks/useTeamDashboard';
import { useCommitments } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import { useExecutiveHealth, useCarryChains } from '@/hooks/useObservatory';
import { listCycles } from '@/api/cycles.api';
import { getCommitments } from '@/api/commitments.api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import type { RcdoCoverageResponse } from '@/types/dashboard.types';
import { buildRallyCryCards, buildWatchList } from './rallyCryUtils';
import type { RallyCryCard } from './rallyCryUtils';

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
    <button
      type="button"
      className={[
        'bg-surface-lowest rounded-sm p-5 animate-fade-up transition-colors hover:bg-surface cursor-pointer text-left w-full',
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
          <span
            role="button"
            tabIndex={0}
            className="text-[0.75rem] text-muted bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-on-surface-variant"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                setExpanded(!expanded);
              }
            }}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide linked commitments' : 'Show linked commitments'}{' '}
            <span className="text-[0.625rem]">{expanded ? '\u25B4' : '\u25BE'}</span>
          </span>

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
    </button>
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

  // Fetch previous cycle for trend comparison
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
    () => buildWatchList(carryChains, health?.units, dashboard?.alignmentSignal),
    [carryChains, health, dashboard],
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
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.severity === 'critical' ? 'bg-surface-container-high' : 'bg-surface-container'}`} />
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
