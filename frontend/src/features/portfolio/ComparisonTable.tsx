/**
 * ComparisonTable — Cross-company comparison table.
 * Columns: Company, Weeks Active, Alignment, Trend, Coverage, Carry-Forward,
 * Drift Signals, Health Grade.
 * Staggered row fade-in. Row highlight for at-risk companies.
 */
import Card from '@/components/Card';
import { HealthGradeBadge } from './HealthGradeBadge';
import { TrendArrow } from './TrendArrow';
import type { ComparisonRow } from '@/types/portfolio.types';

interface ComparisonTableProps {
  rows: ComparisonRow[];
  animationDelay?: number;
}

export function ComparisonTable({ rows, animationDelay = 0 }: ComparisonTableProps) {
  return (
    <div>
      <h2
        className="font-serif text-[1.25rem] text-on-surface mb-4 font-normal animate-fade-up"
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        Comparative Analysis
      </h2>
      <Card
        padding="compact"
        className="!p-0 overflow-hidden animate-fade-up"
        style={{ animationDelay: `${animationDelay + 40}ms` }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Company', 'Weeks Active', 'Alignment', 'Trend', 'Coverage', 'Carry-Forward', 'Drift Signals', 'Health Grade'].map(
                (header, i) => (
                  <th
                    key={header}
                    className={[
                      'label-caps text-muted font-medium px-3 py-3 border-b border-outline-variant',
                      i === 0 ? 'text-left' : 'text-right',
                    ].join(' ')}
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isWatch = row.healthGrade === 'Watch';
              const isLow = row.healthGrade === 'At Risk';

              return (
                <tr
                  key={row.orgId}
                  className={[
                    'transition-colors hover:bg-surface animate-fade-up',
                    isWatch ? 'border-l-[3px] border-l-warning' : '',
                    isLow ? 'border-l-[3px] border-l-navy' : '',
                    !isWatch && !isLow ? 'border-l-[3px] border-l-transparent' : '',
                  ].join(' ')}
                  style={{
                    animationDelay: `${animationDelay + 80 + i * 40}ms`,
                    transitionDuration: 'var(--duration-fast, 150ms)',
                  }}
                >
                  <td className="text-body text-on-surface font-medium px-3 py-3 border-b border-outline-variant/15">
                    {row.name}
                  </td>
                  <td className="text-body text-on-surface tabular-nums px-3 py-3 border-b border-outline-variant/15 text-right">
                    {row.weeksActive}
                  </td>
                  <td className="text-body text-on-surface tabular-nums px-3 py-3 border-b border-outline-variant/15 text-right">
                    {row.alignment}%
                  </td>
                  <td className="px-3 py-3 border-b border-outline-variant/15 text-right">
                    <TrendArrow direction={row.trend} label={row.trendLabel} />
                  </td>
                  <td className="text-body text-on-surface tabular-nums px-3 py-3 border-b border-outline-variant/15 text-right">
                    {row.coverage}%
                  </td>
                  <td className="text-body text-on-surface tabular-nums px-3 py-3 border-b border-outline-variant/15 text-right">
                    {row.carryForward}%
                  </td>
                  <td className="text-body text-on-surface tabular-nums px-3 py-3 border-b border-outline-variant/15 text-right">
                    {row.driftSignals}
                  </td>
                  <td className="px-3 py-3 border-b border-outline-variant/15 text-right">
                    <HealthGradeBadge grade={row.healthGrade} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
