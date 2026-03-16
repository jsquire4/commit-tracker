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
  EXECUTIVE: 'bg-purple-100 text-purple-800',
  VP:        'bg-indigo-100 text-indigo-800',
  DIRECTOR:  'bg-blue-100 text-blue-800',
  MANAGER:   'bg-cyan-100 text-cyan-800',
  EMPLOYEE:  'bg-green-100 text-green-800',
  ANALYST:   'bg-yellow-100 text-yellow-800',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700';
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
      localStorage.setItem('st6-dev-auth', JSON.stringify(savedAuth));
      onAuthenticated(savedAuth);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigningIn(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading seeded users…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-700 font-medium mb-1">Dev login unavailable</p>
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-3">
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium mb-4">
            DEV MODE
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Choose a user to log in as</h1>
          <p className="text-gray-500 text-sm mt-1">
            Only available in local/test profiles. Click any user to authenticate.
          </p>
        </div>

        {/* User table(s) per org */}
        {Object.entries(byOrg).map(([orgId, group]) => (
          <div key={orgId} className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              {group.orgName}
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Role</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {group.users.map(u => (
                    <tr
                      key={u.id}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => { void handleSelectUser(u); }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{u.displayName}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {signingIn === u.id ? (
                          <span className="text-xs text-gray-400">Signing in…</span>
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
