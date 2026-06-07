'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import Toast, { Toast as ToastType } from './Toast';

interface ToastOptions {
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType['type'], options?: ToastOptions | number) => void;
  showSuccess: (message: string, options?: ToastOptions | number) => void;
  showWarning: (message: string, options?: ToastOptions | number) => void;
  showError: (message: string, options?: ToastOptions | number) => void;
  showInfo: (message: string, options?: ToastOptions | number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType['type'], options?: ToastOptions | number) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Obsługa starego API (duration jako number) i nowego (options object)
      const opts: ToastOptions = typeof options === 'number'
        ? { duration: options }
        : options || {};

      const newToast: ToastType = {
        id,
        title: opts.title,
        message,
        type,
        duration: opts.duration ?? 8000, // 8 sekund
      };

      setToasts((prev) => [...prev, newToast]);
    },
    [],
  );

  const showSuccess = useCallback(
    (message: string, options?: ToastOptions | number) => {
      showToast(message, 'success', options);
    },
    [showToast],
  );

  const showWarning = useCallback(
    (message: string, options?: ToastOptions | number) => {
      showToast(message, 'warning', options);
    },
    [showToast],
  );

  const showError = useCallback(
    (message: string, options?: ToastOptions | number) => {
      showToast(message, 'error', options);
    },
    [showToast],
  );

  const showInfo = useCallback(
    (message: string, options?: ToastOptions | number) => {
      // Info (niebieski) - dłuższy czas dla filtrów/wyszukiwania (15 sekund)
      const opts: ToastOptions = typeof options === 'number'
        ? { duration: options }
        : options || {};
      if (!opts.duration) {
        opts.duration = 15000; // 15 sekund dla info
      }
      showToast(message, 'info', opts);
    },
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showWarning, showError, showInfo }}>
      {children}
      {/* Toast Container - Fixed position at bottom center */}
      {toasts.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl px-4 space-y-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}