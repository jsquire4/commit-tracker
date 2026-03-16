import { useUIStore } from '@/stores/ui.store';
import type { DashboardFilters } from '@/types';

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onChange: (f: Partial<DashboardFilters>) => void;
  teamMemberOptions?: { id: string; displayName: string }[];
  rcdoOptions?: { id: string; title: string }[];
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'DEFENSIVE', label: 'Defensive' },
  { value: 'CAPABILITY_BUILDING', label: 'Capability Building' },
];

/** Build a Partial<DashboardFilters> that strips undefined keys entirely
 *  to satisfy exactOptionalPropertyTypes. */
function filtersWithout<K extends keyof DashboardFilters>(...keys: K[]): Partial<DashboardFilters> {
  const partial: Partial<DashboardFilters> = {};
  void keys; // keys just indicate what NOT to include — we return an empty object
  return partial;
}

export function DashboardFilters({
  filters,
  onChange,
  teamMemberOptions = [],
  rcdoOptions = [],
}: DashboardFiltersProps) {
  const resetDashboardFilters = useUIStore((s) => s.resetDashboardFilters);

  function handleReset() {
    resetDashboardFilters();
    // Pass an empty object — the store reset handles clearing all keys
    onChange(filtersWithout('cycleWeekStart', 'teamMemberId', 'rcdoId', 'includeSubtree'));
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

  function handleCategoryToggle(catValue: string) {
    if (filters.rcdoId === catValue) {
      onChange({});
    } else {
      onChange({ rcdoId: catValue });
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4 items-end">
      {/* Team Member select */}
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label htmlFor="filter-member" className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Team Member
        </label>
        <select
          id="filter-member"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.teamMemberId ?? ''}
          onChange={(e) => handleMemberChange(e.target.value)}
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
        <label htmlFor="filter-rcdo" className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Rally Cry / Objective
        </label>
        <select
          id="filter-rcdo"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.rcdoId ?? ''}
          onChange={(e) => handleRcdoChange(e.target.value)}
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
        <label htmlFor="filter-week" className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Week Starting
        </label>
        <input
          id="filter-week"
          type="date"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.cycleWeekStart ?? ''}
          onChange={(e) => handleWeekChange(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                filters.rcdoId === cat.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => handleCategoryToggle(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Include subtree toggle */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Include Subtree
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={filters.includeSubtree ?? false}
            onChange={(e) => handleSubtreeChange(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Include org subtree</span>
        </label>
      </div>

      {/* Reset button */}
      <div className="flex flex-col justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
