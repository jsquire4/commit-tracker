import { useContext, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

const LEADERSHIP_ROLES = new Set(['DIRECTOR', 'VP', 'EXECUTIVE']);
const MANAGER_ROLES = new Set(['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE']);

export function Layout({ children }: LayoutProps) {
  const auth = useContext(AuthContext);
  const isLeader = auth?.role != null && LEADERSHIP_ROLES.has(auth.role);
  const isManager = auth?.role != null && MANAGER_ROLES.has(auth.role);

  const navItems = [
    { to: '/', label: 'This Week' },
    { to: '/reconciliation', label: 'Reconciliation' },
    ...(isManager ? [{ to: '/team', label: 'My Team' }] : []),
    ...(isLeader ? [{ to: '/briefing', label: 'Briefing' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm sticky top-0 z-30 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold shrink-0 text-gradient from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">ST6</h1>
            <div className="flex items-center gap-1 overflow-x-auto">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
        {/* Gradient border bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
