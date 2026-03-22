import { useState } from 'react';
import { useMe, useUpdateUser } from '@/hooks/useUsers';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Card from '@/components/Card';
import { Badge } from '@/components/Badge';

export function ProfileTab() {
  const { data: user, isLoading, isError } = useMe();
  const updateMutation = useUpdateUser();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  if (isLoading) {
    return <LoadingSpinner label="Loading profile..." />;
  }

  if (isError || !user) {
    return <p className="text-body text-error">Failed to load profile.</p>;
  }

  function startEditing() {
    setDisplayName(user!.displayName);
    updateMutation.reset();
    setEditing(true);
  }

  async function handleSave() {
    if (!user) return;
    try {
      await updateMutation.mutateAsync({ id: user.id, request: { displayName, role: user.role } });
      setEditing(false);
    } catch {
      // Error visible via mutation state
    }
  }

  const roleLabel: Record<string, string> = {
    EMPLOYEE: 'Individual Contributor',
    MANAGER: 'Manager',
    DIRECTOR: 'Director',
    VP: 'Vice President',
    EXECUTIVE: 'Executive',
    ANALYST: 'Analyst',
  };

  return (
    <div className="max-w-[640px]">
      <Card padding="spacious">
        <h2 className="font-serif text-[1.125rem] font-normal text-on-surface mb-6">
          Your Profile
        </h2>

        <dl>
          {/* Display Name */}
          <div className="flex items-start justify-between py-3.5 border-b border-outline-variant/15">
            <div>
              <dt className="label-caps text-muted mb-1">Display Name</dt>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); }}
                    className="bg-transparent border-0 border-b-2 border-b-accent px-0 py-0.5 text-body text-on-surface focus:outline-none w-[200px]"
                  />
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() => { void handleSave(); }}
                    className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-accent hover:text-accent-dark transition-colors duration-[150ms] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); }}
                    className="text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-muted hover:text-on-surface-variant transition-colors duration-[150ms]"
                  >
                    Cancel
                  </button>
                  {updateMutation.isError && (
                    <p className="text-[0.75rem] text-error mt-1">Failed to save. Please try again.</p>
                  )}
                </div>
              ) : (
                <dd className="text-body text-on-surface">{user.displayName}</dd>
              )}
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="text-muted hover:text-accent transition-colors duration-[150ms] p-1 flex items-center gap-1 text-[0.75rem]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </button>
            )}
          </div>

          {/* Email */}
          <div className="py-3.5 border-b border-outline-variant/15">
            <dt className="label-caps text-muted mb-1">Email</dt>
            <dd className="text-body text-on-surface">{user.email}</dd>
          </div>

          {/* Role */}
          <div className="py-3.5 border-b border-outline-variant/15">
            <dt className="label-caps text-muted mb-1">Role</dt>
            <dd className="text-body text-on-surface mt-0.5">
              <Badge size="sm">{roleLabel[user.role] ?? user.role}</Badge>
            </dd>
          </div>

          {/* Reports To */}
          <div className="py-3.5 border-b border-outline-variant/15">
            <dt className="label-caps text-muted mb-1">Reports To</dt>
            <dd className="text-body text-on-surface">
              {user.reportsToDisplayName ?? '\u2014'}
            </dd>
          </div>

          {/* Cost Band */}
          <div className="py-3.5 border-b border-outline-variant/15">
            <dt className="label-caps text-muted mb-1">Cost Band</dt>
            <dd className="text-body text-on-surface">
              {user.costBandName
                ? `${user.costBandName} \u00B7 Tier ${user.costBandTier}`
                : 'Not assigned'}
            </dd>
          </div>

          {/* Organization */}
          <div className="py-3.5">
            <dt className="label-caps text-muted mb-1">Organization</dt>
            <dd className="text-body text-on-surface">{'\u2014'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
