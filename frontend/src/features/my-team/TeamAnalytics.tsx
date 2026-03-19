import { useState } from 'react';
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

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header — always visible, shows preview stat */}
      <button
        type="button"
        onClick={() => { setExpanded(!expanded); }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-base font-semibold text-gray-100">Team Analytics</h2>
        </div>
        <span className="text-sm text-gray-400">
          Strategic alignment: <span className="font-semibold text-gray-200">{Math.round(strategicPct)}%</span>
        </span>
      </button>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '2000px' : '0px' }}
      >
        <div className="px-5 pb-5 space-y-6 border-t border-gray-800">
          {/* Alignment Gap Chart */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Alignment Distribution</h3>
            <p className="text-xs text-gray-500 mb-3">
              How your team&rsquo;s work breaks down by category. Higher strategic percentage indicates better alignment with rally cries.
            </p>
            <AlignmentGapChart
              aggregate={dashboard.alignmentSignal}
              members={dashboard.alignmentSignal?.byTeamMember ?? []}
            />
          </div>

          {/* Carry-Forward Velocity */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Carry-Forward Velocity</h3>
            <p className="text-xs text-gray-500 mb-3">
              Items carried forward from previous weeks. High carry-forward rates suggest capacity issues or scope creep.
            </p>
            <CarryForwardVelocity cycleId={cycleId} />
          </div>
        </div>
      </div>
    </div>
  );
}
