'use client';

import { useState, useEffect } from 'react';

import { QualificationCardEditPanel } from '@/components/admin/QualificationCardEditPanel';
import type { SignedQualificationPayload } from '@/lib/qualificationReservationMapping';
import { qualificationCardService } from '@/lib/services/QualificationCardService';
import { authenticatedApiCall } from '@/utils/api-auth';

import type { ReservationDetailsWithNumber } from '../types';

export interface QualificationCardEditPanelLoaderProps {
  reservation: ReservationDetailsWithNumber;
  reservationNumber: string;
  signedPayload: SignedQualificationPayload | null;
  refetchReservation: () => Promise<void>;
  closeRightPanel: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

/** Otwiera panel od razu; wewnątrz ładuje dane karty (eliminuje opóźnienie przy „Edytuj kartę”). */
export function QualificationCardEditPanelLoader({
  reservation,
  reservationNumber,
  signedPayload,
  refetchReservation,
  closeRightPanel,
  showSuccess,
  showError: _showError,
}: QualificationCardEditPanelLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [formSnapshot, setFormSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    qualificationCardService
      .getQualificationCardData(reservation.id)
      .then((data) => {
        setFormSnapshot(data.form_snapshot ?? null);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Nie udało się załadować danych karty.'))
      .finally(() => setLoading(false));
  }, [reservation.id]);

  if (loading) {
    return (
      <div className="flex flex-col h-full animate-pulse">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3 mb-3 flex-shrink-0">
          <div className="flex flex-wrap gap-2 min-w-0">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 bg-gray-200 rounded-none w-20" />
            <div className="h-8 bg-gray-300 rounded-none w-24" />
          </div>
        </div>
        <div className="flex-1 overflow-auto min-h-0 space-y-6 pb-4">
          <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
            <div className="h-4 bg-gray-300 rounded w-24 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><div className="h-3 bg-gray-200 rounded w-32 mb-2" /><div className="h-9 bg-gray-200 rounded-none w-full" /></div>
              <div><div className="h-3 bg-gray-200 rounded w-44 mb-2" /><div className="h-9 bg-gray-200 rounded-none w-full" /></div>
              <div className="sm:col-span-2"><div className="h-3 bg-gray-200 rounded w-40 mb-2" /><div className="h-9 bg-gray-200 rounded-none w-full" /></div>
              <div className="sm:col-span-2 flex gap-2"><div className="h-4 bg-gray-200 rounded w-4" /><div className="h-4 bg-gray-200 rounded w-48" /></div>
            </div>
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
                <div className="h-4 bg-gray-300 rounded w-28 mb-3" />
                <div className="space-y-3">
                  <div><div className="h-3 bg-gray-200 rounded w-24 mb-2" /><div className="h-9 bg-gray-200 rounded-none w-full" /></div>
                  <div><div className="h-3 bg-gray-200 rounded w-16 mb-2" /><div className="h-9 bg-gray-200 rounded-none w-full" /></div>
                  <div><div className="h-3 bg-gray-200 rounded w-14 mb-2" /><div className="h-9 bg-gray-200 rounded-none w-full" /></div>
                </div>
              </section>
              <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
                <div className="h-4 bg-gray-300 rounded w-40 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-16 bg-gray-200 rounded-none w-full" />
              </section>
              <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
                <div className="h-4 bg-gray-300 rounded w-56 mb-3" />
                <div className="h-12 bg-gray-200 rounded-none w-full mb-3" />
                <div className="h-4 bg-gray-200 rounded w-4 inline-block mr-2" /><div className="h-4 bg-gray-200 rounded w-40 inline-block" />
              </section>
            </div>
            <div className="space-y-4">
              <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
                <div className="h-4 bg-gray-300 rounded w-24 mb-3" />
                <div className="space-y-3">
                  <div><div className="h-3 bg-gray-200 rounded w-32 mb-2" /><div className="flex gap-2 flex-wrap"><div className="h-7 bg-gray-200 rounded w-20" /><div className="h-7 bg-gray-200 rounded w-16" /><div className="h-8 bg-gray-200 rounded-none flex-1 min-w-[80px]" /></div></div>
                  <div><div className="h-3 bg-gray-200 rounded w-20 mb-2" /><div className="flex gap-2 flex-wrap"><div className="h-8 bg-gray-200 rounded-none flex-1 min-w-[80px]" /></div></div>
                  <div><div className="h-3 bg-gray-200 rounded w-36 mb-2" /><div className="h-14 bg-gray-200 rounded-none w-full" /></div>
                </div>
              </section>
              <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
                <div className="h-4 bg-gray-300 rounded w-24 mb-3" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><div className="h-4 bg-gray-200 rounded w-4" /><div className="h-4 bg-gray-200 rounded w-40" /></div>
                  <div className="flex items-center gap-2"><div className="h-4 bg-gray-200 rounded w-4" /><div className="h-4 bg-gray-200 rounded w-16" /></div>
                  <div className="flex items-center gap-2"><div className="h-4 bg-gray-200 rounded w-4" /><div className="h-4 bg-gray-200 rounded w-14" /></div>
                  <div className="flex items-center gap-2"><div className="h-4 bg-gray-200 rounded w-4" /><div className="h-4 bg-gray-200 rounded w-10" /></div>
                </div>
              </section>
            </div>
          </div>
          <section className="border border-gray-200 rounded-none p-4 bg-gray-50/50">
            <div className="h-4 bg-gray-300 rounded w-40 mb-3" />
            <div className="border border-gray-200 rounded-none p-3 mb-3 bg-white">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 bg-gray-200 rounded-none" />
                <div className="h-8 bg-gray-200 rounded-none" />
                <div className="col-span-2 h-8 bg-gray-200 rounded-none" />
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-36" />
          </section>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  return (
    <QualificationCardEditPanel
      reservation={{ ...reservation, reservation_number: reservationNumber }}
      formSnapshotFromDb={formSnapshot ?? undefined}
      signedPayload={signedPayload ?? undefined}
      onSaveAdmin={async (body) => {
        await authenticatedApiCall(
          `/api/qualification-cards/by-number/${reservationNumber}/data/admin-full`,
          { method: 'PATCH', body: JSON.stringify(body) },
        );
        await refetchReservation();
        closeRightPanel();
        showSuccess('Karta kwalifikacyjna zaktualizowana. Wymagany ponowny podpis klienta.');
      }}
      onClose={() => closeRightPanel()}
    />
  );
}