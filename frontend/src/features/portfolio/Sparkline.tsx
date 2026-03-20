/**
 * Sparkline — Inline SVG trend chart.
 * ~200px wide, 32px tall. Draws trend line with stroke animation.
 * Color: teal for positive/flat, rose for declining.
 */
import { useRef, useEffect, useState } from 'react';
import type { SparklinePoint } from '@/types/portfolio.types';

interface SparklineProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  /** Force color override; otherwise auto-detected from trend */
  color?: 'teal' | 'rose' | 'amber';
  className?: string;
}

const colorMap = {
  teal: '#036A6A',
  rose: '#9F403D',
  amber: '#C2860B',
};

function detectTrendColor(data: SparklinePoint[]): 'teal' | 'rose' | 'amber' {
  if (data.length < 2) return 'teal';
  const first = data[0]!.value;
  const last = data[data.length - 1]!.value;
  if (last < first - 3) return 'rose';
  if (last > first + 3) return 'teal';
  return 'amber';
}

export function Sparkline({
  data,
  width = 200,
  height = 32,
  color,
  className = '',
}: SparklineProps) {
  const pathRef = useRef<SVGPolylineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [animated, setAnimated] = useState(false);

  const resolvedColor = color ?? detectTrendColor(data);
  const strokeColor = colorMap[resolvedColor];

  // Compute points for the SVG
  if (data.length < 2) return null;

  const padding = 10;
  const drawWidth = width - padding * 2;
  const drawHeight = height - 4;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * drawWidth;
    const y = 2 + drawHeight - ((d.value - min) / range) * drawHeight;
    return `${x},${y}`;
  }).join(' ');

  const lastPoint = data[data.length - 1]!;
  const lastX = padding + ((data.length - 1) / (data.length - 1)) * drawWidth;
  const lastY = 2 + drawHeight - ((lastPoint.value - min) / range) * drawHeight;

  useEffect(() => {
    const path = pathRef.current;
    if (!path || animated) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    // Trigger draw after a brief delay for stagger effect
    const timer = setTimeout(() => {
      path.style.transition = 'stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)';
      path.style.strokeDashoffset = '0';

      // Show endpoint dot after line draws
      setTimeout(() => {
        if (dotRef.current) {
          dotRef.current.style.transition = 'opacity 200ms ease';
          dotRef.current.style.opacity = '1';
        }
      }, 400);

      setAnimated(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [animated]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <polyline
        ref={pathRef}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        ref={dotRef}
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill={strokeColor}
        opacity="0"
      />
    </svg>
  );
}
