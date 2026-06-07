'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

import UniversalModal from './UniversalModal';

/**
 * Reusable dropdown filter dla kolumny tabeli. Trójkąt (▼) przy nazwie kolumny —
 * klik otwiera CENTRALNY MODAL (UniversalModal — ten sam co inne w admin panel)
 * z konfiguracją filtra. Apply commituje stan i zamyka modal.
 *
 * 4 typy filtrów:
 *  - 'text' — input search (LIKE backend)
 *  - 'date-range' — 2 inputy daty (od / do, ISO YYYY-MM-DD)
 *  - 'multi-select' — lista checkboxów (multi value)
 *  - 'date-range-and-multi' — combo (date range + lista wartości) dla kolumny "Ostatnia data przypomnienia"
 *
 * Stan filtra jest controlled — parent przekazuje `value` i otrzymuje zmianę przez `onChange`.
 * Parent obsługuje URL state (zapis/odczyt z `useSearchParams`).
 *
 * UX:
 *  - Active filter ma kolorowy trójkąt (niebieski) + małe X (clear bez otwierania modala)
 *  - Modal: Escape zamyka (bez apply), klik overlay zamyka (bez apply)
 *  - "Zastosuj" → commit + close, "Wyczyść" → null + close
 */

export type FilterValue =
  | { type: 'text'; q: string }
  | { type: 'date-range'; from: string; to: string }
  | { type: 'multi-select'; values: string[] }
  | { type: 'date-range-and-multi'; from: string; to: string; values: string[] }
  | null;

export interface MultiSelectOption {
  value: string;
  label: string;
  badgeClassName?: string;
}

export interface ColumnFilterProps {
  type: 'text' | 'date-range' | 'multi-select' | 'date-range-and-multi';
  value: FilterValue;
  onChange: (val: FilterValue) => void;
  /** Etykieta kolumny — pokazana w tytule modala, np. "Filtruj: Umowa" */
  columnLabel?: string;
  textPlaceholder?: string;
  multiOptions?: MultiSelectOption[];
}

function isActive(v: FilterValue): boolean {
  if (!v) return false;
  if (v.type === 'text') return v.q.trim().length > 0;
  if (v.type === 'date-range') return Boolean(v.from || v.to);
  if (v.type === 'multi-select') return v.values.length > 0;
  if (v.type === 'date-range-and-multi') return Boolean(v.from || v.to) || v.values.length > 0;
  return false;
}

function summarizeValue(v: FilterValue): string | null {
  if (!isActive(v) || !v) return null;
  if (v.type === 'text') return `"${v.q}"`;
  if (v.type === 'date-range') {
    if (v.from && v.to) return `${v.from} → ${v.to}`;
    if (v.from) return `od ${v.from}`;
    if (v.to) return `do ${v.to}`;
  }
  if (v.type === 'multi-select') return `${v.values.length} ${v.values.length === 1 ? 'wybrane' : 'wybranych'}`;
  if (v.type === 'date-range-and-multi') {
    const parts: string[] = [];
    if (v.from || v.to) parts.push(`${v.from || '...'} → ${v.to || '...'}`);
    if (v.values.length > 0) parts.push(`${v.values.length} kanałów`);
    return parts.join(' + ');
  }
  return null;
}

