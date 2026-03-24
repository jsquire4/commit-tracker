import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentCycle } from '@/hooks/useCycle';
import { VP_AND_ABOVE, DIRECTOR_AND_ABOVE, MANAGER_AND_ABOVE } from '@/constants/roles';

interface LayoutProps {
  children: ReactNode;
}

function getInitials(displayName?: string): string {
  if (!displayName) return '??';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

function formatCycleWeek(cycle: { label: string; startsAt: string; endsAt: string }): string {
  const weekMatch = cycle.label.match(/\d+/);
  const weekNum = weekMatch ? weekMatch[0] : '?';
  const start = new Date(cycle.startsAt);
  const end = new Date(cycle.endsAt);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Week ${weekNum} \u00b7 ${fmt(start)}\u2013${fmt(end)}`;
}

const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'px-3 py-2 text-body font-medium whitespace-nowrap transition-colors',
    'border-b-2',
    isActive
      ? 'border-accent text-accent'
      : 'border-transparent text-on-surface-variant hover:text-on-surface',
  ].join(' ');

export function Layout({ children }: LayoutProps) {
  const auth = useAuth();
  const { data: cycle } = useCurrentCycle();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = auth.role;
  const isManager = role != null && MANAGER_AND_ABOVE.has(role);
  const isDirector = role != null && DIRECTOR_AND_ABOVE.has(role);
  const isVP = role != null && VP_AND_ABOVE.has(role);

  const initials = getInitials(auth.displayName);

  const tabs = [
    { to: '/', label: 'My Week', show: true },
    { to: '/team', label: 'My Team', show: isManager },
    { to: '/briefing', label: 'The Briefing', show: isDirector },
    { to: '/strategy', label: 'Strategy', show: isDirector },
    { to: '/portfolio', label: 'Portfolio', show: isVP },
    { to: '/observatory', label: 'Observatory', show: isVP },
  ].filter((t) => t.show);

  return (
    <div className="min-h-screen bg-surface">
      <nav
        className="sticky top-0 z-30 bg-surface/85 backdrop-blur-[20px] border-b border-outline-variant/15"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Top row: brand — cycle — avatar + gear */}
          <div className="flex items-center justify-between h-12">
            <span className="font-serif text-sm tracking-widest uppercase text-on-surface select-none">
              compass
            </span>

            {/* Cycle display (centered) */}
            {cycle && (
              <span className="hidden sm:block text-small text-on-surface-variant">
                {formatCycleWeek(cycle)}
              </span>
            )}

            {/* Right: avatar + gear */}
            <div className="flex items-center gap-2">
              {/* Avatar initials */}
              <div
                className="flex items-center justify-center w-8 h-8 rounded-sm bg-accent text-white text-label font-medium select-none"
                title={auth.displayName ?? 'User'}
              >
                {initials}
              </div>
              {/* Gear icon */}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  [
                    'p-1.5 rounded-sm transition-colors',
                    isActive
                      ? 'text-accent'
                      : 'text-on-surface-variant hover:text-on-surface',
                  ].join(' ')
                }
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </NavLink>

              {/* Hamburger (< 900px) */}
              <button
                className="p-1.5 rounded-sm text-on-surface-variant hover:text-on-surface transition-colors min-[900px]:hidden"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom row: tab bar (desktop) */}
          <div className="hidden min-[900px]:flex items-center gap-1 -mb-px overflow-x-auto scrollbar-thin">
            {tabs.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={tabLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="min-[900px]:hidden border-t border-outline-variant/15 bg-surface/95 backdrop-blur-[20px]">
            <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-1">
              {tabs.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'px-3 py-2 text-body font-medium rounded-sm transition-colors',
                      isActive
                        ? 'text-accent bg-surface-container'
                        : 'text-on-surface-variant hover:text-on-surface',
                    ].join(' ')
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
