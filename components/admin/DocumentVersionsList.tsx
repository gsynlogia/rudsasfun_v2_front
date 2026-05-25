'use client';

// TD-027: ekstrakcja formatDateTime do lib/utils/dateFormatters.ts (formatDateTimeShort).
import { formatDateTimeShort as formatDateTime } from '@/lib/utils/dateFormatters';

type DocStatus = 'accepted' | 'in_verification' | 'requires_signature' | 'rejected' | 'superseded';

interface SignedDoc {
  id: number;
  document_type: string;
  status: string;
  sms_verified_at?: string | null;
  created_at: string;
  payload?: string | null;
}

interface DocumentVersionsListProps {
  documents: SignedDoc[];
  /** Najnowszy draft klienta (form_snapshot z qualification_card_data — TYLKO dla karty kwalifikacyjnej). */
  latestFormSnapshot?: Record<string, unknown> | null;
  latestFormSnapshotUpdatedAt?: string | null;
  onPreview?: (doc: SignedDoc) => void;
  onPreviewDraft?: () => void;
}

/**
 * Lista wersji dokumentów (umowy + karty) w prawym panelu sekcji "Dokumenty"
 * w admin-panel/rezerwacja/[id]. Zastąpiła placeholder "Graj" (2026-05-24 REZ-1828).
 *
 * 5 wariantów wizualnych (ustalone z userem 2026-05-24):
 *  - 🟢 ciemno-zielony — accepted (klient podpisał SMS + admin zatwierdził)
 *  - 🟢 jasno-zielony tile + 🟡 żółty badge "Podpisana SMS — zweryfikuj" —
 *    in_verification + sms_verified_at NOT NULL (klient podpisał, admin MUSI jeszcze zaakceptować).
 *    Logika UX: tło=stan klienta (zielone=zrobił swoje), badge=akcja admina (żółty=zweryfikuj).
 *  - 🟡 żółty + 🔴 czerwony badge — in_verification + sms_verified_at NULL
 *    (klient NIE podpisał SMS-em — admin może użyć "Zweryfikuj kod telefonicznie")
 *  - 🔵 niebieski — najnowszy draft klienta (form_snapshot) bez podpisu SMS
 *  - 🔴 czerwony — rejected (odrzucony)
 *
 * Sortowanie wg sortOrder 1→5 (najbardziej "ukończone" na górze, drafty/niepodpisane niżej).
 */
type Variant = 'accepted' | 'signed_sms' | 'awaiting_client' | 'draft' | 'rejected' | 'annex';

function classifyDoc(doc: SignedDoc): Variant | null {
  // Bug Trello vS5tDGy3 2026-05-25: aneksy promocyjne (annex_promotion) jako 6 wariant.
  if (doc.document_type === 'annex_promotion') return 'annex';
  if (doc.status === 'accepted') return 'accepted';
  if (doc.status === 'rejected') return 'rejected';
  if (doc.status === 'in_verification') {
    return doc.sms_verified_at ? 'signed_sms' : 'awaiting_client';
  }
  return null; // requires_signature / superseded / inne — pomijamy
}

const VARIANT_STYLE: Record<Variant, { tile: string; badge: string; label: string; sortOrder: number }> = {
  accepted: {
    tile: 'bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200',
    badge: 'bg-emerald-300 text-emerald-900',
    label: 'Podpisana i zatwierdzona',
    sortOrder: 1,
  },
  signed_sms: {
    tile: 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100',
    badge: 'bg-amber-200 text-amber-800',
    label: 'Podpisana SMS — zweryfikuj',
    sortOrder: 2,
  },
  awaiting_client: {
    tile: 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100',
    badge: 'bg-red-200 text-red-800',
    label: 'Niepodpisana przez klienta',
    sortOrder: 3,
  },
  draft: {
    tile: 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100',
    badge: 'bg-blue-200 text-blue-800',
    label: 'Wersja robocza',
    sortOrder: 4,
  },
  rejected: {
    tile: 'bg-red-50 border-red-300 text-red-900 hover:bg-red-100',
    badge: 'bg-red-200 text-red-800',
    label: 'Odrzucona',
    sortOrder: 5,
  },
  // Bug Trello vS5tDGy3 — aneks promocyjny (auto generowany przy zmianie promocji legacy/v2)
  annex: {
    tile: 'bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100',
    badge: 'bg-purple-200 text-purple-800',
    label: 'Aneks promocyjny',
    sortOrder: 6,
  },
};

