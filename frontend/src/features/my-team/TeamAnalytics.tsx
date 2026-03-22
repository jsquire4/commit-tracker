import { useState } from 'react';
import Card from '@/components/Card';
import { AlignmentGapChart } from '@/features/manager-dashboard/AlignmentGapChart';
import { CarryForwardVelocity } from '@/features/manager-dashboard/CarryForwardVelocity';
import type { DashboardResponse } from '@/types/dashboard.types';

interface TeamAnalyticsProps {
  dashboard: DashboardResponse;
  cycleId: string;
}

export function TeamAnalytics({ dashboard, cycleId }: TeamAnalyticsProps) {
  const [expanded, setExpanded] = useState(false);

  const strategicPct = dashboard.alignmentSignal?.distribution?.STRATEGIC?.percentage ?? 0;
  const teamMemberIds = (dashboard.teamRollup?.members ?? []).map((m) => m.userId);

  return (
    <Card padding="compact" className="overflow-hidden">
      {/* Header -- always visible */}
      <button
        type="button"
        onClick={() => { setExpanded(!expanded); }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors duration-[var(--duration-fast)]"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-muted transition-transform duration-[var(--duration-standard)] ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="font-serif text-title text-on-surface">Team Analytics</h2>
        </div>
        <span className="text-body text-on-surface-variant">
          Strategic alignment: <span className="font-medium text-on-surface">{Math.round(strategicPct)}%</span>
        </span>
      </button>

      {/* Expandable content — only mount charts when expanded to avoid Recharts DOM conflicts */}
      {expanded && (
        <div className="px-5 pb-5 space-y-6 border-t border-outline-variant animate-fade-up">
          {/* Alignment Distribution */}
          <div className="pt-4">
            <h3 className="text-title text-on-surface mb-2">Alignment Distribution</h3>
            <p className="text-body text-on-surface-variant mb-3">
              How your team&rsquo;s work breaks down by category.
            </p>
            <AlignmentGapChart
              aggregate={dashboard.alignmentSignal}
              members={dashboard.alignmentSignal?.byTeamMember ?? []}
            />
          </div>

          {/* Carry-Forward Velocity */}
          <div>
            <h3 className="text-title text-on-surface mb-2">Carry-Forward Velocity</h3>
            <p className="text-body text-on-surface-variant mb-3">
              Items carried forward from previous weeks.
            </p>
            <CarryForwardVelocity cycleId={cycleId} teamMemberIds={teamMemberIds} />
          </div>
        </div>
      )}
    </Card>
  );
}
