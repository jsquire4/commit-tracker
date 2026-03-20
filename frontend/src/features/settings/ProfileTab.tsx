import { useState } from 'react';
import { useMe } from '@/hooks/useUsers';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function ProfileTab() {
  const { data: user, isLoading, isError } = useMe();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  if (isLoading) {
    return <LoadingSpinner label="Loading profile..." />;
  }

  if (isError || !user) {
    return <p className="text-sm text-red-400">Failed to load profile.</p>;
  }

  function startEditing() {
    setDisplayName(user!.displayName);
    setEditing(true);
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
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Your Profile</h2>

        <dl className="space-y-4">
          {/* Display Name */}
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</dt>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); }}
                    className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => { setEditing(false); }}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <dd className="text-sm text-gray-200 mt-1">{user.displayName}</dd>
              )}
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {/* Email */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</dt>
            <dd className="text-sm text-gray-200 mt-1">{user.email}</dd>
          </div>

          {/* Role */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</dt>
            <dd className="text-sm text-gray-200 mt-1">{roleLabel[user.role] ?? user.role}</dd>
          </div>

          {/* Reports To */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reports To</dt>
            <dd className="text-sm text-gray-200 mt-1">{user.reportsToDisplayName ?? 'None (top-level)'}</dd>
          </div>

          {/* Cost Band */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Level</dt>
            <dd className="text-sm text-gray-200 mt-1">
              {user.costBandName ? `${user.costBandName} (Tier ${user.costBandTier})` : 'Not assigned'}
            </dd>
          </div>

          {/* Weekly Hours */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Capacity</dt>
            <dd className="text-sm text-gray-200 mt-1">{user.weeklyCapacityHours ?? 40} hours</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
