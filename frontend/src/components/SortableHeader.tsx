type SortDir = 'asc' | 'desc';

interface SortableHeaderProps<T extends string> {
  label: string;
  sortKey: T;
  currentSort: T;
  direction: SortDir;
  onSort: (key: T) => void;
  sticky?: boolean;
}

export function SortableHeader<T extends string>({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
  sticky = false,
}: SortableHeaderProps<T>) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 ${
        sticky ? 'sticky left-0 bg-gray-50 dark:bg-gray-900 z-10' : ''
      }`}
      onClick={() => { onSort(sortKey); }}
      scope="col"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col leading-none" aria-hidden="true">
          <svg
            className={`w-2.5 h-2.5 -mb-0.5 ${isActive && direction === 'asc' ? 'text-blue-600' : 'text-gray-300'}`}
            viewBox="0 0 10 6"
            fill="currentColor"
          >
            <path d="M5 0L10 6H0L5 0Z" />
          </svg>
          <svg
            className={`w-2.5 h-2.5 ${isActive && direction === 'desc' ? 'text-blue-600' : 'text-gray-300'}`}
            viewBox="0 0 10 6"
            fill="currentColor"
          >
            <path d="M5 6L0 0H10L5 6Z" />
          </svg>
        </span>
      </span>
    </th>
  );
}
