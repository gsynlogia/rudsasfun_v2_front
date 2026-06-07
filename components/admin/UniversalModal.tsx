'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

export interface UniversalModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'screen';
  showCloseButton?: boolean;
  className?: string;
  closeOnOverlayClick?: boolean;  // Allow closing by clicking overlay (default: true)
  closeOnEscape?: boolean;  // Allow closing by pressing Escape (default: true)
}

/**
 * Universal Modal Component
 * Reusable modal component with consistent styling matching DeleteConfirmationModal
 *
 * @param isOpen - Whether the modal is visible
 * @param title - Modal title
 * @param onClose - Callback when modal should be closed
 * @param children - Modal content
 * @param maxWidth - Maximum width of the modal (sm, md, lg, xl, 2xl, full)
 * @param showCloseButton - Whether to show close button (default: true)
 * @param className - Additional CSS classes for the modal content
 */
export default function UniversalModal({
  isOpen,
  title,
  onClose,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  className = '',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: UniversalModalProps) {
  // Handle Escape key - must be before early return
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
    screen: 'max-w-[calc(100vw-2rem)]',
  };

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fadeIn"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        <div
          className={`bg-white shadow-2xl ${maxWidthClasses[maxWidth]} w-full ${className} animate-scaleIn`}
          style={{ borderRadius: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                style={{ cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Modal Content */}
          {children}
        </div>
      </div>

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}