import { useEffect, useState } from 'react';
import type { AuthContext } from './App';

interface DevUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  orgId: string;
  orgName: string;
}

interface DevLoginProps {
  onAuthenticated: (auth: AuthContext & { displayName: string; role: string; orgName: string }) => void;
}

const ROLE_COLORS: Record<string, string> = {
  EXECUTIVE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  VP:        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  DIRECTOR:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  MANAGER:   'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  EMPLOYEE:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ANALYST:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

export function DevLogin({ onAuthenticated }: DevLoginProps) {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dev/users')
      .then(r => {
        if (!r.ok) throw new Error(`/api/dev/users returned ${String(r.status)}`);
        return r.json() as Promise<{ data: DevUser[] }>;
      })
      .then(body => { setUsers(body.data); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { setLoading(false); });
  }, []);

  async function handleSelectUser(user: DevUser) {
    setSigningIn(user.id);
    try {
      const r = await fetch(`/api/dev/token/${user.id}`);
      if (!r.ok) throw new Error(`token endpoint returned ${String(r.status)}`);
      const body = (await r.json()) as { data: { token: string } };
      const token = body.data.token;

      const savedAuth = {
        token,
        userId: user.id,
        orgId: user.orgId,
        displayName: user.displayName,
        role: user.role,
        orgName: user.orgName,
      };
      localStorage.setItem('compass-dev-auth', JSON.stringify(savedAuth));
      onAuthenticated(savedAuth);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigningIn(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading seeded users…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700 dark:text-red-400 font-medium mb-1">Dev login unavailable</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">
            Make sure the backend is running with the <code className="font-mono">local</code> profile.
          </p>
        </div>
      </div>
    );
  }

  // Group users by org for display
  const byOrg: Record<string, { orgName: string; users: DevUser[] }> = {};
  for (const u of users) {
    if (!byOrg[u.orgId]) byOrg[u.orgId] = { orgName: u.orgName, users: [] };
    const group = byOrg[u.orgId];
    if (group) group.users.push(u);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium mb-4">
            DEV MODE
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Choose a user to log in as</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Only available in local/test profiles. Click any user to authenticate.
          </p>
        </div>

        {/* User table(s) per org */}
        {Object.entries(byOrg).map(([orgId, group]) => (
          <div key={orgId} className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              {group.orgName}
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Role</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {group.users.map(u => (
                    <tr
                      key={u.id}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                      onClick={() => { void handleSelectUser(u); }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.displayName}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {signingIn === u.id ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Signing in…</span>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">Log in</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
