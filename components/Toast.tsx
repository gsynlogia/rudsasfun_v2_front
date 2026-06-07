'use client';

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const startTime = Date.now();
      const duration = toast.duration;

      // Update progress bar every 50ms
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 50);

      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [toast.id, toast.duration, onClose]);

  // Nowy styl - pełne kolorowe tło, biały tekst (jak na załączniku)
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-600',
          progressBg: 'bg-green-800',
          text: 'text-white',
          iconBg: 'bg-white/20',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          progressBg: 'bg-yellow-700',
          text: 'text-white',
          iconBg: 'bg-white/20',
        };
      case 'error':
        return {
          bg: 'bg-rose-500',
          progressBg: 'bg-rose-700',
          text: 'text-white',
          iconBg: 'bg-white/20',
        };
      case 'info':
        return {
          bg: 'bg-blue-500',
          progressBg: 'bg-blue-700',
          text: 'text-white',
          iconBg: 'bg-white/20',
        };
      default:
        return {
          bg: 'bg-gray-600',
          progressBg: 'bg-gray-800',
          text: 'text-white',
          iconBg: 'bg-white/20',
        };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-8 h-8" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8" />;
      case 'error':
        return <AlertCircle className="w-8 h-8" />;
      case 'info':
        return <Info className="w-8 h-8" />;
      default:
        return <Info className="w-8 h-8" />;
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`${styles.bg} rounded-2xl shadow-2xl overflow-hidden mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300`}
    >
      <div className="px-8 py-6 flex items-center gap-5">
        <div className={`${styles.iconBg} ${styles.text} rounded-full p-3 flex-shrink-0`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className={`${styles.text} font-bold text-xl`}>
              {toast.title}
            </div>
          )}
          <div className={`${styles.text} text-lg ${toast.title ? 'opacity-90 mt-1' : 'font-semibold'}`}>
            {toast.message}
          </div>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0 p-2`}
          aria-label="Zamknij"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      {/* Progress bar - ciemniejszy pasek na dole pokazujący czas do zniknięcia */}
      {toast.duration && toast.duration > 0 && (
        <div className={`h-1.5 ${styles.progressBg}`} style={{ width: `${progress}%` }} />
      )}
    </div>
  );
}