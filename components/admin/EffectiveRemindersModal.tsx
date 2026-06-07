'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import UniversalModal from './UniversalModal';
import DocumentsOverviewTable from './DocumentsOverviewTable';

/**
 * Modal "Skuteczne powiadomienia" — pokazuje liste rezerwacji z OBA dokumenty (umowa + karta)
 * podpisanymi SMS-em.
 *
 * Cz. 5 widoku Dokumenty (2026-05-31): podstawowa wersja.
 * Cz. 6 widoku Dokumenty (2026-05-31): dodany toggle "Pokaz wszystkie podpisane rezerwacje".
 *
 * Logika (Cz. 6 — potwierdzone przez usera 2026-05-31):
 *  - Default (showOrganic=false): tylko after_reminder (klient zareagowal na reminder admina)
 *      → tlo wiersza JASNOZIELONE (bg-green-50)
 *  - Toggle ON (showOrganic=true): + organic_no_reminder (klient sam, bez reminderu)
 *      → tlo wiersza JASNOBLEKITNE (bg-sky-50) dla organic_no_reminder
 *      → after_reminder pozostaje zielony
 *  - NIGDY nie pokazujemy organic_post_factum (reminder wyslany po podpisie — backend wyklucza)
 *
 * URL state: parent (DocumentsOverviewTable mode='active') zarzadza `?effective_modal=open`.
 */

export interface EffectiveRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EffectiveRemindersModal({
  isOpen,
  onClose,
}: EffectiveRemindersModalProps) {
  // Cz. 6 (2026-05-31): showOrganic w URL state ?effective_show_organic=true
  // (zamiast useState — zeby F5 / share linku zachowywal toggle, zgodnie z user "wszystko w pasku adresu")
  const router = useRouter();
  const searchParams = useSearchParams();
  const showOrganic = searchParams?.get('effective_show_organic') === 'true';

  const setShowOrganic = (newVal: boolean) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newVal) {
      params.set('effective_show_organic', 'true');
    } else {
      params.delete('effective_show_organic');
    }
    router.replace(`/admin-panel/documents?${params.toString()}`, { scroll: false });
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Skuteczne powiadomienia"
      maxWidth="screen"
      closeOnOverlayClick={false}
    >
      {/* Toolbar nad tabela — checkbox toggle dla "pokaz wszystkie podpisane" */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 bg-white">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showOrganic}
            onChange={(e) => setShowOrganic(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-orange-600"
          />
          <span className="text-gray-800">
            Pokaż wszystkie podpisane rezerwacje
            <span className="text-xs text-gray-500 ml-2">
              (włącz aby zobaczyć też te gdzie klient podpisał sam — bez przypomnienia)
            </span>
          </span>
        </label>
      </div>
      {/*
        Modal wysokosc minus header (~60px) + toolbar (~50px) + paginacja (~50px).
        Cz. 6: usuniete `disableUrlState` — modal MA modyfikowac URL (z prefixem 'effective_'),
        zgodnie z user explicit "wszystko w pasku adresu". urlPrefix derive z mode='effective' w komponencie.
      */}
      <div className="overflow-hidden" style={{ height: 'calc(100vh - 170px)' }}>
        <DocumentsOverviewTable
          mode="effective"
          effectiveShowOrganic={showOrganic}
        />
      </div>
    </UniversalModal>
  );
}
