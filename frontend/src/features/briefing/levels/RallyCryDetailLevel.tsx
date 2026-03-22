/**
 * Level 1: Rally Cry detail — shows objective breakdown, contributing teams, and coverage gaps.
 * Restyled to Compass design system.
 */
import { useMemo } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import Card from '@/components/Card';
import { Badge } from '@/components/Badge';
import type { Commitment } from '@/types/commitment.types';
import type { RallyCryNode } from '@/types/rcdo.types';

interface RallyCryDetailLevelProps {
  rallyCryId: string;
  onSelectTeam: (managerId: string) => void;
}

interface TeamContribution {
  managerId: string;
  managerName: string;
  commitmentCount: number;
  commitments: Commitment[];
}

export function RallyCryDetailLevel({ rallyCryId, onSelectTeam }: RallyCryDetailLevelProps) {
  const { data: cycle } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';
  const { data: commitments = [], isLoading } = useCommitments(cycleId);
  const { data: rcdoTree } = useRcdoTree();

  const rallyCry = useMemo<RallyCryNode | null>(
    () => rcdoTree?.rallyCries?.find((rc) => rc.id === rallyCryId) ?? null,
    [rcdoTree, rallyCryId],
  );

  const rcCommitments = useMemo(
    () => commitments.filter((c) => c.rcdoLink.rallyCryId === rallyCryId),
    [commitments, rallyCryId],
  );

  const objectiveBreakdown = useMemo(() => {
    if (!rallyCry) return [];
    return rallyCry.definingObjectives.map((doNode) => {
      const doCommitments = rcCommitments.filter((c) => c.rcdoLink.definingObjectiveId === doNode.id);
      return {
        id: doNode.id,
        title: doNode.title,
        commitmentCount: doCommitments.length,
        covered: doCommitments.length > 0,
        outcomes: doNode.outcomes.map((oc) => {
          const ocCommitments = rcCommitments.filter((c) => c.rcdoLink.outcomeId === oc.id);
          return { id: oc.id, title: oc.title, commitmentCount: ocCommitments.length, covered: ocCommitments.length > 0 };
        }),
        // Commitments linked to this DO but not to any specific outcome (stopped at DO level)
        get unassignedToOutcomeCount() {
          const outcomeLinked = doCommitments.filter((c) => c.rcdoLink.outcomeId != null).length;
          return doCommitments.length - outcomeLinked;
        },
      };
    });
  }, [rallyCry, rcCommitments]);

  const teamContributions = useMemo<TeamContribution[]>(() => {
    const byUser = new Map<string, { name: string; commitments: Commitment[] }>();
    for (const c of rcCommitments) {
      if (!byUser.has(c.userId)) byUser.set(c.userId, { name: c.userDisplayName, commitments: [] });
      byUser.get(c.userId)!.commitments.push(c);
    }
    return [...byUser.entries()]
      .map(([userId, data]) => ({
        managerId: userId,
        managerName: data.name,
        commitmentCount: data.commitments.length,
        commitments: data.commitments,
      }))
      .sort((a, b) => b.commitmentCount - a.commitmentCount);
  }, [rcCommitments]);

  if (isLoading) {
    return (
      <div className="px-8 py-6">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  const title = rallyCry?.title ?? 'Rally Cry';
  const coveredCount = objectiveBreakdown.filter((o) => o.covered).length;
  const totalCount = objectiveBreakdown.length;

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-6 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-serif text-headline text-on-surface font-normal">{title}</h1>
        <p className="mt-2 text-body text-on-surface-variant">
          {rcCommitments.length} commitment{rcCommitments.length !== 1 ? 's' : ''} from {teamContributions.length} contributor{teamContributions.length !== 1 ? 's' : ''}.{' '}
          {coveredCount} of {totalCount} objectives covered.
        </p>
      </div>

      {/* Objective Breakdown */}
      <section>
        <h2 className="font-serif text-[1.125rem] text-on-surface mb-4 font-normal">Objectives</h2>
        <div className="space-y-3">
          {objectiveBreakdown.map((obj, i) => (
            <Card
              key={obj.id}
              {...(obj.covered ? {} : { accent: 'rose' as const })}
              className="animate-fade-up"
              padding="normal"
            >
              <div style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${obj.covered ? 'bg-accent' : 'bg-error'}`} />
                    <h3 className="text-body font-medium text-on-surface">{obj.title}</h3>
                  </div>
                  <span className="text-small text-muted">{obj.commitmentCount} commitment{obj.commitmentCount !== 1 ? 's' : ''}</span>
                </div>
                {obj.outcomes.length > 0 && (
                  <div className="mt-2 ml-4 space-y-1">
                    {obj.outcomes.map((oc) => (
                      <div key={oc.id} className="flex items-center justify-between text-small">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className={`w-1.5 h-1.5 rounded-full ${oc.covered ? 'bg-accent/60' : 'bg-error/60'}`} />
                          {oc.title}
                        </div>
                        <span className="text-muted tabular-nums">{oc.commitmentCount}</span>
                      </div>
                    ))}
                    {obj.unassignedToOutcomeCount > 0 && (
                      <div className="flex items-center justify-between text-small">
                        <div className="flex items-center gap-2 text-on-surface-variant/60 italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted/60" />
                          Unassigned to outcome
                        </div>
                        <span className="text-muted tabular-nums">{obj.unassignedToOutcomeCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Contributing Teams/People */}
      <section>
        <h2 className="font-serif text-[1.125rem] text-on-surface mb-4 font-normal">Contributors</h2>
        {teamContributions.length === 0 ? (
          <p className="text-body text-muted">No one is working on this rally cry.</p>
        ) : (
          <div className="space-y-2">
            {teamContributions.map((tc, i) => (
              <Card
                key={tc.managerId}
                hoverable
                className="cursor-pointer animate-fade-up"
                padding="normal"
              >
                <button
                  type="button"
                  onClick={() => { onSelectTeam(tc.managerId); }}
                  className="w-full text-left"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body font-medium text-on-surface">{tc.managerName}</span>
                    <span className="text-small text-muted">{tc.commitmentCount} commitment{tc.commitmentCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tc.commitments.slice(0, 3).map((c) => (
                      <Badge key={c.id} size="sm">{c.title}</Badge>
                    ))}
                    {tc.commitments.length > 3 && <span className="text-small text-muted">+{tc.commitments.length - 3} more</span>}
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
