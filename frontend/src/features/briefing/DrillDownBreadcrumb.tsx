import type { useDrillDown } from '@/hooks/useDrillDown';

interface DrillDownBreadcrumbProps {
  drill: ReturnType<typeof useDrillDown>;
  /** Display names for the current drill-down path */
  names: {
    rallyCry?: string;
    team?: string;
    person?: string;
  };
}

export function DrillDownBreadcrumb({ drill, names }: DrillDownBreadcrumbProps) {
  const segments: { label: string; onClick: () => void }[] = [
    { label: 'Briefing', onClick: () => { drill.resetDrill(); } },
  ];

  if (drill.rallyCryId) {
    segments.push({
      label: names.rallyCry ?? 'Rally Cry',
      onClick: () => { drill.drillTo({ rc: drill.rallyCryId! }); },
    });
  }

  if (drill.teamId) {
    segments.push({
      label: names.team ?? 'Team',
      onClick: () => { drill.drillTo({ rc: drill.rallyCryId!, team: drill.teamId! }); },
    });
  }

  if (drill.personId) {
    segments.push({
      label: names.person ?? 'Person',
      onClick: () => { drill.drillTo({ rc: drill.rallyCryId!, team: drill.teamId!, person: drill.personId! }); },
    });
  }

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-body px-8 py-3" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="text-on-surface font-medium">{seg.label}</span>
            ) : (
              <button
                type="button"
                onClick={seg.onClick}
                className="text-muted hover:text-on-surface-variant transition-colors"
                style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
              >
                {seg.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
