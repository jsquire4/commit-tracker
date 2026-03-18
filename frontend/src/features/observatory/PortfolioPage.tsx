import { useNavigate } from 'react-router-dom';
import { usePortfolioHealth } from '@/hooks/useObservatory';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { HealthGradeIndicator } from './HealthGradeIndicator';
import type { PortcoSummary, HealthGrade, UserRole } from '@/types';

const ALLOWED_ROLES: UserRole[] = ['DIRECTOR', 'VP', 'EXECUTIVE'];

interface PortcoCardProps {
  portco: PortcoSummary;
  onClick: () => void;
}

function PortcoCard({ portco, onClick }: PortcoCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 hover:shadow-md transition-shadow space-y-4"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Org name */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
          {portco.orgName}
        </h2>
      </div>

      {/* Health grade — large colored circle */}
      <div className="flex justify-center">
        <HealthGradeIndicator
          grade={portco.overallGrade as HealthGrade}
          percentage={portco.strategicAlignmentPct}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alignment</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
            {String(Math.round(portco.strategicAlignmentPct))}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Headcount</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
            {String(portco.headcount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Drift Signals</p>
          <p className={`text-sm font-semibold mt-0.5 ${
            portco.activeDriftSignals > 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {String(portco.activeDriftSignals)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data, isLoading, isError, error } = usePortfolioHealth();

  // Role guard — after all hooks
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Portfolio view requires Director or above.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label="Loading portfolio health…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Failed to load portfolio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
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

  const { portfolioName, portcos } = data;

  function handlePortcoClick(orgId: string) {
    void navigate(`/observatory?orgId=${orgId}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{portfolioName}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Portfolio health overview across all portfolio companies.
        </p>
      </div>

      {/* Empty state */}
      {portcos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No portfolio companies found.</p>
        </div>
      )}

      {/* Portco grid */}
      {portcos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portcos.map((portco) => (
            <PortcoCard
              key={portco.orgId}
              portco={portco}
              onClick={() => { handlePortcoClick(portco.orgId); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
