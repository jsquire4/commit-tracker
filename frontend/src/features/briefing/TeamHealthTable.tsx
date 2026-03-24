/**
 * TeamHealthTable — sortable table of team leads with drift signals,
 * coverage, carry-forward rates. Clickable rows drill into team detail.
 */
import type { OrgUnitHealth } from '@/types/observatory.types';

interface TeamHealthTableProps {
  units: OrgUnitHealth[];
  onSelectTeam: (managerId: string) => void;
}

function driftLabel(unit: OrgUnitHealth): { text: string; className: string } {
  const dir = unit.trendDirection.toUpperCase();
  if (dir === 'DECLINING' && Math.abs(unit.weeksTrending) >= 3) {
    return { text: `Alignment \u2193 Sustained`, className: 'text-warning font-medium' };
  }
  if (dir === 'DECLINING') {
    return { text: `Alignment \u2193 Emerging`, className: 'text-warning' };
  }
  return { text: '\u2014', className: 'text-muted' };
}

export function TeamHealthTable({ units, onSelectTeam }: TeamHealthTableProps) {
  // Sort: drift rows first (declining), then by strategic alignment ascending
  const sorted = [...units].sort((a, b) => {
    const aDrift = a.trendDirection.toUpperCase() === 'DECLINING' ? 0 : 1;
    const bDrift = b.trendDirection.toUpperCase() === 'DECLINING' ? 0 : 1;
    if (aDrift !== bDrift) return aDrift - bDrift;
    return a.strategicAlignmentPct - b.strategicAlignmentPct;
  });

  return (
    <div className="bg-surface-lowest rounded-sm overflow-hidden">
      <table className="w-full border-collapse">
        <caption className="sr-only">Team Health — metrics exclude the team lead&apos;s own commitments</caption>
        <thead>
          <tr>
            {['Team Lead', 'Headcount', 'Rally Cry Coverage', 'Completion', 'Drift Signal', 'Trending', ''].map(
              (h, i) => (
                <th
                  key={h || `empty-${i}`}
                  className={[
                    'label-caps text-muted font-medium py-3 px-3 border-b border-outline-variant',
                    i > 0 ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((unit, i) => {
            const drift = driftLabel(unit);
            const isDrift = unit.trendDirection.toUpperCase() === 'DECLINING';
            return (
              <tr
                key={unit.managerId}
                onClick={() => onSelectTeam(unit.managerId)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTeam(unit.managerId); } }}
                tabIndex={0}
                role="button"
                className={[
                  'cursor-pointer transition-colors group',
                  'hover:bg-surface-container-low',
                  isDrift ? 'border-l-[3px] border-l-warning' : 'border-l-[3px] border-l-transparent',
                  'animate-fade-up',
                ].join(' ')}
                style={{
                  animationDelay: `${(i + 10) * 40}ms`,
                  borderBottom: '1px solid rgba(232,229,224,0.15)',
                }}
                title={`View ${unit.managerName}\u2019s team`}
              >
                <td className="py-3 px-3 text-body text-on-surface font-medium">{unit.managerName}</td>
                <td className="py-3 px-3 text-body text-on-surface text-right tabular-nums">{unit.headcount ?? '\u2014'}</td>
                <td className="py-3 px-3 text-body text-on-surface text-right tabular-nums">{Math.round(unit.strategicAlignmentPct)}%</td>
                <td className="py-3 px-3 text-body text-on-surface text-right tabular-nums">
                  {Math.round(unit.completionRate)}%
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`text-[0.8125rem] ${drift.className}`}>{drift.text}</span>
                </td>
                <td className="py-3 px-3 text-body text-on-surface text-right tabular-nums">
                  {unit.weeksTrending !== 0 ? `${Math.abs(unit.weeksTrending)}w` : '\u2014'}
                </td>
                <td className="py-3 px-3 w-8 text-right pr-4">
                  <span className="text-muted opacity-0 group-hover:opacity-100 transition-opacity text-[0.8125rem]">&rarr;</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* H3 note: findSubtreeUserIds excludes the root manager, so team metrics here
          cover only direct/transitive reports — not the team lead themselves. This
          is intentional for team scoping but means org-wide numbers (which include
          all users) will always be slightly higher than the sum of team subtotals. */}
      <p className="px-3 py-2 text-[0.75rem] text-muted border-t border-outline-variant">
        Team metrics exclude the team lead&apos;s own commitments.
      </p>
    </div>
  );
}
