import { useState } from 'react';
import type { TeamMemberSummary } from '@/types';
import { MemberCommitmentDetail } from './MemberCommitmentDetail';

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
  DRAFT: 'bg-gray-100 text-gray-700',
  LOCKED: 'bg-blue-100 text-blue-800',
  RECONCILING: 'bg-yellow-100 text-yellow-800',
  RECONCILED: 'bg-green-100 text-green-800',
};

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  direction: SortDir;
  onSort: (key: SortKey) => void;
  sticky?: boolean;
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
  sticky = false,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-gray-900 ${
        sticky ? 'sticky left-0 bg-gray-50 z-10' : ''
      }`}
      onClick={() => onSort(sortKey)}
      scope="col"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col leading-none" aria-hidden="true">
          <svg
            className={`w-2.5 h-2.5 -mb-0.5 ${isActive && direction === 'asc' ? 'text-blue-600' : 'text-gray-300'}`}
            viewBox="0 0 10 6"
            fill="currentColor"
          >
            <path d="M5 0L10 6H0L5 0Z" />
          </svg>
          <svg
            className={`w-2.5 h-2.5 ${isActive && direction === 'desc' ? 'text-blue-600' : 'text-gray-300'}`}
            viewBox="0 0 10 6"
            fill="currentColor"
          >
            <path d="M5 6L0 0H10L5 6Z" />
          </svg>
        </span>
      </span>
    </th>
  );
}

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
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
        No team members found.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200">
        Team Rollup
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
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
          <tbody className="divide-y divide-gray-100">
            {sorted.map(({ raw, strategicPct, operationalPct, completionRate, topRcdo }) => {
              const isExpanded = expandedUserId === raw.userId;
              const stateLabel = CYCLE_STATE_LABELS[raw.cycleState] ?? raw.cycleState;
              const stateColor = CYCLE_STATE_COLORS[raw.cycleState] ?? 'bg-gray-100 text-gray-700';

              return (
                <>
                  <tr
                    key={raw.userId}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : ''}`}
                    onClick={() => handleRowClick(raw.userId)}
                    aria-expanded={isExpanded}
                  >
                    <td className="sticky left-0 px-4 py-3 font-medium text-gray-900 bg-inherit whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span
                          className={`transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-90' : ''}`}
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
                    <td className="px-4 py-3 text-gray-700 text-right tabular-nums">
                      {raw.totalCommitments}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={strategicPct >= 50 ? 'text-blue-700 font-semibold' : 'text-gray-700'}>
                        {strategicPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {operationalPct}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          completionRate >= 80
                            ? 'text-green-700 font-semibold'
                            : completionRate >= 50
                            ? 'text-yellow-700'
                            : 'text-red-600'
                        }
                      >
                        {completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{topRcdo}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${raw.userId}-detail`}>
                      <td
                        colSpan={7}
                        className="bg-blue-50 border-t border-blue-100"
                      >
                        <MemberCommitmentDetail userId={raw.userId} cycleId={cycleId} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
