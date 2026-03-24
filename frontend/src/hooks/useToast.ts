import { useState, useCallback, useMemo, useRef } from 'react';
import type { ToastData, ToastVariant } from '../components/Toast';
export { ToastContainer } from '../components/Toast';

export function useToast() {
  const toastCounter = useRef(0);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant, duration?: number) => {
    const newToast: ToastData = {
      id: `toast-${++toastCounter.current}-${Date.now()}`,
      message,
      variant,
      duration: duration ?? 4000,
    };
    setToasts((prev) => {
      const next = [...prev, newToast];
      return next.length > 3 ? next.slice(-3) : next;
    });
    // Stable callback — dismiss is a setState function (stable identity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return { toast, toasts, dismiss };
}
