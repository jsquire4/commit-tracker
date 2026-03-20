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
  EXECUTIVE: 'bg-navy/10 text-navy',
  VP:        'bg-navy/10 text-navy',
  DIRECTOR:  'bg-accent/10 text-accent',
  MANAGER:   'bg-accent/10 text-accent',
  EMPLOYEE:  'bg-surface-container-highest text-on-surface-variant',
  ANALYST:   'bg-warning/10 text-warning',
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLORS[role] ?? 'bg-surface-container-highest text-on-surface-variant';
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-muted text-sm">Loading seeded users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="bg-error/10 border border-error/20 rounded-sm p-6 max-w-md text-center">
          <p className="text-error font-medium mb-1">Dev login unavailable</p>
          <p className="text-error text-sm">{error}</p>
          <p className="text-muted text-xs mt-3">
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
    <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium mb-4">
            DEV MODE
          </div>
          <h1 className="text-2xl font-semibold text-on-surface">Choose a user to log in as</h1>
          <p className="text-muted text-sm mt-1">
            Only available in local/test profiles. Click any user to authenticate.
          </p>
        </div>

        {/* User table(s) per org */}
        {Object.entries(byOrg).map(([orgId, group]) => (
          <div key={orgId} className="mb-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              {group.orgName}
            </h2>
            <div className="bg-surface-lowest rounded-sm shadow-whisper border border-outline-variant overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Role</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {group.users.map(u => (
                    <tr
                      key={u.id}
                      className="hover:bg-surface transition-colors duration-[var(--duration-fast)] cursor-pointer"
                      onClick={() => { void handleSelectUser(u); }}
                    >
                      <td className="px-4 py-3 font-medium text-on-surface">{u.displayName}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {signingIn === u.id ? (
                          <span className="text-xs text-muted">Signing in...</span>
                        ) : (
                          <span className="text-xs text-accent font-medium">Log in</span>
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
