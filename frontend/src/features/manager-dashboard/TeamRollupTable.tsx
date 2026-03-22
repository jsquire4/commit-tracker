import { useState, Fragment } from 'react';
import type { TeamMemberSummary } from '@/types';
import { MemberCommitmentDetail } from './MemberCommitmentDetail';
import { SortableHeader } from '@/components/SortableHeader';

interface TeamRollupTableProps {
  members: TeamMemberSummary[];
  cycleId: string;
  onSelectMember?: (id: string) => void;
}

type SortKey =
  | 'displayName'
  | 'cycleState'
  | 'totalCommitments'
  | 'strategicPct'
  | 'operationalPct'
  | 'completionRate'
  | 'topRcdo';

type SortDir = 'asc' | 'desc';

const CYCLE_STATE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  LOCKED: 'Locked',
  RECONCILING: 'Reconciling',
  RECONCILED: 'Reconciled',
};

const CYCLE_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-surface-container text-on-surface-variant',
  LOCKED: 'bg-navy/10 text-navy',
  RECONCILING: 'bg-warning/10 text-warning',
  RECONCILED: 'bg-accent/10 text-accent',
};


interface DerivedMember {
  raw: TeamMemberSummary;
  strategicPct: number;
  operationalPct: number;
  completionRate: number;
  topRcdo: string;
}

function deriveMember(m: TeamMemberSummary): DerivedMember {
  const total = m.totalCommitments || 1;
  const strategicPct = Math.round(((m.categoryBreakdown['STRATEGIC'] ?? 0) / total) * 100);
  const operationalPct = Math.round(((m.categoryBreakdown['OPERATIONAL'] ?? 0) / total) * 100);
  const completionRate =
    m.totalCommitments > 0 ? Math.round((m.completedCount / m.totalCommitments) * 100) : 0;

  const topEntry = Object.entries(m.categoryBreakdown).sort(([, a], [, b]) => b - a)[0];
  const topRcdo = topEntry ? topEntry[0] : '—';

  return { raw: m, strategicPct, operationalPct, completionRate, topRcdo };
}

function sortMembers(members: DerivedMember[], key: SortKey, dir: SortDir): DerivedMember[] {
  const sorted = [...members].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (key) {
      case 'displayName':
        av = a.raw.displayName;
        bv = b.raw.displayName;
        break;
      case 'cycleState':
        av = a.raw.cycleState;
        bv = b.raw.cycleState;
        break;
      case 'totalCommitments':
        av = a.raw.totalCommitments;
        bv = b.raw.totalCommitments;
        break;
      case 'strategicPct':
        av = a.strategicPct;
        bv = b.strategicPct;
        break;
      case 'operationalPct':
        av = a.operationalPct;
        bv = b.operationalPct;
        break;
      case 'completionRate':
        av = a.completionRate;
        bv = b.completionRate;
        break;
      case 'topRcdo':
        av = a.topRcdo;
        bv = b.topRcdo;
        break;
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function TeamRollupTable({
  members,
  cycleId,
  onSelectMember,
}: TeamRollupTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('displayName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleRowClick(userId: string) {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
    onSelectMember?.(userId);
  }

  const derived = members.map(deriveMember);
  const sorted = sortMembers(derived, sortKey, sortDir);

  if (sorted.length === 0) {
    return (
      <div className="bg-surface-lowest border border-outline-variant rounded-lg p-8 text-center text-muted text-sm">
        No team members found.
      </div>
    );
  }

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg overflow-hidden">
      <h2 className="text-lg font-semibold text-on-surface px-6 py-4 border-b border-outline-variant">
        Team Rollup
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <SortableHeader
                label="Name"
                sortKey="displayName"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
                sticky
              />
              <SortableHeader
                label="Cycle State"
                sortKey="cycleState"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="# Commitments"
                sortKey="totalCommitments"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Strategic %"
                sortKey="strategicPct"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Operational %"
                sortKey="operationalPct"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Completion Rate"
                sortKey="completionRate"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Top Category"
                sortKey="topRcdo"
                currentSort={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15">
            {sorted.map(({ raw, strategicPct, operationalPct, completionRate, topRcdo }) => {
              const isExpanded = expandedUserId === raw.userId;
              const stateLabel = CYCLE_STATE_LABELS[raw.cycleState] ?? raw.cycleState;
              const stateColor = CYCLE_STATE_COLORS[raw.cycleState] ?? 'bg-surface-container text-on-surface-variant';

              return (
                <Fragment key={raw.userId}>
                  <tr
                    className={`hover:bg-surface-container-high cursor-pointer transition-colors duration-[var(--duration-fast)] ${isExpanded ? 'bg-accent/5' : ''}`}
                    onClick={() => { handleRowClick(raw.userId); }}
                    aria-expanded={isExpanded}
                  >
                    <td className="sticky left-0 px-4 py-3 font-medium text-on-surface bg-inherit whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span
                          className={`transition-transform duration-200 text-muted ${isExpanded ? 'rotate-90' : ''}`}
                          aria-hidden="true"
                        >
                          ▶
                        </span>
                        {raw.displayName}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${stateColor}`}>
                        {stateLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-right tabular-nums">
                      {raw.totalCommitments}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={strategicPct >= 50 ? 'text-accent font-semibold' : 'text-on-surface-variant'}>
                        {strategicPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">
                      {operationalPct}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          completionRate >= 80
                            ? 'text-accent font-semibold'
                            : completionRate >= 50
                            ? 'text-warning'
                            : 'text-error'
                        }
                      >
                        {completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{topRcdo}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={7}
                        className="bg-accent/5 border-t border-accent/10"
                      >
                        <MemberCommitmentDetail userId={raw.userId} cycleId={cycleId} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
