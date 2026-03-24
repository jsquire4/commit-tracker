import { useState, useMemo } from 'react';
import { ChessMiniBar } from './ChessMiniBar';
import { CHESS_LABELS } from '@/constants/chess-colors';
import type { Commitment, TeamMemberSummary } from '@/types';

interface PersonCardProps {
  member: TeamMemberSummary;
  commitments: Commitment[];
  onAssign: (m: TeamMemberSummary) => void;
}

// Chip styles use design token classes; color choices align with CHESS_ACCENT palette:
//   STRATEGIC → navy, OPERATIONAL → muted, DEFENSIVE → error tone, CAPABILITY_BUILDING → accent (teal)
const CHESS_CHIP_STYLES: Record<string, string> = {
  STRATEGIC: 'bg-surface-container text-navy',
  OPERATIONAL: 'bg-surface-container text-on-surface-variant',
  DEFENSIVE: 'bg-surface-container text-error',
  CAPABILITY_BUILDING: 'bg-surface-container text-accent',
};

function getStatusColor(_member: TeamMemberSummary, commitments: Commitment[]): 'teal' | 'amber' | 'rose' {
  const linked = commitments.filter((c) => c.rcdoLink?.rallyCryTitle).length;
  if (linked === 0 && commitments.length > 0) return 'rose';
  const carried = commitments.filter((c) => c.carriedFromCommitmentId).length;
  if (carried > 0 || linked < commitments.length) return 'amber';
  return 'teal';
}

function groupByRallyCry(commitments: Commitment[]): { label: string; count: number; isGap: boolean }[] {
  const groups: Record<string, number> = {};
  let unlinked = 0;
  for (const c of commitments) {
    if (c.rcdoLink?.rallyCryTitle) {
      groups[c.rcdoLink.rallyCryTitle] = (groups[c.rcdoLink.rallyCryTitle] ?? 0) + 1;
    } else {
      unlinked++;
    }
  }
  const result = Object.entries(groups).map(([label, count]) => ({ label, count, isGap: false }));
  if (unlinked > 0) result.push({ label: 'No rally cries linked', count: unlinked, isGap: true });
  return result;
}

const statusDotClass: Record<string, string> = {
  teal: 'bg-accent',
  amber: 'bg-warning',
  rose: 'bg-error',
};

export function PersonCard({ member, commitments, onAssign }: PersonCardProps) {
  const [expanded, setExpanded] = useState(false);
  const linked = commitments.filter((c) => c.rcdoLink?.rallyCryTitle).length;
  const carried = commitments.filter((c) => c.carriedFromCommitmentId).length;
  const status = useMemo(() => getStatusColor(member, commitments), [member, commitments]);
  const coverageGroups = useMemo(() => groupByRallyCry(commitments), [commitments]);

  // CHESS breakdown from member data
  const breakdown = member.categoryBreakdown ?? {};
  const strategic = breakdown['STRATEGIC'] ?? 0;
  const operational = breakdown['OPERATIONAL'] ?? 0;
  const defensive = breakdown['DEFENSIVE'] ?? 0;
  const capability = breakdown['CAPABILITY_BUILDING'] ?? 0;

  const hasDrift = status === 'rose';
  const borderClass = status === 'rose' ? 'border-l-[3px] border-l-error' : status === 'amber' ? 'border-l-[3px] border-l-warning' : '';

  return (
    <div
      className={[
        'bg-surface-lowest rounded-sm overflow-hidden transition-colors duration-[var(--duration-fast)] hover:bg-surface',
        borderClass,
      ].join(' ')}
    >
      {/* Header */}
      <button
        type="button"
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none w-full text-left bg-transparent border-0 p-0"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="text-[0.9375rem] font-medium text-on-surface whitespace-nowrap">{member.displayName}</span>
        <span className="text-label text-muted whitespace-nowrap">
          {member.role === 'EMPLOYEE' ? 'IC' : member.role === 'MANAGER' ? 'Manager' : member.role}
        </span>
        <ChessMiniBar
          strategic={strategic}
          operational={operational}
          defensive={defensive}
          capability={capability}
          total={commitments.length}
        />
        <span className="text-label text-on-surface-variant whitespace-nowrap">
          {commitments.length} commitments &middot; {linked} linked
        </span>
        {carried > 0 && (
          <span className="inline-flex items-center text-small font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full whitespace-nowrap">
            &#8635; {carried} carried
          </span>
        )}
        {hasDrift && (
          <span className="text-small text-muted whitespace-nowrap">At Risk</span>
        )}
        <span className="flex-1" />
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass[status]}`} />
        <svg
          className={`w-[18px] h-[18px] text-muted flex-shrink-0 transition-transform duration-[var(--duration-standard)] ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-[var(--duration-entrance)] ease-[var(--ease-entrance)]"
        style={{ maxHeight: expanded ? '800px' : '0px' }}
      >
        <div className="px-5 pb-5">
          {/* Commitment list */}
          <ul className="flex flex-col">
            {commitments.map((c, ci) => (
              <li
                key={c.id}
                className={`flex items-center justify-between py-2.5 ${ci > 0 ? 'border-t border-outline-variant' : ''}`}
              >
                <span className="text-[0.8125rem] text-on-surface flex-1 min-w-0 truncate">{c.title}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {c.chessCategoryName && (() => {
                    const catKey = c.chessCategoryName.toUpperCase().replace(/ /g, '_');
                    return (
                      <span className={`text-[0.625rem] uppercase tracking-[0.04rem] px-2 py-0.5 rounded-sm font-medium whitespace-nowrap ${CHESS_CHIP_STYLES[catKey] ?? 'bg-surface-container text-on-surface-variant'}`}>
                        {CHESS_LABELS[catKey] ?? c.chessCategoryName}
                      </span>
                    );
                  })()}
                  {c.rcdoLink?.rallyCryTitle ? (
                    <span className="text-[0.625rem] px-2 py-0.5 rounded-sm bg-accent/[0.08] text-accent whitespace-nowrap">
                      {c.rcdoLink.rallyCryTitle}
                    </span>
                  ) : (
                    <span className="text-[0.625rem] px-2 py-0.5 rounded-sm bg-error/[0.08] text-error whitespace-nowrap">
                      Unlinked
                    </span>
                  )}
                  {c.carriedFromCommitmentId && (
                    <span className="text-[0.625rem] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning whitespace-nowrap">
                      &#8635; Carried
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Assign work button */}
          <div className="mt-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              className="text-[0.8125rem] font-medium text-accent bg-transparent border-0 cursor-pointer p-0 hover:text-accent-dark transition-colors duration-[var(--duration-fast)]"
              onClick={() => onAssign(member)}
            >
              Assign work &rarr;
            </button>
          </div>

          {/* Coverage summary */}
          <div className="mt-3 pt-3 border-t border-outline-variant">
            <div className="text-small uppercase tracking-[0.04rem] text-muted mb-1.5">
              Rally Cry Coverage
            </div>
            <div className="flex flex-wrap gap-1.5">
              {coverageGroups.map((g) => (
                <span
                  key={g.label}
                  className={`text-small px-2 py-0.5 rounded-full ${
                    g.isGap ? 'bg-warning/15 text-warning' : 'bg-accent/[0.08] text-accent'
                  }`}
                >
                  {g.isGap ? g.label : `${g.label} (${g.count})`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
