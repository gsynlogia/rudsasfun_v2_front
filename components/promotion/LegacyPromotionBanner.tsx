'use client';

/**
 * LegacyPromotionBanner (bug Trello vS5tDGy3 + QMrhckg3) — wspólny komponent prezentacyjny
 * dla bannera "stara promocja" w panelu admin (z przyciskiem Usuń) i w panelu klienta (read-only).
 *
 * Ekstrahowany z AdminPromotionV2EditPanel (2 kopie) + PromotionV2Snapshot (1 kopia) zgodnie
 * z zasadą DRY CLAUDE.md: "trzecia kopia tej samej logiki = OBOWIĄZEK ekstrakcji".
 *
 * Pure presentational — zero fetch, zero state. Rodzic przekazuje gotowe dane i handlery.
 */
import { AlertTriangle, Trash2 } from 'lucide-react';

export type LegacyKind = 'promotion' | 'promo_code' | 'fm_deprecated';

interface Props {
  kind: LegacyKind;
  name: string;
  amount: number | null;
  deprecatedReason?: string | null;
  /** Gdy true — panel klienta (read-only, bez przycisków akcji + inny tekst zachęty). */
  readOnly?: boolean;
  /** Tylko w trybie edycji (admin). Callback dla klik "Usuń starą promocję"/"Usuń stary kod rabatowy". */
  onDeleteClick?: () => void;
  /** Tylko w trybie edycji. true gdy DELETE request w toku — button pokazuje "Kasowanie…". */
  deletingInProgress?: boolean;
  /** data-testid dla Playwright. Domyślne: `legacy-${kind === 'promo_code' ? 'promo-code' : 'promotion'}-banner`. */
  testId?: string;
}

function formatAmount(amount: number | null): string | null {
  if (typeof amount !== 'number') return null;
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)} zł`;
}

// W STARYM systemie (legacy) wszystko bylo "promocja" — DR/RR/Maxa/Bony/FM razem.
// Joanna nie zna pojecia "kod rabatowy" dla legacy (to nowy koncept v2).
// Dlatego dla bannera admin zawsze mowimy "Stara promocja" / "Usun stara promocje",
// niezaleznie czy w nowym swiecie mapuje sie na promotion_v2 czy promo_code.
// Tylko panel klienta (readOnly) moze rozroznic — ale tez upraszczamy do "Promocja".
function buildLabel(_kind: LegacyKind, readOnly: boolean): string {
  return readOnly ? 'Promocja' : 'Stara promocja';
}

function buildEmoji(_kind: LegacyKind): string {
  return '\u{1F4CB}';
}

function buildHelpText(_kind: LegacyKind, readOnly: boolean, deprecatedReason?: string | null): string {
  if (readOnly) {
    return 'Twoja rezerwacja korzysta ze starszej wersji promocji. Jeśli chcesz coś zmienić, skontaktuj się z biurem.';
  }
  if (deprecatedReason) return deprecatedReason;
  // Wspolny komunikat dla admin: zawsze "stara promocja" — semantyka spojna z systemem v1.
  // Pole Promocja LUB Kod rabatowy ponizej (w v2) sluzy do wybrania nowej. Skasowanie starej
  // NIE rusza signed_documents.payload (umowa zostaje immutable snapshot z dnia podpisu).
  return 'To stara promocja — możesz ją tylko skasować lub nadpisać wybierając nową z listy poniżej.';
}

function buildDeleteLabel(_kind: LegacyKind): string {
  return 'Usuń starą promocję';
}

export default function LegacyPromotionBanner({
  kind, name, amount, deprecatedReason, readOnly = false, onDeleteClick, deletingInProgress = false, testId,
}: Props) {
  const resolvedTestId = testId
    ?? (readOnly
      ? 'legacy-promo-snapshot-client'
      : kind === 'promo_code' ? 'legacy-promo-code-banner' : 'legacy-promotion-banner');
  const amountText = formatAmount(amount);
  const label = buildLabel(kind, readOnly);
  const helpText = buildHelpText(kind, readOnly, deprecatedReason);

  return (
    <div
      data-testid={resolvedTestId}
      className="bg-amber-50 border border-amber-300 rounded-md p-3 flex gap-3 items-start"
    >
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-900">
          {buildEmoji(kind)} {label}: <span className="font-bold">{name}</span>
          {amountText && (
            <span className="ml-2 text-amber-700 font-mono">{amountText}</span>
          )}
          {kind === 'fm_deprecated' && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">wycofana</span>
          )}
        </p>
        <p className="text-xs text-amber-800 mt-1">{helpText}</p>
        {!readOnly && onDeleteClick && (
          <button
            type="button"
            onClick={onDeleteClick}
            disabled={deletingInProgress}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deletingInProgress ? 'Kasowanie…' : buildDeleteLabel(kind)}
          </button>
        )}
      </div>
    </div>
  );
}
