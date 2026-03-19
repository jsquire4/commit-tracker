import { useMemo } from 'react';
import type { RallyCryNode, DefiningObjectiveNode, OutcomeNode } from '@/types/rcdo.types';
import type { Commitment } from '@/types/commitment.types';

export interface StrategySuggestion {
  rallyCryId: string;
  rallyCryTitle: string;
  definingObjectiveId: string;
  definingObjectiveTitle: string;
  outcomeId: string;
  outcomeTitle: string;
  reason: string;
}

/**
 * Suggests an RCDO link for a commitment based on:
 * 1. Previous week's links for the same user (multi-week initiatives)
 * 2. Keyword matching against the commitment title
 */
export function useStrategySuggestion(
  commitmentTitle: string,
  rallyCries: RallyCryNode[] | undefined,
  previousCommitments: Commitment[] | undefined,
  userId: string,
): StrategySuggestion | null {
  return useMemo(() => {
    if (!rallyCries || rallyCries.length === 0) return null;
    if (!commitmentTitle.trim()) return null;

    const candidates: (StrategySuggestion & { score: number })[] = [];

    // Build flat outcome list
    const outcomes: {
      rc: RallyCryNode;
      do_: DefiningObjectiveNode;
      oc: OutcomeNode;
    }[] = [];
    for (const rc of rallyCries) {
      for (const doNode of rc.definingObjectives) {
        for (const oc of doNode.outcomes) {
          outcomes.push({ rc, do_: doNode, oc });
        }
      }
    }

    // Signal 1: Previous week's links
    if (previousCommitments) {
      const userPrevious = previousCommitments.filter(
        (c) => c.userId === userId && c.rcdoLink.outcomeId,
      );
      // Count how many times each outcome was used
      const outcomeCounts = new Map<string, number>();
      for (const c of userPrevious) {
        const ocId = c.rcdoLink.outcomeId!;
        outcomeCounts.set(ocId, (outcomeCounts.get(ocId) ?? 0) + 1);
      }
      for (const [ocId, count] of outcomeCounts) {
        const match = outcomes.find((o) => o.oc.id === ocId);
        if (match) {
          candidates.push({
            rallyCryId: match.rc.id,
            rallyCryTitle: match.rc.title,
            definingObjectiveId: match.do_.id,
            definingObjectiveTitle: match.do_.title,
            outcomeId: match.oc.id,
            outcomeTitle: match.oc.title,
            reason: 'Same as last week',
            score: 0.5 + count * 0.1,
          });
        }
      }
    }

    // Signal 2: Keyword matching
    const titleLower = commitmentTitle.toLowerCase();
    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);

    for (const { rc, do_, oc } of outcomes) {
      const searchText = `${rc.title} ${do_.title} ${oc.title}`.toLowerCase();
      let matchScore = 0;
      for (const word of titleWords) {
        if (searchText.includes(word)) {
          matchScore += 0.15;
        }
      }
      if (matchScore > 0.1) {
        candidates.push({
          rallyCryId: rc.id,
          rallyCryTitle: rc.title,
          definingObjectiveId: do_.id,
          definingObjectiveTitle: do_.title,
          outcomeId: oc.id,
          outcomeTitle: oc.title,
          reason: 'Keyword match',
          score: matchScore,
        });
      }
    }

    if (candidates.length === 0) return null;

    // Deduplicate by outcomeId, summing scores
    const byOutcome = new Map<string, (typeof candidates)[0]>();
    for (const c of candidates) {
      const existing = byOutcome.get(c.outcomeId);
      if (existing) {
        existing.score += c.score;
        if (c.reason === 'Same as last week') existing.reason = c.reason;
      } else {
        byOutcome.set(c.outcomeId, { ...c });
      }
    }

    const sorted = [...byOutcome.values()].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    if (!best || best.score < 0.2) return null;

    return {
      rallyCryId: best.rallyCryId,
      rallyCryTitle: best.rallyCryTitle,
      definingObjectiveId: best.definingObjectiveId,
      definingObjectiveTitle: best.definingObjectiveTitle,
      outcomeId: best.outcomeId,
      outcomeTitle: best.outcomeTitle,
      reason: best.reason,
    };
  }, [commitmentTitle, rallyCries, previousCommitments, userId]);
}
