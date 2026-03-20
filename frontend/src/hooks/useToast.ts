import { useState, useCallback, useMemo } from 'react';
import type { ToastData, ToastVariant } from '../components/Toast';
import { ToastContainer } from '../components/Toast';

let toastCounter = 0;

function createToast(message: string, variant: ToastVariant, duration = 4000): ToastData {
  return {
    id: `toast-${++toastCounter}-${Date.now()}`,
    message,
    variant,
    duration,
  };
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant, duration?: number) => {
    const newToast = createToast(message, variant, duration);
    setToasts((prev) => {
      // Keep max 3 + incoming, prune oldest
      const next = [...prev, newToast];
      return next.length > 5 ? next.slice(-5) : next;
    });
  }, []);

  const toast = useMemo(
    () => ({
      success: (msg: string, duration?: number) => addToast(msg, 'success', duration),
      error: (msg: string, duration?: number) => addToast(msg, 'error', duration),
      warning: (msg: string, duration?: number) => addToast(msg, 'warning', duration),
      info: (msg: string, duration?: number) => addToast(msg, 'info', duration),
    }),
    [addToast]
  );

  const ToastContainerComponent = useCallback(
    () => ToastContainer({ toasts, onDismiss: dismiss }),
    [toasts, dismiss]
  );

  return { toast, ToastContainer: ToastContainerComponent };
}
