'use client';

/**
 * Modal potwierdzenia usunięcia taboru (Nr 29) — DeleteTaborModal z makiety.
 * Ostrzeżenie: operacja nieodwracalna, wszyscy przypisani uczestnicy zostaną usunięci z taboru.
 */
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  taborLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteTaborModal({ taborLabel, onConfirm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="delete-tabor-modal">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-red-700">
            <AlertTriangle className="h-5 w-5" /> Usuń tabor
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-gray-700">
          Czy na pewno usunąć tabor <span className="font-semibold">{taborLabel}</span>?
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Operacja jest nieodwracalna — wszyscy przypisani uczestnicy zostaną usunięci z tego taboru.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Anuluj</button>
          <button type="button" onClick={onConfirm} data-testid="delete-tabor-confirm"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">Usuń tabor</button>
        </div>
      </div>
    </div>
  );
}
