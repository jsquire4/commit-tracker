import { useUIStore } from '@/stores/ui.store';
import type { DashboardFilters } from '@/types';
import type { UserRole } from '@/types/enums';
import { DIRECTOR_AND_ABOVE } from '@/constants/roles';

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
  teamMemberOptions?: { id: string; displayName: string }[];
  rcdoOptions?: { id: string; title: string }[];
  role?: UserRole | null;
}

export function DashboardFilters({
  filters,
  onChange,
  teamMemberOptions = [],
  rcdoOptions = [],
  role,
}: DashboardFiltersProps) {
  const resetDashboardFilters = useUIStore((s) => s.resetDashboardFilters);

  function handleReset() {
    resetDashboardFilters();
    // Pass an empty object — the store reset handles clearing all keys
    onChange({});
  }

  function handleMemberChange(value: string) {
    if (value) {
      onChange({ teamMemberId: value });
    } else {
      const partial: Partial<DashboardFilters> = {};
      // Remove the key by omitting it, then the store merge will leave it absent
      onChange(partial);
    }
  }

  function handleRcdoChange(value: string) {
    if (value) {
      onChange({ rcdoId: value });
    } else {
      onChange({});
    }
  }

  function handleWeekChange(value: string) {
    if (value) {
      onChange({ cycleWeekStart: value });
    } else {
      onChange({});
    }
  }

  function handleSubtreeChange(checked: boolean) {
    if (checked) {
      onChange({ includeSubtree: true });
    } else {
      onChange({});
    }
  }

  return (
    <div className="bg-surface-lowest border border-outline-variant rounded-lg p-4 flex flex-wrap gap-4 items-end">
      {/* Team Member select */}
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label htmlFor="filter-member" className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
          Team Member
        </label>
        <select
          id="filter-member"
          className="rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent"
          value={filters.teamMemberId ?? ''}
          onChange={(e) => { handleMemberChange(e.target.value); }}
        >
          <option value="">All members</option>
          {teamMemberOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* RCDO dropdown */}
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label htmlFor="filter-rcdo" className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
          Rally Cry / Objective
        </label>
        <select
          id="filter-rcdo"
          className="rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent"
          value={filters.rcdoId ?? ''}
          onChange={(e) => { handleRcdoChange(e.target.value); }}
        >
          <option value="">All objectives</option>
          {rcdoOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>

      {/* Week selector */}
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label htmlFor="filter-week" className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
          Week Starting
        </label>
        <input
          id="filter-week"
          type="date"
          className="rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent"
          value={filters.cycleWeekStart ?? ''}
          onChange={(e) => { handleWeekChange(e.target.value); }}
        />
      </div>

      {/* Include subtree toggle — Director and above only */}
      {role && DIRECTOR_AND_ABOVE.has(role) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
            Include Subtree
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-outline-variant text-accent focus:ring-accent"
              checked={filters.includeSubtree ?? false}
              onChange={(e) => { handleSubtreeChange(e.target.checked); }}
            />
            <span className="text-sm text-on-surface-variant">Include full org subtree</span>
          </label>
        </div>
      )}

      {/* Reset button */}
      <div className="flex flex-col justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline-variant rounded-md hover:bg-surface-container-high hover:text-on-surface transition-colors duration-[var(--duration-fast)] active:translate-y-px"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
