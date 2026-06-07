'use client';

/**
 * Badge statusu dokumentu (umowa / karta kwalifikacyjna).
 *
 * Wzorzec wizualny przeniesiony z ReservationsTableNew.tsx (linie ~5605-5644) —
 * inline-flex z bg-* + text-*. Stanowi DRY dla nowych miejsc; istniejące 3 lokalizacje
 * z inline JSX (admin rezerwacja page.tsx, ReservationsTableNew.tsx, Downloads.tsx)
 * docelowo do refaktoru na ten komponent (TD zauważone w planie 2026-05-29).
 *
 * Backend zwraca status w polach reservation.contract_status / reservation.qualification_card_status
 * (oba string|null). Wartości realne (z routera reservations.py:1027-1062): 'approved' | 'in_verification'
 * | 'rejected' | null. Plus z modelu SignedDocument bez agregacji: 'requires_signature' | 'superseded'.
 */

export type DocumentStatus =
  | 'approved'
  | 'accepted'
  | 'in_verification'
  | 'signed_pending_admin'  // Cz. 3 (2026-05-29): klient podpisał SMS, czeka admin zatwierdzenia
  | 'rejected'
  | 'requires_signature'
  | 'superseded'
  | 'pending'
  | null
  | undefined;

export interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  /** Opcjonalny powód odrzucenia (z signed_document.client_message) — pokazywany w tooltipie + jako mniejszy tekst pod badge gdy status=rejected */
  rejectionReason?: string | null;
}

export interface StatusVisual {
  label: string;
  className: string;
}

/**
 * Jedno źródło prawdy dla etykiety + koloru statusu dokumentu. Używane przez badge (DOKUMENTY)
 * ORAZ tabelę REZERWACJE (render + eksport + filtr) — żeby obie zakładki pokazywały identyczne statusy
 * (wymaganie usera 2026-06-01).
 */
export function getDocumentStatusVisual(status: DocumentStatus): StatusVisual {
  switch (status) {
    case 'approved':
    case 'accepted':
      return {
        label: 'Zatwierdzona',
        className: 'bg-green-100 text-green-800',
      };
    case 'in_verification':
    case 'pending':
      return {
        label: 'Oczekuje podpisu klienta',
        className: 'bg-yellow-100 text-yellow-800',
      };
    case 'signed_pending_admin':
      // Cz. 3: klient podpisał SMS — czeka tylko admina (action item dla Joanny)
      return {
        label: 'Podpisana SMS — czeka admina',
        className: 'bg-cyan-100 text-cyan-800',
      };
    case 'rejected':
      return {
        label: 'Odrzucona',
        className: 'bg-red-100 text-red-800',
      };
    case 'requires_signature':
      return {
        label: 'Wymaga podpisu',
        className: 'bg-orange-100 text-orange-800',
      };
    case 'superseded':
      return {
        label: 'Nieaktualna (zastąpiona)',
        className: 'bg-gray-100 text-gray-500',
      };
    default:
      return {
        label: 'Brak',
        className: 'bg-gray-100 text-gray-500',
      };
  }
}

export default function DocumentStatusBadge({ status, rejectionReason }: DocumentStatusBadgeProps) {
  const visual = getDocumentStatusVisual(status);
  const showReason = status === 'rejected' && rejectionReason && rejectionReason.trim().length > 0;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${visual.className}`}
        title={showReason ? `Powód odrzucenia: ${rejectionReason}` : undefined}
      >
        {visual.label}
      </span>
      {showReason && (
        <span className="text-xs text-red-600 max-w-[200px] truncate" title={rejectionReason ?? undefined}>
          {rejectionReason}
        </span>
      )}
    </div>
  );
}
