'use client';

import type { StepComponentProps } from '@/types/reservation';

/**
 * Step2 Component - Reservation Details
 * Placeholder for reservation details form
 */
export default function Step2({ onNext, onPrevious }: StepComponentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Szczegóły rezerwacji
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Formularz szczegółów rezerwacji będzie tutaj...
          </p>
        </section>
      </div>
    </div>
  );
}

