/**
 * PortfolioOrgPage — drill-down view for a single portfolio company.
 * Fetches ExecutiveHealthResponse for the given orgId and renders
 * key metrics, overall grade, trend, and per-unit health breakdown.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/api/client';
import type { ExecutiveHealthResponse, OrgUnitHealth } from '@/types/observatory.types';
import Card from '@/components/Card';

const OBSERVATORY_BASE = '/api/v1/observatory';

async function getPortfolioOrgHealth(orgId: string): Promise<ExecutiveHealthResponse> {
  return fetchData<ExecutiveHealthResponse>(`${OBSERVATORY_BASE}/portfolio/${orgId}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GRADE_LABEL: Record<string, string> = {
  GREEN: 'On Track',
  YELLOW: 'Watch',
  RED: 'At Risk',
};

const GRADE_COLOR: Record<string, string> = {
  GREEN: 'text-accent',
  YELLOW: 'text-warning',
  RED: 'text-error',
};

const GRADE_ACCENT: Record<string, 'teal' | 'amber' | 'rose'> = {
  GREEN: 'teal',
  YELLOW: 'amber',
  RED: 'rose',
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
}

function KpiTile({ label, value, unit }: KpiTileProps) {
  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
        {label}
      </span>
      <span className="text-2xl font-semibold text-on-surface tabular-nums leading-none">
        {value}
        {unit && (
          <span className="text-base font-normal text-on-surface-variant ml-0.5">{unit}</span>
        )}
      </span>
    </div>
  );
}

function UnitRow({ unit }: { unit: OrgUnitHealth }) {
  const gradeColor = GRADE_COLOR[unit.grade] ?? 'text-muted';
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-outline-variant/15 last:border-0 text-[0.8125rem]">
      <div className="flex-1 min-w-0">
        <span className="text-on-surface font-medium">{unit.managerName}</span>
        <span className="text-muted ml-2">{unit.role}</span>
      </div>
      <span className="tabular-nums text-on-surface-variant w-14 text-right">
        {Math.round(unit.rallyCoveragePct)}%
      </span>
      <span className="tabular-nums text-on-surface-variant w-14 text-right">
        {Math.round(unit.completionRate)}%
      </span>
      <span className={`w-16 text-right font-medium ${gradeColor}`}>
        {GRADE_LABEL[unit.grade] ?? unit.grade}
      </span>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-surface-lowest rounded w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-surface-lowest rounded-lg" />
        ))}
      </div>
      <div className="h-48 bg-surface-lowest rounded-lg" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioOrgPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const { data: health, isLoading, isError } = useQuery<ExecutiveHealthResponse>({
    queryKey: ['portfolio', 'org', orgId],
    queryFn: () => getPortfolioOrgHealth(orgId!),
    staleTime: 5 * 60_000,
    enabled: Boolean(orgId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <button
          onClick={() => navigate('/portfolio')}
          className="text-[0.8125rem] text-accent hover:underline transition-colors"
        >
          ← Back to Portfolio
        </button>
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError || !health) {
    return (
      <div className="space-y-4 max-w-4xl">
        <button
          onClick={() => navigate('/portfolio')}
          className="text-[0.8125rem] text-accent hover:underline transition-colors"
        >
          ← Back to Portfolio
        </button>
        <div className="bg-error/10 border border-error/30 rounded-lg p-6 text-center">
          <p className="text-error font-medium">Failed to load company data</p>
          <p className="text-muted text-[0.875rem] mt-1">
            Unable to fetch health data for this organization.
          </p>
        </div>
      </div>
    );
  }

  const gradeLabel = GRADE_LABEL[health.overallGrade] ?? health.overallGrade;
  const gradeColor = GRADE_COLOR[health.overallGrade] ?? 'text-muted';
  const gradeAccent = GRADE_ACCENT[health.overallGrade] ?? 'teal';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <button
        onClick={() => navigate('/portfolio')}
        className="text-[0.8125rem] text-accent hover:underline transition-colors"
      >
        ← Back to Portfolio
      </button>

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-[1.75rem] text-on-surface font-normal">
            {health.orgName}
          </h1>
          <p className="text-[0.875rem] text-muted mt-0.5">
            Company Health Overview
          </p>
        </div>
        <div className="text-right">
          <span className={`font-semibold text-[1.125rem] ${gradeColor}`}>{gradeLabel}</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Rally Cry Coverage" value={Math.round(health.strategicAlignmentPct)} unit="%" />
        <KpiTile label="Completion Rate" value={Math.round(health.completionRate)} unit="%" />
        <KpiTile label="Carry-Forward Rate" value={Math.round(health.carryForwardRate)} unit="%" />
        <KpiTile label="Active Drift Signals" value={health.activeDriftSignals} />
      </div>

      {/* Summary card */}
      <Card accent={gradeAccent} padding="spacious">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <div className="label-caps text-muted mb-1">Overall Grade</div>
            <div className={`font-semibold text-[1.125rem] ${gradeColor}`}>{gradeLabel}</div>
          </div>
          {health.integrityFlags > 0 && (
            <div>
              <div className="label-caps text-muted mb-1">Integrity Flags</div>
              <div className="font-serif text-[1.125rem] text-warning tabular-nums">
                {health.integrityFlags}
              </div>
            </div>
          )}
          <div>
            <div className="label-caps text-muted mb-1">Last Computed</div>
            <div className="text-[0.875rem] text-on-surface-variant">
              {new Date(health.computedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Unit health breakdown */}
      {health.units && health.units.length > 0 && (
        <div>
          <h2 className="font-serif text-[1.25rem] text-on-surface mb-4 font-normal">
            Team Health
          </h2>
          <Card padding="spacious">
            {/* Column headers */}
            <div className="flex items-center gap-4 pb-2 border-b border-outline-variant/30 text-[0.75rem] font-medium text-muted uppercase tracking-wide">
              <div className="flex-1">Manager / Team</div>
              <div className="w-14 text-right">Coverage</div>
              <div className="w-14 text-right">Completion</div>
              <div className="w-16 text-right">Grade</div>
            </div>
            {health.units.map((unit) => (
              <UnitRow key={unit.managerId} unit={unit} />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
