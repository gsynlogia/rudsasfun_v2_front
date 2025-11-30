'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error Boundary for Camp Edition Page
 * Displayed when an error occurs while fetching or rendering camp data
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Camp edition page error:', error);
  }, [error]);

  const getErrorMessage = () => {
    const message = error.message || 'Wystąpił nieoczekiwany błąd';
    
    if (message.includes('not found') || message.includes('nie istnieje')) {
      return 'Nie znaleziono obozu lub edycji. Sprawdź, czy adres URL jest poprawny.';
    }
    if (message.includes('timeout') || message.includes('timeout')) {
      return 'Przekroczono czas oczekiwania. Sprawdź połączenie z internetem i spróbuj ponownie.';
    }
    if (message.includes('Server error') || message.includes('500')) {
      return 'Błąd serwera. Spróbuj ponownie za chwilę.';
    }
    if (message.includes('Invalid') || message.includes('Invalid')) {
      return 'Nieprawidłowe dane. Sprawdź, czy adres URL jest poprawny.';
    }
    
    return message;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto px-4 py-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Wystąpił błąd
        </h1>
        
        <p className="text-lg text-gray-600 mb-2">
          {getErrorMessage()}
        </p>
        
        {error.digest && (
          <p className="text-xs text-gray-400 mb-8">
            Kod błędu: {error.digest}
          </p>
        )}
        
        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full bg-[#03adf0] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0288c7] transition-colors"
          >
            Spróbuj ponownie
          </button>
          
          <Link
            href="/"
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Powrót do strony głównej
          </Link>
        </div>
      </div>
    </div>
  );
}


