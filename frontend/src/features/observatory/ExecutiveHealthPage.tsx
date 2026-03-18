import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useExecutiveHealth, useDriftReport, useIntegrityReport } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { HealthGradeIndicator } from './HealthGradeIndicator';
import { OrgUnitCard } from './OrgUnitCard';
import { DriftSignalList } from './DriftSignalList';
import { IntegrityFlagList } from './IntegrityFlagList';
import type { UserRole } from '@/types';

const ALLOWED_ROLES: UserRole[] = ['DIRECTOR', 'VP', 'EXECUTIVE'];

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ExecutiveHealthPage() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErrorObj,
  } = useExecutiveHealth();

  const { data: driftReport } = useDriftReport();
  const { data: integrityReport } = useIntegrityReport();

  // Role guard
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Access Restricted
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          The Executive Health Dashboard is only accessible to Directors, VPs, and Executives.
        </p>
      </div>
    );
  }

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label="Loading executive health data…" />
      </div>
    );
  }

  if (healthError || !health) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Failed to load health data
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {healthErrorObj instanceof Error
            ? healthErrorObj.message
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => { window.location.reload(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  const driftSignals = driftReport?.signals ?? [];
  const integrityFlags = integrityReport?.flags ?? [];

  const hasSignals = driftSignals.length > 0;
  const hasFlags = integrityFlags.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top bar: org name, cycle label, computed timestamp */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {health.orgName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Executive Health Dashboard
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Last computed
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatTimestamp(health.computedAt)}
          </p>
        </div>
      </div>

      {/* Overall health grade */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-premium">
        <HealthGradeIndicator
          grade={health.overallGrade}
          percentage={health.strategicAlignmentPct}
        />
        <div className="space-y-1">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Org-wide Strategic Alignment
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>
              Completion rate:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {String(Math.round(health.completionRate))}%
              </span>
            </span>
            <span>
              Carry-forward rate:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {String(Math.round(health.carryForwardRate))}%
              </span>
            </span>
            {health.activeDriftSignals > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {health.activeDriftSignals} active drift signal
                {health.activeDriftSignals !== 1 ? 's' : ''}
              </span>
            )}
            {health.integrityFlags > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {health.integrityFlags} integrity flag
                {health.integrityFlags !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Org unit cards */}
      {health.units.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No org units found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
              Org Units
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
              {health.units.map((unit) => (
                <OrgUnitCard
                  key={unit.managerId}
                  unit={unit}
                  onClick={() => {
                    void navigate(`/observatory/team/${unit.managerId}`);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drift signals section — only shown when signals exist */}
      {hasSignals && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <DriftSignalList signals={driftSignals} />
        </div>
      )}

      {/* Integrity flags section — only shown when flags exist */}
      {hasFlags && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <IntegrityFlagList flags={integrityFlags} />
        </div>
      )}
    </div>
  );
}
