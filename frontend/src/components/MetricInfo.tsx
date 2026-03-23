import Tooltip from './Tooltip';

interface MetricInfoProps {
  formula: string;
}

/**
 * Small (i) icon that shows a metric's formula/explanation on hover.
 */
export function MetricInfo({ formula }: MetricInfoProps) {
  return (
    <Tooltip
      content={<span className="text-xs max-w-[240px] block whitespace-normal">{formula}</span>}
      side="top"
    >
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted hover:text-on-surface-variant hover:bg-surface-container transition-colors"
        aria-label="How is this calculated?"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>
    </Tooltip>
  );
}
