import { useState } from 'react';
import Card from '@/components/Card';
import { AlignmentGapChart } from '@/features/manager-dashboard/AlignmentGapChart';
import type { DashboardResponse, MemberAlignment } from '@/types/dashboard.types';

const LEAD_ROLES = new Set(['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE']);

interface TeamAnalyticsProps {
  dashboard: DashboardResponse;
}

export function TeamAnalytics({ dashboard }: TeamAnalyticsProps) {
  const [expanded, setExpanded] = useState(false);

  const rcCoverage = dashboard.rcdoCoverage?.linkedPercentage ?? 0;

  const leadUserIds = new Set(
    (dashboard.teamRollup?.members ?? [])
      .filter((m) => LEAD_ROLES.has(m.role))
      .map((m) => m.userId)
  );
  const leadMembers: MemberAlignment[] = (dashboard.alignmentSignal?.byTeamMember ?? [])
    .filter((m) => leadUserIds.has(m.userId));

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
          Rally Cry Coverage: <span className="font-medium text-on-surface">{Math.round(rcCoverage)}%</span>
        </span>
      </button>

      {/* Expandable content — only mount charts when expanded to avoid Recharts DOM conflicts */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-outline-variant animate-fade-up">
          <div className="pt-4">
            <h3 className="text-title text-on-surface mb-2">Work Type by Team Lead</h3>
            <p className="text-body text-on-surface-variant mb-3">
              How each team lead&rsquo;s group breaks down by category.
            </p>
            <AlignmentGapChart
              aggregate={dashboard.alignmentSignal}
              members={leadMembers}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
