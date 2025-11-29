'use client';

import type { StepComponentProps } from '@/types/reservation';

/**
 * Step5 Component - Summary
 * Placeholder for summary view
 */
export default function Step5({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Podsumowanie
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Podsumowanie rezerwacji będzie tutaj...
          </p>
        </section>
      </div>
    </div>
  );
}

