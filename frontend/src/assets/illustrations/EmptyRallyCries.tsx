interface Props {
  className?: string;
}

export function EmptyRallyCries({ className = '' }: Props) {
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
      {/* Root node */}
      <circle cx="60" cy="20" r="8" />
      {/* Connecting lines to level 2 */}
      <line x1="54" y1="27" x2="36" y2="48" />
      <line x1="60" y1="28" x2="60" y2="48" />
      <line x1="66" y1="27" x2="84" y2="48" />
      {/* Level 2 nodes */}
      <circle cx="36" cy="54" r="6" />
      <circle cx="60" cy="54" r="6" />
      <circle cx="84" cy="54" r="6" />
      {/* Connecting lines to level 3 */}
      <line x1="32" y1="59" x2="24" y2="78" />
      <line x1="40" y1="59" x2="48" y2="78" />
      <line x1="60" y1="60" x2="60" y2="78" />
      <line x1="80" y1="59" x2="72" y2="78" />
      <line x1="88" y1="59" x2="96" y2="78" />
      {/* Level 3 nodes */}
      <circle cx="24" cy="84" r="5" />
      <circle cx="48" cy="84" r="5" />
      <circle cx="60" cy="84" r="5" />
      <circle cx="72" cy="84" r="5" />
      <circle cx="96" cy="84" r="5" />
      {/* Dashed line to show "add more" */}
      <line x1="60" y1="89" x2="60" y2="104" strokeDasharray="3 3" />
      <circle cx="60" cy="108" r="4" strokeDasharray="3 3" />
    </svg>
  );
}
