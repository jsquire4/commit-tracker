import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { ProfileTab } from './ProfileTab';
import { AdminTab } from './AdminTab';
import { OrganizationsTab } from './OrganizationsTab';
import { MANAGER_AND_ABOVE, VP_AND_ABOVE } from '@/constants/roles';

type TabId = 'profile' | 'admin' | 'organizations';

export function SettingsPage() {
  const { role } = useAuth();
  const canAdmin = role != null && MANAGER_AND_ABOVE.has(role);
  const canOrgs = role != null && VP_AND_ABOVE.has(role);

  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    ...(canAdmin ? [{ id: 'admin' as const, label: 'Admin' }] : []),
    ...(canOrgs ? [{ id: 'organizations' as const, label: 'Organizations' }] : []),
  ];

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Settings" />

        {/* Tab bar — underline active indicator in teal */}
        <div className="flex items-center gap-0 border-b border-outline-variant mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); }}
              className={[
                'px-5 py-3 text-body font-medium border-b-2 -mb-px',
                'transition-colors duration-[150ms] ease-[var(--ease-standard)]',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-on-surface-variant',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content with cross-fade */}
        <div className="animate-fade-in">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'admin' && canAdmin && <AdminTab />}
          {activeTab === 'organizations' && canOrgs && <OrganizationsTab />}
        </div>
      </div>
    </div>
  );
}
