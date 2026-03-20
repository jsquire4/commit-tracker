interface Props {
  className?: string;
}

export function EmptyReconciliation({ className = '' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Scale pillar */}
      <line x1="60" y1="16" x2="60" y2="100" />
      {/* Base */}
      <line x1="40" y1="100" x2="80" y2="100" />
      <line x1="46" y1="106" x2="74" y2="106" />
      {/* Beam - slightly tilted to show imbalance */}
      <line x1="22" y1="40" x2="98" y2="36" />
      {/* Beam pivot */}
      <polygon points="56,24 64,24 60,16" strokeLinejoin="round" />
      {/* Left pan chains */}
      <line x1="22" y1="40" x2="16" y2="60" />
      <line x1="22" y1="40" x2="28" y2="60" />
      {/* Left pan */}
      <path d="M10 60 Q 22 72 34 60" />
      {/* Right pan chains */}
      <line x1="98" y1="36" x2="92" y2="56" />
      <line x1="98" y1="36" x2="104" y2="56" />
      {/* Right pan */}
      <path d="M86 56 Q 98 68 110 56" />
      {/* Items in left pan (heavier) */}
      <rect x="16" y="54" width="6" height="5" rx="1" />
      <rect x="23" y="54" width="6" height="5" rx="1" />
      {/* Item in right pan (lighter) */}
      <rect x="95" y="50" width="6" height="5" rx="1" />
    </svg>
  );
}
