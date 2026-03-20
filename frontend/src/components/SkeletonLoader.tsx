interface SkeletonLoaderProps {
  variant?: 'line' | 'card' | 'metric' | 'table-row';
  count?: number;
  className?: string;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-4 rounded-sm bg-surface-container animate-shimmer ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--color-surface-container) 0%, var(--color-surface-container-high) 50%, var(--color-surface-container) 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-sm bg-surface-lowest p-5 space-y-3">
      <SkeletonLine className="w-2/5 h-5" />
      <SkeletonLine className="w-4/5" />
      <SkeletonLine className="w-3/5" />
    </div>
  );
}

function SkeletonMetric() {
  return (
    <div className="rounded-sm bg-surface-lowest p-4 space-y-2 w-32">
      <SkeletonLine className="w-3/5 h-3" />
      <SkeletonLine className="w-4/5 h-7" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      <SkeletonLine className="w-8 h-4" />
      <SkeletonLine className="flex-1 h-4" />
      <SkeletonLine className="w-20 h-4" />
      <SkeletonLine className="w-16 h-4" />
    </div>
  );
}

const variantMap = {
  line: SkeletonLine,
  card: SkeletonCard,
  metric: SkeletonMetric,
  'table-row': SkeletonTableRow,
};

export function SkeletonLoader({
  variant = 'line',
  count = 1,
  className = '',
}: SkeletonLoaderProps) {
  const Component = variantMap[variant];

  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <Component />
        </div>
      ))}
    </div>
  );
}
