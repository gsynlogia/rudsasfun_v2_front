'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'text-green-600',
          iconBg: 'bg-green-100',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'text-gray-600',
          iconBg: 'bg-gray-100',
        };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-lg p-4 mb-3 flex items-start gap-3 animate-in slide-in-from-top-5 fade-in duration-300`}
    >
      <div className={`${styles.iconBg} ${styles.icon} rounded-full p-1 flex-shrink-0`}>
        {getIcon()}
      </div>
      <div className={`flex-1 ${styles.text} text-sm font-medium`}>
        {toast.message}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Zamknij"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

