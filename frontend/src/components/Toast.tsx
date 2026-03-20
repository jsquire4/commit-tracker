import { useEffect, useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-accent',
  error: 'border-l-error',
  warning: 'border-l-warning',
  info: 'border-l-navy',
};

const progressColors: Record<ToastVariant, string> = {
  success: 'bg-accent',
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-navy',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [entering, setEntering] = useState(true);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Trigger entrance
    const enterTimer = setTimeout(() => setEntering(false), 20);

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setExiting(true);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-sm bg-surface-lowest shadow-whisper border-l-4
        ${variantStyles[toast.variant]}
        transition-all
        ${entering ? 'opacity-0 -translate-y-3' : exiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
      `}
      style={{
        transitionDuration: exiting ? 'var(--duration-standard, 200ms)' : 'var(--duration-entrance, 300ms)',
        transitionTimingFunction: exiting
          ? 'cubic-bezier(0.4, 0, 1, 1)'
          : 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      role="alert"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-body text-on-surface">{toast.message}</p>
        <button
          onClick={handleDismiss}
          className="ml-4 text-muted hover:text-on-surface transition-colors duration-[150ms] flex-shrink-0"
          aria-label={`Dismiss: ${toast.message}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface-container">
        <div
          className={`h-full ${progressColors[toast.variant]}`}
          style={{
            animation: `shrinkProgress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  // Only show max 3
  const visible = toasts.slice(-3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] flex flex-col gap-2">
      {visible.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
