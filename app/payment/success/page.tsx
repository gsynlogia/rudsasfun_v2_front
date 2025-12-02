'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAllSessionData } from '@/utils/sessionStorage';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    const trIdParam = searchParams.get('tr_id');
    setOrderId(orderIdParam);
    setTransactionId(trIdParam);
    
    // Clear all session storage data after successful payment
    // This is the ONLY place where we clear session storage
    clearAllSessionData();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Płatność zakończona sukcesem!
          </h1>
          <p className="text-gray-600">
            Twoja płatność została pomyślnie przetworzona.
          </p>
        </div>

        {(orderId || transactionId) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            {orderId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-semibold">Numer zamówienia:</span> {orderId}
              </p>
            )}
            {transactionId && (
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Numer transakcji:</span> {transactionId}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Potwierdzenie płatności zostało wysłane na Twój adres e-mail.
          </p>
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 bg-[#03adf0] text-white font-semibold rounded-lg hover:bg-[#0288c7] transition-colors"
          >
            Powrót do strony głównej
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Ładowanie...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

