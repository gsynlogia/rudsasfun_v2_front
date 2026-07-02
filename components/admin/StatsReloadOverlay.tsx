'use client';

import { Loader2 } from 'lucide-react';

/**
 * Widoczny sygnał przeładowania danych statystyk (rozkaz Pana 2026-06-30:
 * „Zastosuj" ma zawsze wyraźnie przeładować — także gdy zakres się nie zmienił
 * i dane wychodzą takie same). Lekkie przyciemnienie + spinner nad sekcją danych.
 *
 * Pure presentational — bez stanu; rodzic steruje przez `visible`. Reużywalny przez
 * obie strony statystyk (DRY). Wymaga rodzica z `position: relative`.
 */
export default function StatsReloadOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="absolute inset-0 z-20 flex items-start justify-center pt-24 bg-white/60 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-md text-[#03adf0] text-sm font-medium">
        <Loader2 className="w-5 h-5 animate-spin" />
        Przeładowywanie…
      </div>
    </div>
  );
}
