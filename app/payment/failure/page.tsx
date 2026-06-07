'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams?.get('orderId');
    const trIdParam = searchParams?.get('tr_id');
    const errorParam = searchParams?.get('error');
    setOrderId(orderIdParam ?? null);
    setTransactionId(trIdParam ?? null);
    setError(errorParam ?? null);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Płatność nie powiodła się
          </h1>
          <p className="text-gray-600">
            Wystąpił problem podczas przetwarzania płatności.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <span className="font-semibold">Błąd:</span> {error}
            </p>
          </div>
        )}

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
            Możesz spróbować ponownie lub skontaktować się z nami, jeśli problem będzie się powtarzał.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/profil/aktualne-rezerwacje?payment=failed"
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              Zobacz moje rezerwacje
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-6 py-3 bg-[#03adf0] text-white font-semibold rounded-lg hover:bg-[#0288c7] transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Ładowanie...</div>}>
      <PaymentFailureContent />
    </Suspense>
  );
}