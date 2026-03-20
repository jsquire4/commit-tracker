import { useState } from 'react';
import { SortableHeader } from '@/components/SortableHeader';
import type { CostWeightedSignal } from '@/types';

interface CostImpactTableProps {
  signals: CostWeightedSignal[];
}

type SortKey =
  | 'displayName'
  | 'role'
  | 'costBandName'
  | 'totalHours'
  | 'strategicHours'
  | 'nonStrategicHours'
  | 'misalignmentCost';

type SortDir = 'asc' | 'desc';

function parseNum(v: string): number {
  return parseFloat(v) || 0;
}

function sortSignals(signals: CostWeightedSignal[], key: SortKey, dir: SortDir): CostWeightedSignal[] {
  return [...signals].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (key) {
      case 'displayName':
        av = a.displayName;
        bv = b.displayName;
        break;
      case 'role':
        av = a.role;
        bv = b.role;
        break;
      case 'costBandName':
        av = a.costBandTier;
        bv = b.costBandTier;
        break;
      case 'totalHours':
        av = parseNum(a.totalHours);
        bv = parseNum(b.totalHours);
        break;
      case 'strategicHours':
        av = parseNum(a.strategicHours);
        bv = parseNum(b.strategicHours);
        break;
      case 'nonStrategicHours':
        av = parseNum(a.nonStrategicHours);
        bv = parseNum(b.nonStrategicHours);
        break;
      case 'misalignmentCost':
        av = parseNum(a.misalignmentCost);
        bv = parseNum(b.misalignmentCost);
        break;
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function formatCurrency(value: string): string {
  const n = parseNum(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatHours(value: string): string {
  return `${parseNum(value).toFixed(1)}h`;
}

export function CostImpactTable({ signals }: CostImpactTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('misalignmentCost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = sortSignals(signals, sortKey, sortDir);

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg overflow-hidden">
      <h2 className="text-lg font-semibold text-on-surface px-6 py-4 border-b border-outline-variant">
        Cost Impact
      </h2>

      {signals.length === 0 ? (
        <div className="p-8 text-center text-muted text-sm">
          No cost signals for this cycle.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <SortableHeader<SortKey>
                  label="Name"
                  sortKey="displayName"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                  sticky
                />
                <SortableHeader<SortKey>
                  label="Role"
                  sortKey="role"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader<SortKey>
                  label="Cost Band"
                  sortKey="costBandName"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader<SortKey>
                  label="Total Hours"
                  sortKey="totalHours"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader<SortKey>
                  label="Strategic Hours"
                  sortKey="strategicHours"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader<SortKey>
                  label="Non-Strategic Hours"
                  sortKey="nonStrategicHours"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader<SortKey>
                  label="Misalignment Cost ($)"
                  sortKey="misalignmentCost"
                  currentSort={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {sorted.map((signal) => {
                const cost = parseNum(signal.misalignmentCost);
                const costClass =
                  cost > 10000
                    ? 'text-error font-semibold'
                    : cost > 5000
                    ? 'text-warning'
                    : 'text-on-surface-variant';
                return (
                  <tr
                    key={signal.userId}
                    className="hover:bg-surface-container-high transition-colors duration-[var(--duration-fast)]"
                  >
                    <td className="sticky left-0 px-4 py-3 font-medium text-on-surface bg-inherit whitespace-nowrap">
                      {signal.displayName}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {signal.role}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {signal.costBandName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">
                      {formatHours(signal.totalHours)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-accent">
                      {formatHours(signal.strategicHours)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">
                      {formatHours(signal.nonStrategicHours)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${costClass}`}>
                      {formatCurrency(signal.misalignmentCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
