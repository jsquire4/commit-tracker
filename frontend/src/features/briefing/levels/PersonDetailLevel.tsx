/**
 * Level 3: Person detail — shows individual commitments with RCDO links and reconciliation status.
 * The deepest drill-down level: strategic signal → team → this person.
 */
import { useMemo } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ReconciliationStatus } from '@/types/enums';

const RECON_STATUS: Record<ReconciliationStatus, { label: string; color: string }> = {
  COMPLETED: { label: 'Completed', color: 'text-green-400' },
  PARTIALLY_COMPLETED: { label: 'Partial', color: 'text-amber-400' },
  NOT_STARTED: { label: 'Not Started', color: 'text-red-400' },
  CARRIED_FORWARD: { label: 'Carried Forward', color: 'text-blue-400' },
};

interface PersonDetailLevelProps {
  personId: string;
}

export function PersonDetailLevel({ personId }: PersonDetailLevelProps) {
  const { data: cycle } = useCurrentCycle();
  const cycleId = cycle?.id ?? '';
  const { data: allCommitments = [], isLoading } = useCommitments(cycleId);

  const personCommitments = useMemo(
    () => allCommitments.filter((c) => c.userId === personId),
    [allCommitments, personId],
  );

  const personName = personCommitments[0]?.userDisplayName ?? 'Person';

  // Rally cry coverage for this person
  const rcGroups = useMemo(() => {
    const groups = new Map<string, number>();
    let unlinked = 0;
    for (const c of personCommitments) {
      if (c.rcdoLink.rallyCryTitle) {
        groups.set(c.rcdoLink.rallyCryTitle, (groups.get(c.rcdoLink.rallyCryTitle) ?? 0) + 1);
      } else {
        unlinked += 1;
      }
    }
    const result = [...groups.entries()].map(([title, count]) => ({ title, count }));
    if (unlinked > 0) result.push({ title: 'Unlinked', count: unlinked });
    return result;
  }, [personCommitments]);

  const strategicCount = personCommitments.filter((c) => c.chessCategoryName === 'Strategic').length;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><LoadingSpinner size="lg" label="Loading..." /></div>;
  }

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-50">{personName}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {personCommitments.length} commitment{personCommitments.length !== 1 ? 's' : ''} this week
          {' \u00B7 '}
          {strategicCount} strategic
          {' \u00B7 '}
          {personCommitments.length - strategicCount} other
        </p>
      </div>

      {/* Rally cry coverage */}
      {rcGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rcGroups.map((g) => (
            <span key={g.title} className={`text-xs px-2 py-1 rounded ${g.title === 'Unlinked' ? 'bg-gray-800 text-gray-400' : 'bg-blue-800/40 text-blue-300'}`}>
              {g.title} ({g.count})
            </span>
          ))}
        </div>
      )}

      {/* Commitments */}
      <div className="space-y-3">
        {personCommitments.map((c) => {
          const reconStatus = c.reconciliationStatus ? RECON_STATUS[c.reconciliationStatus] : null;
          return (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">{c.priorityRank}</span>
                    <h3 className="text-sm font-semibold text-gray-100 truncate">{c.title}</h3>
                  </div>

                  {/* RCDO breadcrumb */}
                  {c.rcdoLink.rallyCryTitle && (
                    <p className="mt-1 text-xs text-gray-500 ml-7">
                      {c.rcdoLink.rallyCryTitle}
                      {c.rcdoLink.definingObjectiveTitle && ` \u203A ${c.rcdoLink.definingObjectiveTitle}`}
                      {c.rcdoLink.outcomeTitle && ` \u203A ${c.rcdoLink.outcomeTitle}`}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="mt-2 ml-7 flex flex-wrap gap-1.5">
                    {c.chessCategoryName && <Badge variant={c.chessCategoryName === 'Strategic' ? 'blue' : 'gray'}>{c.chessCategoryName}</Badge>}
                    {c.isUnplanned && <Badge variant="gray">Unplanned</Badge>}
                    {c.carriedFromCommitmentId && <Badge variant="blue">Carried Forward</Badge>}
                  </div>

                  {/* Task bullets */}
                  {c.bullets.length > 0 && (
                    <ul className="mt-2 ml-7 space-y-0.5">
                      {c.bullets.map((b) => (
                        <li key={b.id} className="flex items-center gap-2 text-xs text-gray-400">
                          <span className={b.isCompleted ? 'text-green-500' : 'text-gray-600'}>{b.isCompleted ? '\u2713' : '\u25CB'}</span>
                          <span className={b.isCompleted ? 'line-through opacity-60' : ''}>{b.body}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Reconciliation status */}
                {reconStatus && (
                  <span className={`text-xs font-medium whitespace-nowrap ${reconStatus.color}`}>
                    {reconStatus.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {personCommitments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No commitments found for this person.</p>
        )}
      </div>
    </div>
  );
}
