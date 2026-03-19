/**
 * Level 1: Rally Cry detail — shows objective breakdown, contributing teams, and coverage gaps.
 * This is the "show your work" behind a rally cry card.
 */
import { useMemo } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useRcdoTree } from '@/hooks/useRcdo';
import { LoadingSpinner } from '@/components/LoadingSpinner';
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

  // Find the rally cry node
  const rallyCry = useMemo<RallyCryNode | null>(
    () => rcdoTree?.rallyCries?.find((rc) => rc.id === rallyCryId) ?? null,
    [rcdoTree, rallyCryId],
  );

  // Filter commitments linked to this rally cry
  const rcCommitments = useMemo(
    () => commitments.filter((c) => c.rcdoLink.rallyCryId === rallyCryId),
    [commitments, rallyCryId],
  );

  // Group by defining objective
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
      };
    });
  }, [rallyCry, rcCommitments]);

  // Group by user (as a proxy for team contribution)
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
    return <div className="flex items-center justify-center min-h-[40vh]"><LoadingSpinner size="lg" label="Loading detail..." /></div>;
  }

  const title = rallyCry?.title ?? 'Rally Cry';
  const coveredCount = objectiveBreakdown.filter((o) => o.covered).length;
  const totalCount = objectiveBreakdown.length;

  return (
    <div className="px-8 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-50">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {rcCommitments.length} commitment{rcCommitments.length !== 1 ? 's' : ''} from {teamContributions.length} contributor{teamContributions.length !== 1 ? 's' : ''}.{' '}
          {coveredCount} of {totalCount} objectives covered.
        </p>
      </div>

      {/* Objective Breakdown */}
      <section>
        <h2 className="text-base font-semibold text-gray-200 mb-4">Objectives</h2>
        <div className="space-y-3">
          {objectiveBreakdown.map((obj) => (
            <div key={obj.id} className={`rounded-lg border p-4 ${obj.covered ? 'border-gray-800 bg-gray-900' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${obj.covered ? 'bg-green-500' : 'bg-red-500'}`} />
                  <h3 className="text-sm font-semibold text-gray-100">{obj.title}</h3>
                </div>
                <span className="text-xs text-gray-500">{obj.commitmentCount} commitment{obj.commitmentCount !== 1 ? 's' : ''}</span>
              </div>
              {obj.outcomes.length > 0 && (
                <div className="mt-2 ml-4 space-y-1">
                  {obj.outcomes.map((oc) => (
                    <div key={oc.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${oc.covered ? 'bg-green-500/60' : 'bg-red-500/60'}`} />
                        {oc.title}
                      </div>
                      <span className="text-gray-600">{oc.commitmentCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contributing Teams/People */}
      <section>
        <h2 className="text-base font-semibold text-gray-200 mb-4">Contributors</h2>
        {teamContributions.length === 0 ? (
          <p className="text-sm text-gray-500">No one is working on this rally cry.</p>
        ) : (
          <div className="space-y-2">
            {teamContributions.map((tc) => (
              <button
                key={tc.managerId}
                type="button"
                onClick={() => { onSelectTeam(tc.managerId); }}
                className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-100">{tc.managerName}</span>
                  <span className="text-xs text-gray-500">{tc.commitmentCount} commitment{tc.commitmentCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tc.commitments.slice(0, 3).map((c) => (
                    <span key={c.id} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{c.title}</span>
                  ))}
                  {tc.commitments.length > 3 && <span className="text-xs text-gray-600">+{tc.commitments.length - 3} more</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
