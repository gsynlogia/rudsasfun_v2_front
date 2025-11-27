'use client';

import type { StepComponentProps } from '@/types/reservation';

/**
 * Step3 Component - Invoices
 * Placeholder for invoices form
 */
export default function Step3({ onNext, onPrevious }: StepComponentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Faktury
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Formularz faktur będzie tutaj...
          </p>
        </section>
      </div>
    </div>
  );
}

