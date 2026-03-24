import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgramHeatmap } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ManagerHeatmapRow, PersonHeatmapRow } from '@/types';
import { CHESS_CELL_COLORS, HeatmapCell } from './HeatmapCell';

// ─── Sort helper — module-scoped ──────────────────────────────────────────────

function extractWeekNum(label: string): number {
  const m = label.match(/(\d+)\s*$/);
  return m != null && m[1] != null ? parseInt(m[1], 10) : 0;
}

// ─── Person Row ───────────────────────────────────────────────────────────────

interface PersonRowProps {
  row: PersonHeatmapRow;
  weekLabels: string[];
}

function PersonRow({ row, weekLabels }: PersonRowProps) {
  const navigate = useNavigate();
  // Build a lookup by cycleLabel so we can align cells to week columns
  const cellsByLabel = new Map(row.weekCells.map((c) => [c.cycleLabel, c]));

  function handleCellClick(weekLabel: string) {
    const cell = cellsByLabel.get(weekLabel);
    if (!cell) return;
    navigate(`/?cycleId=${cell.cycleId}&userId=${row.userId}`);
  }

  return (
    <tr className="border-b border-outline-variant/30">
      {/* Sticky name cell */}
      <td
        className="sticky left-0 z-10 bg-surface-lowest py-1 pr-3 pl-6 min-w-[160px] max-w-[200px]"
        style={{ backgroundColor: 'var(--color-surface-lowest, #fff)' }}
      >
        <span className="text-xs text-on-surface-variant truncate block" title={row.displayName}>
          {row.displayName}
        </span>
      </td>

      {/* Week cells */}
      {weekLabels.map((label) => (
        <td key={label} className="py-1 px-[1px]">
          <HeatmapCell
            cell={cellsByLabel.get(label)}
            onClick={() => { handleCellClick(label); }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Manager Row ──────────────────────────────────────────────────────────────

interface ManagerRowProps {
  row: ManagerHeatmapRow;
  weekLabels: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

function ManagerRow({ row, weekLabels, isExpanded, onToggle }: ManagerRowProps) {
  const navigate = useNavigate();
  // The manager row's weekCells represent team-averaged CHESS data (not the manager's personal data).
  const cellsByLabel = new Map(row.weekCells.map((c) => [c.cycleLabel, c]));

  function handleCellClick(weekLabel: string) {
    const cell = cellsByLabel.get(weekLabel);
    if (!cell) return;
    navigate(`/?cycleId=${cell.cycleId}&userId=${row.managerId}`);
  }

  // Build the child list: manager's own personal row first, then other team members.
  // If the manager is already in the members list (backend includes them), deduplicate.
  // NOTE (M5): The synthetic "(you)" row reuses row.weekCells which is team-averaged data,
  // not the manager's personal commitment data. It is shown as a placeholder when the
  // backend does not include the manager in the members list.
  const managerPersonalRow: PersonHeatmapRow = {
    userId: row.managerId,
    // Asterisk denotes team-averaged data, not personal data (see legend note below)
    displayName: `${row.managerName} (you)*`,
    weekCells: row.weekCells,
  };
  const memberIds = new Set(row.members.map((m) => m.userId));
  const childRows: PersonHeatmapRow[] = memberIds.has(row.managerId)
    ? row.members
    : [managerPersonalRow, ...row.members];

  return (
    <>
      <tr
        className="border-b border-outline-variant/50 bg-surface hover:bg-surface-container-low cursor-pointer"
        onClick={onToggle}
      >
        {/* Sticky name cell */}
        <td
          className="sticky left-0 z-10 py-2 pr-3 pl-3"
          style={{ backgroundColor: 'inherit' }}
        >
          <div className="flex items-center gap-1.5 min-w-[160px] max-w-[200px]">
            {/* Chevron */}
            <svg
              className="w-3 h-3 text-muted flex-shrink-0 transition-transform duration-200"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <div className="min-w-0">
              <span
                className="text-sm font-semibold text-on-surface truncate block"
                title={row.managerName}
              >
                {row.managerName}
              </span>
              <span className="text-[10px] text-muted">
                {row.managerRole} · {row.teamSize} members · team avg
              </span>
            </div>
          </div>
        </td>

        {/* Week cells (team-averaged) */}
        {weekLabels.map((label) => (
          <td
            key={label}
            className="py-2 px-[1px]"
            onClick={(e) => {
              // Don't toggle the row when clicking a cell
              e.stopPropagation();
              handleCellClick(label);
            }}
          >
            <HeatmapCell cell={cellsByLabel.get(label)} />
          </td>
        ))}
      </tr>

      {/* Person rows (expanded): manager's own row first, then team members */}
      {isExpanded && childRows.map((person) => (
        <PersonRow
          key={person.userId}
          row={person}
          weekLabels={weekLabels}
        />
      ))}
    </>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function HeatmapLegend() {
  const entries = [
    { cat: 'STRATEGIC', label: 'Strategic' },
    { cat: 'OPERATIONAL', label: 'Operational' },
    { cat: 'DEFENSIVE', label: 'Defensive' },
    { cat: 'CAPABILITY_BUILDING', label: 'Capability Building' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-outline-variant/40 mt-2">
      {entries.map(({ cat, label }) => (
        <div key={cat} className="flex items-center gap-1.5">
          <div
            className="rounded-sm flex-shrink-0"
            style={{
              width: 14,
              height: 10,
              borderRadius: 2,
              backgroundColor: CHESS_CELL_COLORS[cat],
            }}
          />
          <span className="text-[11px] text-muted">{label}</span>
        </div>
      ))}
      {/* Mixed */}
      <div className="flex items-center gap-1.5">
        <div
          className="flex-shrink-0"
          style={{
            width: 14,
            height: 10,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${CHESS_CELL_COLORS.STRATEGIC} 50%, ${CHESS_CELL_COLORS.OPERATIONAL} 50%)`,
          }}
        />
        <span className="text-[11px] text-muted">Mixed</span>
      </div>
      {/* No data */}
      <div className="flex items-center gap-1.5">
        <div
          className="flex-shrink-0"
          style={{
            width: 14,
            height: 10,
            borderRadius: 2,
            border: '1.5px dashed #CBD5E1',
          }}
        />
        <span className="text-[11px] text-muted">No data</span>
      </div>
      {/* Asterisk note */}
      <span className="text-[10px] text-muted ml-auto italic">* Team-averaged data, not personal</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ExecutionHeatmapProps {
  weekCount: number;
}

export function ExecutionHeatmap({ weekCount }: ExecutionHeatmapProps) {
  const { data, isLoading, isError } = useProgramHeatmap(weekCount);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());

  function toggleManager(managerId: string) {
    setExpandedManagers((prev) => {
      const next = new Set(prev);
      if (next.has(managerId)) {
        next.delete(managerId);
      } else {
        next.add(managerId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" label="Loading execution heatmap..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-error">Failed to load execution heatmap.</p>
      </div>
    );
  }

  const managers = data?.managers ?? [];

  if (managers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted">No heatmap data available.</p>
      </div>
    );
  }

  // Derive the ordered list of week labels from the union of all manager cells,
  // sorted chronologically (ascending). The backend may return cells in descending order.
  const allLabelSet = new Set<string>();
  for (const mgr of managers) {
    for (const cell of mgr.weekCells) allLabelSet.add(cell.cycleLabel);
  }
  const weekLabels: string[] = Array.from(allLabelSet).sort((a, b) => {
    const na = extractWeekNum(a);
    const nb = extractWeekNum(b);
    if (na !== 0 || nb !== 0) return na - nb;
    return a.localeCompare(b);
  });

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg overflow-hidden">
      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {/* Name column — fixed min width, rest shrink */}
            <col style={{ minWidth: 200 }} />
            {weekLabels.map((label) => (
              <col key={label} style={{ width: 30, minWidth: 30 }} />
            ))}
          </colgroup>

          {/* Header */}
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th
                className="sticky left-0 z-20 py-2 pr-3 pl-3 text-left text-xs font-semibold text-on-surface-variant"
                style={{ backgroundColor: 'var(--color-surface-container-low, #f5f5f5)' }}
              >
                Team
              </th>
              {weekLabels.map((label, i) => (
                <th
                  key={label}
                  className="py-2 px-[1px] text-center text-[10px] font-medium text-muted"
                  title={label}
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {managers.map((manager) => (
              <ManagerRow
                key={manager.managerId}
                row={manager}
                weekLabels={weekLabels}
                isExpanded={expandedManagers.has(manager.managerId)}
                onToggle={() => { toggleManager(manager.managerId); }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <HeatmapLegend />
      </div>
    </div>
  );
}