function VariantTile({
  variant,
  docNoun,
  dateIso,
  onClick,
}: {
  variant: Variant;
  docNoun: string;
  dateIso: string;
  onClick?: () => void;
}) {
  const style = VARIANT_STYLE[variant];
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`w-full text-left rounded border p-2 text-sm transition-colors ${style.tile} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      title={clickable ? 'Otwórz podgląd' : undefined}
    >
      <div className="flex justify-between gap-2">
        <div className="font-medium">{docNoun}</div>
        <span className={`${style.badge} px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap`}>{style.label}</span>
      </div>
      <div className="text-xs mt-1 opacity-80">{formatDateTime(dateIso)}</div>
    </button>
  );
}

interface SectionTile {
  key: string;
  variant: Variant;
  dateIso: string;
  onClick?: () => void;
}

function renderSection(label: string, docNoun: string, tiles: SectionTile[]) {
  const sorted = [...tiles].sort((a, b) => {
    const orderDiff = VARIANT_STYLE[a.variant].sortOrder - VARIANT_STYLE[b.variant].sortOrder;
    if (orderDiff !== 0) return orderDiff;
    return (b.dateIso || '').localeCompare(a.dateIso || '');
  });

  return (
    <div className="space-y-2 min-w-0">
      <h4 className="text-xs font-semibold text-gray-600 uppercase">{label}</h4>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Brak.</p>
      ) : (
        sorted.map((t) => (
          <VariantTile key={t.key} variant={t.variant} docNoun={docNoun} dateIso={t.dateIso} onClick={t.onClick} />
        ))
      )}
    </div>
  );
}

export default function DocumentVersionsList({
  documents,
  latestFormSnapshot,
  latestFormSnapshotUpdatedAt,
  onPreview,
  onPreviewDraft,
}: DocumentVersionsListProps) {
  const contracts = documents.filter((d) => d.document_type === 'contract');
  const cards = documents.filter((d) => d.document_type === 'qualification_card');
  // Bug Trello vS5tDGy3 2026-05-25: aneksy promocyjne jako trzecia sekcja
  const annexes = documents.filter((d) => d.document_type === 'annex_promotion');

  const contractTiles: SectionTile[] = contracts
    .map((doc) => ({ doc, variant: classifyDoc(doc) }))
    .filter((x): x is { doc: SignedDoc; variant: Variant } => x.variant !== null)
    .map(({ doc, variant }) => ({
      key: `c-${doc.id}`,
      variant,
      dateIso: doc.created_at,
      onClick: onPreview ? () => onPreview(doc) : undefined,
    }));

  const cardTiles: SectionTile[] = cards
    .map((doc) => ({ doc, variant: classifyDoc(doc) }))
    .filter((x): x is { doc: SignedDoc; variant: Variant } => x.variant !== null)
    .map(({ doc, variant }) => ({
      key: `k-${doc.id}`,
      variant,
      dateIso: doc.created_at,
      onClick: onPreview ? () => onPreview(doc) : undefined,
    }));

  const annexTiles: SectionTile[] = annexes
    .map((doc) => ({ doc, variant: classifyDoc(doc) }))
    .filter((x): x is { doc: SignedDoc; variant: Variant } => x.variant !== null)
    .map(({ doc, variant }) => ({
      key: `a-${doc.id}`,
      variant,
      dateIso: doc.created_at,
      onClick: onPreview ? () => onPreview(doc) : undefined,
    }));

  // "Wersja robocza" — tylko dla karty kwalifikacyjnej (umowa nie ma form_snapshot).
  if (latestFormSnapshot) {
    cardTiles.push({
      key: 'k-draft',
      variant: 'draft',
      dateIso: latestFormSnapshotUpdatedAt || new Date().toISOString(),
      onClick: onPreviewDraft,
    });
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-white">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-gray-100">Wersje dokumentów</h3>
      <div className="space-y-4">
        {renderSection('Umowy', 'Umowa', contractTiles)}
        {renderSection('Karty kwalifikacyjne', 'Karta kwalifikacyjna', cardTiles)}
        {renderSection('Aneksy', 'Aneks promocyjny', annexTiles)}
      </div>
    </div>
  );
}

export type { DocStatus, SignedDoc };
