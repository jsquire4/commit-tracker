import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProfileTab } from './ProfileTab';
import { AdminTab } from './AdminTab';
import type { UserRole } from '@/types';

const ADMIN_ROLES: UserRole[] = ['MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE'];

export function SettingsPage() {
  const { role } = useAuth();
  const canAdmin = role != null && ADMIN_ROLES.includes(role);

  const [activeTab, setActiveTab] = useState<'profile' | 'admin'>('profile');

  const tabs = [
    { id: 'profile' as const, label: 'Profile' },
    ...(canAdmin ? [{ id: 'admin' as const, label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-6">Settings</h1>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-800 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); }}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'admin' && canAdmin && <AdminTab />}
      </div>
    </div>
  );
}
