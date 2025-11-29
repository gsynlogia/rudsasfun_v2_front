'use client';

import type { StepComponentProps } from '@/types/reservation';

/**
 * Step4 Component - Consents and Regulations
 * Placeholder for consents and regulations form
 */
export default function Step4({ onNext, onPrevious, disabled = false }: StepComponentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
          Zgody i regulaminy
        </h2>
        <section className="bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Formularz zgód i regulaminów będzie tutaj...
          </p>
        </section>
      </div>
    </div>
  );
}

