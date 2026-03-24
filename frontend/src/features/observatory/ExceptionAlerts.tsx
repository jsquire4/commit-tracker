import type { DriftSignal, OrgUnitHealth } from '@/types/observatory.types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  icon: 'drift' | 'red' | 'declining';
  message: string;
}

// ─── Alert Generation ────────────────────────────────────────────────────────

export function generateAlerts(
  units: OrgUnitHealth[],
  driftSignals: DriftSignal[],
): Alert[] {
  const alerts: Alert[] = [];

  // RED-graded teams
  for (const unit of units) {
    if (unit.grade === 'RED') {
      const weekNote = unit.weeksTrending > 1
        ? `, trending down for ${String(unit.weeksTrending)} weeks`
        : '';
      alerts.push({
        id: `red-${unit.managerId}`,
        icon: 'red',
        message: `${unit.managerName}'s team: ${String(Math.round(unit.strategicAlignmentPct))}% rally cry coverage${weekNote}`,
      });
    }
  }

  // Sustained or structural drift signals
  for (const signal of driftSignals) {
    if (signal.severity === 'SUSTAINED' || signal.severity === 'STRUCTURAL') {
      alerts.push({
        id: `drift-${signal.unitId}-${signal.metric}`,
        icon: 'drift',
        message: `${signal.unitName}: ${signal.severity.toLowerCase()} ${signal.metric.toLowerCase()} drift (${String(signal.weekCount)} weeks)`,
      });
    }
  }

  // Declining teams that aren't already RED
  for (const unit of units) {
    if (unit.trendDirection.toUpperCase() === 'DECLINING' && unit.grade !== 'RED' && unit.weeksTrending >= 3) {
      alerts.push({
        id: `declining-${unit.managerId}`,
        icon: 'declining',
        message: `${unit.managerName}'s team declining for ${String(unit.weeksTrending)} consecutive weeks`,
      });
    }
  }

  return alerts;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ExceptionAlertsProps {
  alerts: Alert[];
}

export function ExceptionAlerts({ alerts }: ExceptionAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 px-6 bg-green-500/5 border-t border-green-500/20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-green-600">All teams on course</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-outline-variant bg-surface/85 backdrop-blur px-6 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant scrollbar-track-transparent pb-1">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0',
              'bg-surface-container backdrop-blur text-xs max-w-xs',
              alert.icon === 'red'
                ? 'border-red-500/30 text-red-300'
                : alert.icon === 'drift'
                  ? 'border-amber-500/30 text-amber-300'
                  : 'border-yellow-500/30 text-yellow-300',
            ].join(' ')}
          >
            {/* Icon */}
            <span className="flex-shrink-0">
              {alert.icon === 'red' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              )}
              {alert.icon === 'drift' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              {alert.icon === 'declining' && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              )}
            </span>
            <span className="truncate">{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
