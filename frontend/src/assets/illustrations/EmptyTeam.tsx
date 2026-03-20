interface Props {
  className?: string;
}

export function EmptyTeam({ className = '' }: Props) {
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
      {/* Center person - head */}
      <circle cx="60" cy="32" r="10" />
      {/* Center person - body */}
      <path d="M40 70a20 20 0 0 1 40 0" />
      {/* Left person - head */}
      <circle cx="24" cy="52" r="8" />
      {/* Left person - body */}
      <path d="M10 82a14 14 0 0 1 28 0" />
      {/* Right person - head */}
      <circle cx="96" cy="52" r="8" />
      {/* Right person - body */}
      <path d="M82 82a14 14 0 0 1 28 0" />
      {/* Connection lines */}
      <line x1="42" y1="62" x2="32" y2="58" strokeDasharray="3 3" />
      <line x1="78" y1="62" x2="88" y2="58" strokeDasharray="3 3" />
      {/* Plus indicator */}
      <line x1="60" y1="90" x2="60" y2="106" />
      <line x1="52" y1="98" x2="68" y2="98" />
    </svg>
  );
}
