/**
 * CompanyCard — Card per company in the portfolio.
 * Health-grade left-border (teal/amber/rose). Company name + subtitle.
 * Metrics row. Sparkline SVG. Rally cry summary with status dots.
 * Drift signal callout. "View Briefing" link.
 */
import Card from '@/components/Card';
import { Sparkline } from './Sparkline';
import type { PortfolioCompany, HealthGradeLabel } from '@/types/portfolio.types';

interface CompanyCardProps {
  company: PortfolioCompany;
  animationDelay?: number;
}

const gradeAccent: Record<HealthGradeLabel, 'teal' | 'amber' | 'rose'> = {
  'On Track': 'teal',
  Watch: 'amber',
  'At Risk': 'rose',
};

const statusDotClass: Record<string, string> = {
  'on-track': 'bg-accent',
  behind: 'bg-warning',
  stalled: 'bg-error',
  flagged: 'bg-error',
  'coverage-gap': 'bg-warning',
};

const statusTextClass: Record<string, string> = {
  'on-track': 'text-muted',
  behind: 'text-warning',
  stalled: 'text-error',
  flagged: 'text-error',
  'coverage-gap': 'text-warning',
};

export function CompanyCard({ company, animationDelay = 0 }: CompanyCardProps) {
  return (
    <Card
      accent={gradeAccent[company.healthGrade]}
      hoverable
      padding="spacious"
      className="animate-fade-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-serif text-[1.25rem] text-on-surface font-normal mb-1">
            {company.name}
          </h3>
          <p className="text-[0.8125rem] text-muted">{company.subtitle}</p>
        </div>
        {/* TODO: Wire to portfolio drill-down when implemented */}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4 mb-5 pb-5 border-b border-outline-variant/15">
        {[
          { label: 'Rally Cry Coverage', value: company.metrics.strategicAlignment, suffix: '%' },
          { label: 'Coverage', value: company.metrics.coverage, suffix: '%' },
          { label: 'Carry-Forward', value: company.metrics.carryForward, suffix: '%' },
          { label: 'Completion Rate', value: company.metrics.completionRate, suffix: '%' },
        ].map((m) => (
          <div key={m.label}>
            <div className="label-caps text-muted mb-1">{m.label}</div>
            <div className="font-serif text-[1.125rem] tabular-nums text-on-surface">
              {m.value}{m.suffix}
            </div>
          </div>
        ))}
      </div>

      {/* Sparkline row */}
      <div className="flex items-center gap-3 mb-5">
        <span className="label-caps text-muted flex-shrink-0">Work Type Distribution</span>
        <Sparkline data={company.alignmentTrend} />
      </div>

      {/* Rally cry summary */}
      <div className="mb-4">
        <div className="label-caps text-muted mb-2">Rally Cries</div>
        <ul className="space-y-1.5">
          {company.rallyCries.map((rc) => (
            <li
              key={rc.name}
              className="flex items-center gap-2 text-[0.8125rem] text-on-surface-variant"
            >
              <span
                className={`inline-block w-[5px] h-[5px] rounded-full flex-shrink-0 ${statusDotClass[rc.status] ?? 'bg-muted'}`}
              />
              <span className="flex-1">
                {rc.name} &mdash; {rc.commitmentCount} commitment{rc.commitmentCount !== 1 ? 's' : ''}
                {rc.status !== 'on-track' && rc.status !== 'behind' ? '' : `, ${rc.status.replace('-', ' ')}`}
              </span>
              <span
                className={`text-[0.75rem] flex-shrink-0 ${statusTextClass[rc.status] ?? 'text-muted'}`}
              >
                {rc.status === 'on-track' ? 'on track' : rc.status.replace('-', ' ')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Drift signals */}
      <div className="flex items-baseline gap-2 pt-3 border-t border-outline-variant/15">
        <span className="label-caps text-muted flex-shrink-0">Active Drift Signals</span>
        <span
          className={`text-[0.8125rem] ${
            company.driftSignals.severity === 'warning' ? 'text-warning' : 'text-muted'
          }`}
        >
          {company.driftSignals.description}
        </span>
      </div>
    </Card>
  );
}
