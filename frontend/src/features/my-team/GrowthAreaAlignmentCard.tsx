import { useState } from 'react';
import Card from '@/components/Card';
import type { GrowthAreaAlignmentResponse } from '@/types/dashboard.types';

interface GrowthAreaAlignmentCardProps {
  data: GrowthAreaAlignmentResponse;
}

export function GrowthAreaAlignmentCard({ data }: GrowthAreaAlignmentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const pct = Math.round(data.alignedPercentage);

  // Sort members: those with commitments first (by % descending), then zero-commitment members
  const sortedMembers = [...data.byTeamMember]
    .filter((m) => m.totalCommitments > 0)
    .sort((a, b) => b.alignedPercentage - a.alignedPercentage);

  return (
    <Card padding="compact" className="overflow-hidden">
      {/* Header — always visible */}
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
          <h2 className="font-serif text-title text-on-surface">Personal Growth Alignment</h2>
        </div>
        <span className="text-body text-on-surface-variant">
          Aligned to Growth Areas: <span className="font-medium text-on-surface">{pct}%</span>
        </span>
      </button>

      {/* Expandable — per-member breakdown */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-outline-variant animate-fade-up">
          <div className="pt-4">
            <p className="text-body text-on-surface-variant mb-4">
              Percentage of each person&rsquo;s commitments linked to at least one personal growth area.
            </p>

            {/* Team aggregate bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-body font-medium text-accent">Team Total</span>
                <span className="text-small text-on-surface-variant">
                  {data.alignedCount} of {data.totalCommitments} ({pct}%)
                </span>
              </div>
              <AlignmentBar percentage={pct} isTeam />
            </div>

            {/* Per-member bars */}
            <div className="flex flex-col gap-3">
              {sortedMembers.map((m) => {
                const memberPct = Math.round(m.alignedPercentage);
                return (
                  <div key={m.userId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body text-on-surface">{m.displayName}</span>
                      <span className="text-small text-on-surface-variant">
                        {m.alignedCount} of {m.totalCommitments} ({memberPct}%)
                      </span>
                    </div>
                    <AlignmentBar percentage={memberPct} />
                  </div>
                );
              })}
              {sortedMembers.length === 0 && (
                <p className="text-body text-muted text-center py-4">No commitments this cycle.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AlignmentBar({ percentage, isTeam = false }: { percentage: number; isTeam?: boolean }) {
  return (
    <div className={`w-full rounded-full overflow-hidden ${isTeam ? 'h-3' : 'h-2'} bg-surface-container`}>
      <div
        className="h-full rounded-full transition-all duration-[var(--duration-standard)] ease-[var(--ease-standard)]"
        style={{
          width: `${Math.max(percentage, percentage > 0 ? 2 : 0)}%`,
          backgroundColor: percentage >= 50
            ? 'var(--color-accent)'
            : percentage > 0
              ? 'var(--color-warning, #d97706)'
              : 'transparent',
        }}
      />
    </div>
  );
}
