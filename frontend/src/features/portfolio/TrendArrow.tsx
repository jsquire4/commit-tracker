/**
 * TrendArrow — SVG arrow (up/down/flat) with color coding.
 */
import type { PortfolioTrend } from '@/types/portfolio.types';

interface TrendArrowProps {
  direction: PortfolioTrend;
  label?: string;
  className?: string;
}

const directionConfig: Record<PortfolioTrend, { path: string; color: string; symbol: string }> = {
  up: {
    path: 'M4 8L8 2L12 8',
    color: 'text-accent',
    symbol: '\u2191',
  },
  down: {
    path: 'M4 2L8 8L12 2',
    color: 'text-error',
    symbol: '\u2193',
  },
  flat: {
    path: 'M2 5H14',
    color: 'text-muted',
    symbol: '\u2192',
  },
};

export function TrendArrow({ direction, label, className = '' }: TrendArrowProps) {
  const config = directionConfig[direction];

  return (
    <span className={`inline-flex items-center gap-1 ${config.color} ${className}`}>
      <svg
        width="12"
        height="10"
        viewBox="0 0 16 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <path d={config.path} />
      </svg>
      {label && <span className="text-[0.8125rem]">{label}</span>}
    </span>
  );
}
