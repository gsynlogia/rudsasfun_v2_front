'use client';

/**
 * AneksPreview (bug Trello vS5tDGy3 2026-05-25) — render profesjonalny aneksu promocyjnego.
 *
 * Komponent prezentacyjny — bez fetch, bez state. Przyjmuje surowy `payload` JSON z
 * `signed_documents.payload` dla `document_type='annex_promotion'`.
 *
 * Obsługuje 2 wersje:
 * - annex_version=2 (od 2026-05-25): rich payload z `changes[]`, `price_summary`, `summary_human`
 * - annex_version=1 (legacy): fallback render z `before`/`after`/`diff` raw
 *
 * Renderuje:
 * - Nagłówek z datą + adminem
 * - Tabelę zmian PRZED/PO (kolorystyka: removed=czerwone, added=zielone, changed=żółte)
 * - Sekcję cenową z deltą + kierunkiem (↑/↓/=)
 * - Klauzulę "Pozostałe postanowienia bez zmian"
 */
import { FileText, ArrowDown, ArrowUp, Minus, AlertCircle } from 'lucide-react';
import { formatDateTimeLong } from '@/lib/utils/dateFormatters';

interface ChangeBlock {
  field: string;
  label: string;
  action: 'added' | 'removed' | 'changed';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  source?: 'v2' | 'legacy';
}

interface PriceSummary {
  before: number;
  after: number;
  delta: number;
  delta_percent: number;
  direction: 'increased' | 'decreased' | 'no_change';
}

interface AnnexPayload {
  annex_version?: number;
  annex_type?: string;
  created_at?: string;
  admin_user_id?: number | null;
  admin_user_name?: string | null;
  change_summary?: string;
  summary_human?: string;
  changes?: ChangeBlock[];
  price_summary?: PriceSummary;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: { total_price_delta?: number };
}

interface Props {
  payloadJson: string | null | undefined;
  reservationNumber?: string;
  signedAt?: string | null;
}

// TD-027: formatDateTime ekstrakcja do lib/utils/dateFormatters.ts (formatDateTimeLong).
// Re-eksportujemy lokalnie pod stara nazwa zeby uniknac touchu callsite'ow w pliku.
const formatDateTime = formatDateTimeLong;