export default function ColumnFilter({
  type,
  value,
  onChange,
  columnLabel = 'Kolumna',
  textPlaceholder = 'Szukaj...',
  multiOptions = [],
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);

  // Local draft state (commit on apply)
  const [draftText, setDraftText] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [draftValues, setDraftValues] = useState<string[]>([]);

  // Sync draft z value przy otwarciu
  useEffect(() => {
    if (open) {
      if (value?.type === 'text') {
        setDraftText(value.q);
      } else if (value?.type === 'date-range') {
        setDraftFrom(value.from);
        setDraftTo(value.to);
      } else if (value?.type === 'multi-select') {
        setDraftValues(value.values);
      } else if (value?.type === 'date-range-and-multi') {
        setDraftFrom(value.from);
        setDraftTo(value.to);
        setDraftValues(value.values);
      } else {
        setDraftText('');
        setDraftFrom('');
        setDraftTo('');
        setDraftValues([]);
      }
    }
  }, [open, value]);

  function applyAndClose() {
    if (type === 'text') {
      const q = draftText.trim();
      onChange(q ? { type: 'text', q } : null);
    } else if (type === 'date-range') {
      onChange(draftFrom || draftTo ? { type: 'date-range', from: draftFrom, to: draftTo } : null);
    } else if (type === 'multi-select') {
      onChange(draftValues.length > 0 ? { type: 'multi-select', values: draftValues } : null);
    } else if (type === 'date-range-and-multi') {
      const has = draftFrom || draftTo || draftValues.length > 0;
      onChange(has ? { type: 'date-range-and-multi', from: draftFrom, to: draftTo, values: draftValues } : null);
    }
    setOpen(false);
  }

  function clearFilter(e?: React.MouseEvent) {
    e?.stopPropagation();
    setDraftText('');
    setDraftFrom('');
    setDraftTo('');
    setDraftValues([]);
    onChange(null);
    setOpen(false);
  }

  function toggleMulti(v: string) {
    setDraftValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  const active = isActive(value);
  const summary = summarizeValue(value);

  return (
    <>
      <span className="inline-flex items-center ml-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center px-0.5 py-0 rounded cursor-pointer ${
            active ? 'text-orange-600' : 'text-gray-400 hover:text-gray-700'
          }`}
          title={active ? `Filtr aktywny: ${summary}` : 'Filtruj'}
          aria-label="Otwórz filtr kolumny"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {active && (
          <button
            type="button"
            onClick={clearFilter}
            className="inline-flex items-center px-0.5 text-orange-600 hover:text-red-700 cursor-pointer"
            title="Wyczyść filtr"
            aria-label="Wyczyść filtr"
          >
            <X className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        )}
      </span>

      <UniversalModal
        isOpen={open}
        title={`Filtruj: ${columnLabel}`}
        onClose={() => setOpen(false)}
        maxWidth="sm"
      >
        <div className="p-4">
          {type === 'text' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700">
                Szukana fraza:
              </label>
              <input
                type="text"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyAndClose()}
                placeholder={textPlaceholder}
                autoFocus
                className="px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#03adf0]"
              />
              <p className="text-xs text-gray-500">
                Filtr działa w bazie danych (LIKE %query%). Wartość po enter lub Zastosuj.
              </p>
            </div>
          )}
          {type === 'date-range' && (
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-700">
                Od daty:
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="block mt-1 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#03adf0] w-full"
                />
              </label>
              <label className="text-sm text-gray-700">
                Do daty:
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="block mt-1 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#03adf0] w-full"
                />
              </label>
              <p className="text-xs text-gray-500">
                Range inkluzywny (oba dni wliczone). Zostaw jedno puste żeby ograniczyć tylko z jednej strony.
              </p>
            </div>
          )}
          {type === 'multi-select' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700 font-medium">Wybierz wartości:</label>
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto border border-gray-200 p-2">
                {multiOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={draftValues.includes(opt.value)}
                      onChange={() => toggleMulti(opt.value)}
                    />
                    {opt.badgeClassName ? (
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${opt.badgeClassName}`}>
                        {opt.label}
                      </span>
                    ) : (
                      <span>{opt.label}</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Multi-select: wybierz dowolnie wiele wartości (OR — dowolna z nich pasuje).
              </p>
            </div>
          )}
          {type === 'date-range-and-multi' && (
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Zakres dat:</div>
                <label className="text-sm text-gray-700 block">
                  Od:
                  <input
                    type="date"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                    className="block mt-1 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#03adf0] w-full"
                  />
                </label>
                <label className="text-sm text-gray-700 block mt-2">
                  Do:
                  <input
                    type="date"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className="block mt-1 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#03adf0] w-full"
                  />
                </label>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Kanał wysyłki:</div>
                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto border border-gray-200 p-2">
                  {multiOptions.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={draftValues.includes(opt.value)}
                        onChange={() => toggleMulti(opt.value)}
                      />
                      {opt.badgeClassName ? (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${opt.badgeClassName}`}>
                          {opt.label}
                        </span>
                      ) : (
                        <span>{opt.label}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Łączymy AND: data + kanał. Każde puste = bez ograniczenia.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => clearFilter()}
            className="px-4 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Wyczyść
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={applyAndClose}
            className="px-4 py-1.5 text-sm font-medium bg-[#03adf0] text-white hover:bg-[#0299d4] cursor-pointer"
          >
            Zastosuj
          </button>
        </div>
      </UniversalModal>
    </>
  );
}
