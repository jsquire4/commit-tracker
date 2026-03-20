/**
 * Level 3: Person detail — shows individual commitments with RCDO links and reconciliation status.
 * Restyled to Compass design system.
 */
import { useMemo } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { Badge } from '@/components/Badge';
import Card from '@/components/Card';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import type { ReconciliationStatus } from '@/types/enums';

const RECON_STATUS: Record<ReconciliationStatus, { label: string; className: string }> = {
  COMPLETED: { label: 'Completed', className: 'text-accent' },
  PARTIALLY_COMPLETED: { label: 'Partial', className: 'text-warning' },
  NOT_STARTED: { label: 'Not Started', className: 'text-error' },
  CARRIED_FORWARD: { label: 'Carried Forward', className: 'text-navy' },
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
    return (
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-serif text-headline text-on-surface font-normal">{personName}</h1>
        <p className="mt-2 text-body text-on-surface-variant">
          {personCommitments.length} commitment{personCommitments.length !== 1 ? 's' : ''} this week
          {' \u00B7 '}
          {strategicCount} strategic
          {' \u00B7 '}
          {personCommitments.length - strategicCount} other
        </p>
      </div>

      {/* Rally cry coverage */}
      {rcGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: '40ms' }}>
          {rcGroups.map((g) => (
            <Badge
              key={g.title}
              variant={g.title === 'Unlinked' ? 'default' : 'category'}
              {...(g.title !== 'Unlinked' ? { color: 'strategic' as const } : {})}
            >
              {g.title} ({g.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Commitments */}
      <div className="space-y-3">
        {personCommitments.map((c, i) => {
          const reconStatus = c.reconciliationStatus ? RECON_STATUS[c.reconciliationStatus] : null;
          const chessCat = c.chessCategoryName?.toLowerCase() as 'strategic' | 'operational' | 'defensive' | 'capability' | undefined;
          return (
            <Card
              key={c.id}
              padding="normal"
              className="animate-fade-up"
            >
              <div style={{ animationDelay: `${(i + 2) * 40}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold text-muted">{c.priorityRank}</span>
                      <h3 className="text-body font-medium text-on-surface truncate">{c.title}</h3>
                    </div>

                    {/* RCDO breadcrumb */}
                    {c.rcdoLink.rallyCryTitle && (
                      <p className="mt-1 text-small text-muted ml-7">
                        {c.rcdoLink.rallyCryTitle}
                        {c.rcdoLink.definingObjectiveTitle && ` \u203A ${c.rcdoLink.definingObjectiveTitle}`}
                        {c.rcdoLink.outcomeTitle && ` \u203A ${c.rcdoLink.outcomeTitle}`}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="mt-2 ml-7 flex flex-wrap gap-1.5">
                      {chessCat && <Badge variant="category" color={chessCat}>{c.chessCategoryName}</Badge>}
                      {c.isUnplanned && <Badge>Unplanned</Badge>}
                      {c.carriedFromCommitmentId && <Badge variant="category" color="strategic">Carried Forward</Badge>}
                    </div>

                    {/* Task bullets */}
                    {c.bullets.length > 0 && (
                      <ul className="mt-2 ml-7 space-y-0.5">
                        {c.bullets.map((b) => (
                          <li key={b.id} className="flex items-center gap-2 text-small text-on-surface-variant">
                            <span className={b.isCompleted ? 'text-accent' : 'text-muted'}>{b.isCompleted ? '\u2713' : '\u25CB'}</span>
                            <span className={b.isCompleted ? 'line-through opacity-60' : ''}>{b.body}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Reconciliation status */}
                  {reconStatus && (
                    <span className={`text-small font-medium whitespace-nowrap ${reconStatus.className}`}>
                      {reconStatus.label}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {personCommitments.length === 0 && (
          <p className="text-body text-muted text-center py-8">No commitments found for this person.</p>
        )}
      </div>
    </div>
  );
}