function formatPLN(value: number | null | undefined): string {
  if (typeof value !== 'number') return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} zł`;
}

function formatPLNAbs(value: number | null | undefined): string {
  if (typeof value !== 'number') return '—';
  return `${value.toFixed(2)} zł`;
}

function describeBlock(block: Record<string, unknown> | null | undefined): string {
  if (!block) return '— brak —';
  // Typeof guards zamiast `as string` cast — chroni przed runtime crash gdy backend
  // wysle nieoczekiwany typ (np. number zamiast string, lub nested object) — Agent 4 audit.
  const nameValue = block.name;
  const kodValue = block.kod;
  const amountValue = block.amount;
  const kindValue = block.kind;
  const name = typeof nameValue === 'string' ? nameValue
    : (typeof kodValue === 'string' ? kodValue : '—');
  const moneyPart = typeof amountValue === 'number' ? ` (${formatPLN(amountValue)})` : '';
  const kindPart = kindValue === 'fm_deprecated' ? ' [wycofana]' : '';
  return `${name}${moneyPart}${kindPart}`;
}

const ROW_BG: Record<ChangeBlock['action'], string> = {
  added: 'bg-green-50',
  removed: 'bg-red-50',
  changed: 'bg-amber-50',
};

const ACTION_LABEL: Record<ChangeBlock['action'], string> = {
  added: 'DODANO',
  removed: 'USUNIĘTO',
  changed: 'ZMIENIONO',
};

export default function AneksPreview({ payloadJson, reservationNumber, signedAt }: Props) {
  // Bezpieczny parse — payload może być null, pusty, lub uszkodzony JSON
  let payload: AnnexPayload | null = null;
  try {
    payload = payloadJson ? JSON.parse(payloadJson) : null;
  } catch {
    payload = null;
  }

  if (!payload) {
    return (
      <div className="p-6 text-center text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>Brak danych aneksu lub uszkodzony payload.</p>
      </div>
    );
  }

  const version = payload.annex_version ?? 1;
  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  const priceSummary = payload.price_summary;
  const isLegacyV1 = version < 2;

  const directionIcon = priceSummary?.direction === 'increased'
    ? <ArrowUp className="w-4 h-4 inline text-red-600" />
    : priceSummary?.direction === 'decreased'
    ? <ArrowDown className="w-4 h-4 inline text-green-600" />
    : <Minus className="w-4 h-4 inline text-gray-500" />;

  return (
    <div data-testid="aneks-preview" className="bg-white p-6 space-y-6 max-w-4xl mx-auto">
      {/* Nagłówek */}
      <div className="border-b-2 border-purple-300 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-purple-700" />
          <h2 className="text-2xl font-bold text-purple-900">Aneks promocyjny</h2>
        </div>
        {reservationNumber && (
          <p className="text-sm text-gray-600">
            do Umowy <span className="font-mono font-semibold">{reservationNumber}</span>
            {signedAt && <> z dnia <span className="font-medium">{formatDateTime(signedAt).split(',')[0]}</span></>}
          </p>
        )}
        <p className="text-sm text-gray-600 mt-1">
          Sporządzony: <span className="font-medium">{formatDateTime(payload.created_at)}</span>
          {payload.admin_user_name && (
            <> przez <span className="font-medium">{payload.admin_user_name}</span></>
          )}
        </p>
      </div>

      {/* Krótkie podsumowanie po ludzku */}
      {payload.summary_human && (
        <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-900">
          {payload.summary_human}
        </div>
      )}

      {/* Tabela zmian — rich format v2 */}
      {!isLegacyV1 && changes.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">Zmiany w umowie</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Pole</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">Akcja</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">PRZED</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-300">PO</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((ch, idx) => (
                  <tr key={idx} className={`${ROW_BG[ch.action] ?? ''} border-b border-gray-200`}>
                    <td className="px-3 py-2 font-medium text-gray-800">{ch.label}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        ch.action === 'added' ? 'bg-green-200 text-green-900' :
                        ch.action === 'removed' ? 'bg-red-200 text-red-900' :
                        'bg-amber-200 text-amber-900'
                      }`}>
                        {ACTION_LABEL[ch.action] ?? ch.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{describeBlock(ch.before)}</td>
                    <td className="px-3 py-2 text-gray-700">{describeBlock(ch.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sekcja cenowa */}
      {priceSummary && (
        <div className="border border-gray-300 rounded p-4 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Cena umowy</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Przed</p>
              <p className="text-xl font-bold text-gray-800">{formatPLNAbs(priceSummary.before)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Po</p>
              <p className="text-xl font-bold text-gray-800">{formatPLNAbs(priceSummary.after)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Różnica</p>
              <p className={`text-xl font-bold ${
                priceSummary.direction === 'increased' ? 'text-red-600' :
                priceSummary.direction === 'decreased' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {directionIcon} {formatPLN(priceSummary.delta)}
                {typeof priceSummary.delta_percent === 'number' && priceSummary.delta_percent !== 0 && (
                  <span className="text-sm font-normal ml-1">
                    ({priceSummary.delta_percent > 0 ? '+' : ''}{priceSummary.delta_percent.toFixed(2)}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fallback dla starych aneksów v1 */}
      {isLegacyV1 && (
        <div className="border border-amber-300 rounded p-3 bg-amber-50 text-sm">
          <p className="font-medium text-amber-900 mb-1">Aneks w starym formacie (v1)</p>
          {payload.change_summary && <p className="text-gray-700">{payload.change_summary}</p>}
          {payload.diff?.total_price_delta !== undefined && (
            <p className="text-gray-700 mt-1">Zmiana ceny: {formatPLN(payload.diff.total_price_delta)}</p>
          )}
        </div>
      )}

      {/* Klauzula */}
      <div className="text-xs text-gray-500 italic border-t border-gray-200 pt-3">
        Pozostałe postanowienia Umowy pozostają bez zmian.
      </div>
    </div>
  );
}
