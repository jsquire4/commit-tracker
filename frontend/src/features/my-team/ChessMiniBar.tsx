interface ChessMiniBarProps {
  strategic?: number;
  operational?: number;
  defensive?: number;
  capability?: number;
  /** Total commitment count including uncategorized. When provided, used as the
   *  denominator so uncategorized items don't inflate category percentages. */
  total?: number;
  className?: string;
}

const segmentColors: Record<string, string> = {
  strategic: 'bg-navy',
  operational: 'bg-muted',
  defensive: 'bg-error',
  capability: 'bg-[#6B8F71]',
  other: 'bg-surface-container-high',
};

export function ChessMiniBar({
  strategic = 0,
  operational = 0,
  defensive = 0,
  capability = 0,
  total,
  className = '',
}: ChessMiniBarProps) {
  const categorized = strategic + operational + defensive + capability;
  const denominator = total !== undefined && total > categorized ? total : categorized;
  if (denominator === 0) return null;

  const uncategorized = denominator - categorized;

  const segments = [
    { key: 'strategic', value: strategic },
    { key: 'operational', value: operational },
    { key: 'defensive', value: defensive },
    { key: 'capability', value: capability },
    { key: 'other', value: uncategorized },
  ].filter((s) => s.value > 0);

  return (
    <div
      className={`flex h-1.5 rounded-full overflow-hidden w-20 flex-shrink-0 ${className}`}
      aria-label="CHESS distribution"
    >
      {segments.map((seg) => (
        <div
          key={seg.key}
          className={segmentColors[seg.key]}
          style={{ width: `${(seg.value / denominator) * 100}%` }}
        />
      ))}
    </div>
  );
}
