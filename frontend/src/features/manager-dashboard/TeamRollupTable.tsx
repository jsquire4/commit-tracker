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
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  LOCKED: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  RECONCILING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  RECONCILED: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
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
    m.totalCommitments > 0 ? Math.round((m.reconciledCount / m.totalCommitments) * 100) : 0;

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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
        No team members found.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        Team Rollup
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map(({ raw, strategicPct, operationalPct, completionRate, topRcdo }) => {
              const isExpanded = expandedUserId === raw.userId;
              const stateLabel = CYCLE_STATE_LABELS[raw.cycleState] ?? raw.cycleState;
              const stateColor = CYCLE_STATE_COLORS[raw.cycleState] ?? 'bg-gray-100 text-gray-700';

              return (
                <Fragment key={raw.userId}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                    onClick={() => { handleRowClick(raw.userId); }}
                    aria-expanded={isExpanded}
                  >
                    <td className="sticky left-0 px-4 py-3 font-medium text-gray-900 dark:text-gray-100 bg-inherit whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span
                          className={`transition-transform duration-200 text-gray-400 dark:text-gray-500 ${isExpanded ? 'rotate-90' : ''}`}
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
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-right tabular-nums">
                      {raw.totalCommitments}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={strategicPct >= 50 ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                        {strategicPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {operationalPct}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          completionRate >= 80
                            ? 'text-green-700 dark:text-green-400 font-semibold'
                            : completionRate >= 50
                            ? 'text-yellow-700 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{topRcdo}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={7}
                        className="bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 dark:border-blue-900/40"
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
