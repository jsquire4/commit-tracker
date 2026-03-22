import type { BriefingResponse } from '@/types/briefing.types';

/**
 * Fetch the AI-generated briefing for a given cycle.
 *
 * Currently returns a hardcoded stub — the backend endpoint (1.3) will replace this
 * once the BriefingController is deployed.
 */
export async function getBriefing(cycleId: string): Promise<BriefingResponse> {
  // STUB: Returns hardcoded data. Replace with fetchData<BriefingResponse>(`/api/v1/briefing?cycleId=${cycleId}`)
  // when BriefingController is deployed. Tracked: complexity-sweep-2026-03-22
  // return fetchData<BriefingResponse>(`/api/v1/briefing?cycleId=${cycleId}`);

  void cycleId; // suppress unused warning

  return {
    generatedAt: new Date().toISOString(),
    headline: 'Weekly Intelligence Summary',
    narrative:
      'Strategic alignment is at 41% this week, down from 48% last week. The primary driver is increased operational and defensive work displacing strategic commitments\u2009\u2014\u20093 commitments were marked as Manager Reassigned during reconciliation. Rally cry coverage remains strong at 88%\u2009\u2014\u2009most team commitments link to at least one rally cry. However, \u201cReduce Churn to <2%\u201d has zero linked commitments from the engineering team, creating a coverage gap. Carry-forward rate rose to 18%, up from 12%, with Production Emergency cited as the top displacement reason.',
    suggestions: [
      { id: 's1', text: 'Churn Reduction coverage gap\u2009\u2014\u2009no engineering commitments linked this cycle' },
      { id: 's2', text: 'Rising carry-forward trend (3 consecutive weeks)\u2009\u2014\u2009review displacement patterns' },
      { id: 's3', text: 'Strategic alignment below org target of 60%\u2009\u2014\u2009defensive work consuming capacity' },
    ],
    citations: [
      { id: 'c1', label: 'Strategic alignment: 41%', detail: 'Computed from 98 commitments across 34 team members', linkText: 'View breakdown' },
      { id: 'c2', label: '3 Manager Reassigned displacements', detail: 'From Week 5 reconciliation records', linkText: 'View records' },
      { id: 'c3', label: 'Rally Cry Coverage 88%', detail: '86 of 98 commitments linked to RCDO', linkText: 'View details' },
      { id: 'c4', label: 'Carry-forward rate 18%', detail: '18 of 98 commitments carried from Week 5', linkText: 'View list' },
    ],
    metrics: [
      { key: 'alignment', label: 'Strategic Alignment', value: 41, suffix: '%', trend: 'down' },
      { key: 'coverage', label: 'Rally Cry Coverage', value: 88, suffix: '%', trend: 'up' },
      { key: 'carry', label: 'Carry-Forward Rate', value: 18, suffix: '%', trend: 'down' },
      { key: 'completion', label: 'Completion Rate', value: 72, suffix: '%', trend: 'up' },
      { key: 'drift', label: 'Active Drift Signals', value: 2 },
    ],
  };
}
