'use client';

import { ArrowLeft, RotateCcw, Trash2, User } from 'lucide-react';

import { formatDateTime } from '../formatters';
import type { ReservationDetails } from '../types';

export interface ReservationDetailHeaderProps {
  reservation: ReservationDetails;
  reservationNumber: string;
  onBack: () => void;
  onRestore: () => void;
  onViewClient: () => void;
  onDeleteClick: () => void;
  restoringReservation: boolean;
}

export function ReservationDetailHeader({
  reservation,
  reservationNumber,
  onBack,
  onRestore,
  onViewClient,
  onDeleteClick,
  restoringReservation,
}: ReservationDetailHeaderProps) {
  return (
    <>
      <div className="bg-slate-800 shadow-md p-3 sticky top-0 z-20 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 rounded"
              style={{ borderRadius: 0, cursor: 'pointer' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Szczegóły rezerwacji: {reservationNumber}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Status: <span className="font-medium text-slate-300">{reservation.status || 'Brak danych'}</span> |
                Utworzona: {formatDateTime(reservation.created_at || null)} |
                Zaktualizowana: {formatDateTime(reservation.updated_at || null)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {reservation.is_archived ? (
              <button
                onClick={onRestore}
                disabled={restoringReservation}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                {restoringReservation ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Przywracanie...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Przywróć rezerwację</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onViewClient}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                <User className="w-3.5 h-3.5" />
                <span>Zobacz profil klienta</span>
              </button>
            )}
            {!reservation.is_archived && (
              <button
                onClick={onDeleteClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usuń rezerwację</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {reservation.is_archived && (
        <div className="mx-4 mt-4">
          <div className="rounded-xl bg-red-50 p-4 sm:p-5 shadow-sm ring-1 ring-red-100/80">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-red-800 font-semibold text-base sm:text-lg">Rezerwacja zarchiwizowana</h3>
                <p className="text-red-700/90 text-sm mt-1">
                  Ta rezerwacja została zarchiwizowana{reservation.archived_at ? ` dnia ${new Date(reservation.archived_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}.
                  Dane są tylko do odczytu. Edycja i usuwanie są niedostępne.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}