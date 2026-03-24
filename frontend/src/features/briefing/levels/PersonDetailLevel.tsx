/**
 * Level 3: Person detail — shows individual commitments with RCDO links and reconciliation status.
 * Restyled to Compass design system.
 */
import { useMemo } from 'react';
import { useCurrentCycle } from '@/hooks/useCycle';
import { useCommitments } from '@/hooks/useCommitments';
import { useTeamMemberStory } from '@/hooks/useIcInsights';
import { Badge } from '@/components/Badge';
import Card from '@/components/Card';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import type { ReconciliationStatus } from '@/types/enums';
import type { GrowthAreaAlignmentDetail } from '@/types/ic-insights.types';

// ── Personal Goal Alignment Card ──────────────────────────────────────────────

function PersonalGoalAlignmentCard({ personId }: { personId: string }) {
  const { data, isLoading, isError } = useTeamMemberStory(personId, 12);

  if (isLoading) {
    return (
      <Card padding="normal">
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 w-40 bg-surface-container rounded" />
          <div className="h-3 w-24 bg-surface-container rounded mt-1" />
        </div>
      </Card>
    );
  }

  if (isError || !data) {
    return null;
  }

  const { overallAlignmentPct, growthAreaAlignmentDetails } = data;
  const activeAreas = growthAreaAlignmentDetails.filter((a: GrowthAreaAlignmentDetail) => a.isActive);

  return (
    <Card padding="normal">
      <h3 className="text-body font-medium text-on-surface mb-3">Personal Goal Alignment</h3>

      {/* Overall alignment pct */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[1.5rem] font-semibold text-on-surface tabular-nums leading-none">
          {Math.round(overallAlignmentPct)}%
        </span>
        <span className="text-small text-muted">of tasks aligned to personal goals (last 12 weeks)</span>
      </div>

      {activeAreas.length === 0 ? (
        <p className="text-small text-muted italic">No personal goals set.</p>
      ) : (
        <ul className="space-y-1.5">
          {activeAreas.map((area: GrowthAreaAlignmentDetail) => (
            <li key={area.growthAreaId} className="flex items-center justify-between gap-3">
              <span className="text-small text-on-surface-variant truncate">{area.label}</span>
              <span className="text-small font-medium text-on-surface tabular-nums whitespace-nowrap flex-shrink-0">
                {area.alignedCommitmentCount} task{area.alignedCommitmentCount !== 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Commitment status config ───────────────────────────────────────────────────

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
    const groups = new Map<string, { title: string; count: number }>();
    let unlinked = 0;
    for (const c of personCommitments) {
      if (c.rcdoLink.rallyCryId) {
        const existing = groups.get(c.rcdoLink.rallyCryId);
        if (existing) {
          existing.count += 1;
        } else {
          groups.set(c.rcdoLink.rallyCryId, { title: c.rcdoLink.rallyCryTitle ?? c.rcdoLink.rallyCryId, count: 1 });
        }
      } else {
        unlinked += 1;
      }
    }
    const result = [...groups.values()].map(({ title, count }) => ({ title, count }));
    if (unlinked > 0) result.push({ title: 'Unlinked', count: unlinked });
    return result;
  }, [personCommitments]);

  const strategicCount = personCommitments.filter((c) => c.chessCategoryName?.toUpperCase() === 'STRATEGIC').length;

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

      {/* Personal Goal Alignment */}
      <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        <PersonalGoalAlignmentCard personId={personId} />
      </div>

      {/* Commitments */}
      <div className="space-y-3">
        {personCommitments.map((c, i) => {
          const reconStatus = c.reconciliationStatus ? RECON_STATUS[c.reconciliationStatus] : null;
          const CHESS_CATEGORY_MAP: Record<string, 'strategic' | 'operational' | 'defensive' | 'capability'> = {
            strategic: 'strategic',
            operational: 'operational',
            defensive: 'defensive',
            capability: 'capability',
            'capability building': 'capability',
          };
          const chessCat = c.chessCategoryName
            ? CHESS_CATEGORY_MAP[c.chessCategoryName.toLowerCase()]
            : undefined;
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
