import { type ReactNode, useCallback, useId, useRef, useState } from 'react';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  children: ReactNode;
}

const positionClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-on-surface border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-on-surface border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-on-surface border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-on-surface border-y-transparent border-l-transparent',
};

const arrowSize = 'border-4';

export default function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    showTimeout.current = setTimeout(() => setVisible(true), 200);
  }, []);

  const handleLeave = useCallback(() => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
    hideTimeout.current = setTimeout(() => setVisible(false), 100);
  }, []);

  return (
    <span
      className="relative inline-flex"
      tabIndex={0}
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}

      {visible && (
        <span
          id={tooltipId}
          className={[
            'absolute z-50 whitespace-nowrap',
            'bg-on-surface text-white text-small px-2.5 py-1.5 rounded-sm shadow-whisper',
            'animate-[tooltipIn_150ms_ease-out_forwards]',
            'pointer-events-none',
            positionClasses[side],
          ].join(' ')}
          role="tooltip"
        >
          {content}
          <span
            className={[
              'absolute w-0 h-0',
              arrowSize,
              arrowClasses[side],
            ].join(' ')}
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
