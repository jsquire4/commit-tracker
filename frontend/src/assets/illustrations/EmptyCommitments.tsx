interface Props {
  className?: string;
}

export function EmptyCommitments({ className = '' }: Props) {
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
      {/* Clipboard body */}
      <rect x="30" y="24" width="60" height="76" rx="4" />
      {/* Clipboard clip */}
      <path d="M48 24v-4a8 8 0 0 1 8-8h8a8 8 0 0 1 8 8v4" />
      {/* Checklist line 1 - checked */}
      <rect x="40" y="40" width="10" height="10" rx="2" />
      <path d="M42 45.5l2.5 2.5 4-4" />
      <line x1="56" y1="45" x2="80" y2="45" />
      {/* Checklist line 2 - checked */}
      <rect x="40" y="58" width="10" height="10" rx="2" />
      <path d="M42 63.5l2.5 2.5 4-4" />
      <line x1="56" y1="63" x2="74" y2="63" />
      {/* Checklist line 3 - unchecked */}
      <rect x="40" y="76" width="10" height="10" rx="2" />
      <line x1="56" y1="81" x2="70" y2="81" />
    </svg>
  );
}
