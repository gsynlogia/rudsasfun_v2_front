'use client';

/**
 * Modal „Tabor jest za mały" (Nr 29) — TaborOverflowModal z makiety (U9).
 * Pokazuje wymagane vs dostępne miejsca. Sugestia: zwiększ liczbę miejsc lub zaznacz mniej osób.
 */
import { AlertCircle, X } from 'lucide-react';

interface Props {
  capacity?: number;
  occupied?: number;
  onClose: () => void;
}

export default function TaborOverflowModal({ capacity, occupied, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="overflow-modal">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-orange-600">
            <AlertCircle className="h-5 w-5" /> Tabor jest za mały
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-gray-700">
          Tabor nie ma wolnych miejsc dla wszystkich wybranych uczestników.
        </p>
        {capacity != null && occupied != null && (
          <div className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-800">
            Miejsca dla uczestników: <span className="font-semibold">{capacity}</span> ·
            Zajęte: <span className="font-semibold">{occupied}</span> ·
            Wolne: <span className="font-semibold">{Math.max(0, capacity - occupied)}</span>
          </div>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Zwiększ liczbę miejsc taboru (Edytuj) albo zaznacz mniej osób / dodaj kolejny tabor.
        </p>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white">
            Rozumiem
          </button>
        </div>
      </div>
    </div>
  );
}
