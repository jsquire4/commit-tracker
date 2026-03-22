import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMe, useUserList, useCreateOrg } from '@/hooks/useUsers';
import { CreateOrgModal } from './CreateOrgModal';
import Button from '@/components/Button';

/**
 * Organizations tab for Settings page.
 * Shows current org (with teal accent + "Current" badge),
 * portfolio org list, and create-org button.
 *
 * Note: Multi-org listing/switching requires a portfolio endpoint
 * that may not yet exist. For now we display the current org from
 * the auth context and allow org creation.
 */
export function OrganizationsTab() {
  const { orgId, orgName } = useAuth();
  const { data: me } = useMe();
  const { data: users } = useUserList();
  const createOrgMutation = useCreateOrg();

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const userCount = users?.filter((u) => u.isActive).length ?? 0;

  async function handleCreateOrg(name: string, timezone: string) {
    try {
      await createOrgMutation.mutateAsync({ name, timezone });
      setCreateModalOpen(false);
    } catch {
      // error shown in modal
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Current Organization Card */}
      <div className="bg-surface-lowest rounded-sm p-6 border-l-[3px] border-l-accent mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-[1.125rem] font-normal text-on-surface">
            {orgName ?? (me?.displayName ? `${me.displayName}'s Organization` : 'Current Organization')}
          </h3>
          <span
            className="text-[0.6875rem] font-medium uppercase tracking-[0.04em]
              text-accent bg-accent/[0.08] px-2 py-0.5 rounded-sm"
          >
            Current
          </span>
        </div>
        <div className="flex gap-6 text-[0.8125rem] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.6875rem] uppercase tracking-[0.04em] text-muted">
              Users
            </span>
            {userCount}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.6875rem] uppercase tracking-[0.04em] text-muted">
              Org ID
            </span>
            <span className="font-mono text-[0.75rem]">{orgId.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Create Organization button */}
      <div className="mb-8">
        <Button
          variant="dashed"
          onClick={() => { setCreateModalOpen(true); }}
        >
          + Create Organization
        </Button>
      </div>

      {/* Portfolio Organizations section — placeholder for when multi-org endpoint exists */}
      <div className="text-[0.75rem] font-medium uppercase tracking-[0.05rem] text-muted mb-4">
        Portfolio Organizations
      </div>
      <div className="text-body text-on-surface-variant py-8 text-center">
        Portfolio organization management will be available once multi-org switching is enabled.
      </div>

      {/* Create Org Modal */}
      <CreateOrgModal
        open={createModalOpen}
        isPending={createOrgMutation.isPending}
        error={
          createOrgMutation.isError
            ? (createOrgMutation.error instanceof Error
              ? createOrgMutation.error.message
              : 'Failed to create organization')
            : null
        }
        onSave={(name, timezone) => { void handleCreateOrg(name, timezone); }}
        onClose={() => { setCreateModalOpen(false); }}
      />
    </div>
  );
}
