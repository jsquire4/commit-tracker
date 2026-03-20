interface ChessMiniBarProps {
  strategic?: number;
  operational?: number;
  defensive?: number;
  capability?: number;
  className?: string;
}

const segmentColors: Record<string, string> = {
  strategic: 'bg-navy',
  operational: 'bg-muted',
  defensive: 'bg-error',
  capability: 'bg-[#6B8F71]',
};

export function ChessMiniBar({
  strategic = 0,
  operational = 0,
  defensive = 0,
  capability = 0,
  className = '',
}: ChessMiniBarProps) {
  const total = strategic + operational + defensive + capability;
  if (total === 0) return null;

  const segments = [
    { key: 'strategic', value: strategic },
    { key: 'operational', value: operational },
    { key: 'defensive', value: defensive },
    { key: 'capability', value: capability },
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
          style={{ width: `${(seg.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
