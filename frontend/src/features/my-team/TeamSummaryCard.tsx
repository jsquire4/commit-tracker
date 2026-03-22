import Card from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useTeamSummary } from '@/hooks/useTeamSummary';
import type { DashboardResponse, Commitment } from '@/types';

interface TeamSummaryCardProps {
  dashboard: DashboardResponse;
  commitments: Commitment[];
  cycleWeekStart?: string;
}

interface SuggestedAction {
  text: string;
}

function buildSummary(dashboard: DashboardResponse, commitments: Commitment[]): {
  headline: string;
  narrative: string;
  actions: SuggestedAction[];
} {
  const members = dashboard.teamRollup?.members ?? [];
  const teamSize = members.length;
  const coverage = dashboard.rcdoCoverage;
  const linkedPct = Math.round(coverage?.linkedPercentage ?? 0);
  const unlinked = coverage?.unlinkedCount ?? 0;
  const uncovered = coverage?.uncoveredObjectives ?? [];
  const carried = commitments.filter((c) => c.carriedFromCommitmentId != null).length;
  const total = commitments.length;
  const carryPct = total > 0 ? Math.round((carried / total) * 100) : 0;

  // Find members with all unlinked commitments
  const memberCommitments: Record<string, { name: string; unlinked: number; total: number }> = {};
  for (const c of commitments) {
    const member = members.find((m) => m.userId === c.userId);
    if (!member) continue;
    if (!memberCommitments[c.userId]) {
      memberCommitments[c.userId] = { name: member.displayName, unlinked: 0, total: 0 };
    }
    memberCommitments[c.userId]!.total++;
    if (!c.rcdoLink?.rallyCryTitle) memberCommitments[c.userId]!.unlinked++;
  }

  const fullyUnlinked = Object.values(memberCommitments).filter((m) => m.unlinked === m.total && m.total > 0);
  const actions: SuggestedAction[] = [];

  for (const m of fullyUnlinked.slice(0, 2)) {
    actions.push({ text: `Review ${m.name}'s ${m.unlinked} unlinked commitments for potential rally cry alignment` });
  }
  for (const uc of uncovered.slice(0, 2)) {
    actions.push({ text: `Assign someone to ${uc.rallyCryTitle} -- zero team coverage on ${uc.title}` });
  }
  if (carryPct > 15) {
    actions.push({ text: `Investigate carry-forward rate (${carryPct}%) -- may indicate capacity issues` });
  }
  if (actions.length === 0) {
    actions.push({ text: 'Team coverage looks healthy. Consider reviewing CHESS distribution balance.' });
  }

  const headline = 'Team Summary';
  const narrative =
    `Your team of ${teamSize} has ${linkedPct}% of commitments linked to rally cries this cycle.` +
    (unlinked > 0 ? ` ${unlinked} commitment${unlinked !== 1 ? 's remain' : ' remains'} unlinked.` : '') +
    (carried > 0 ? ` Carry-forward rate is ${carryPct}%.` : '') +
    (uncovered.length > 0 ? ` ${uncovered.length} objective${uncovered.length !== 1 ? 's have' : ' has'} zero coverage.` : '');

  return { headline, narrative, actions };
}

export function TeamSummaryCard({ dashboard, commitments, cycleWeekStart }: TeamSummaryCardProps) {
  const { data: llmSummary, isLoading } = useTeamSummary(cycleWeekStart);

  // Use LLM response when available; fall back to deterministic while loading or when null
  const fallback = buildSummary(dashboard, commitments);

  const headline = llmSummary?.headline ?? fallback.headline;
  const narrative = llmSummary?.narrative ?? fallback.narrative;
  const actions: SuggestedAction[] = llmSummary
    ? llmSummary.suggestedActions.map((text) => ({ text }))
    : fallback.actions;

  return (
    <Card className="animate-fade-up">
      <span className="inline-block text-small uppercase tracking-[0.06rem] text-muted mb-3">
        AI Summary
      </span>
      <h2 className="font-serif text-headline text-on-surface mb-3">{headline}</h2>
      {isLoading ? (
        <div className="flex items-center gap-3 mb-5">
          <LoadingSpinner size="sm" />
          <p className="text-body text-on-surface-variant leading-relaxed">{fallback.narrative}</p>
        </div>
      ) : (
        <p className="text-body text-on-surface-variant leading-relaxed mb-5">{narrative}</p>
      )}
      <h3 className="font-serif text-[1.125rem] text-on-surface mb-3">Suggested Actions</h3>
      <ul className="flex flex-col gap-2">
        {actions.map((action, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-body text-on-surface-variant px-2.5 py-2 rounded-sm transition-colors duration-[var(--duration-fast)] hover:bg-surface-container-low cursor-pointer"
          >
            <span className="text-accent font-medium flex-shrink-0 mt-px">&rarr;</span>
            <span>{action.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
