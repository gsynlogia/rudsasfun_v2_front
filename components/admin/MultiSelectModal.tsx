'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string | number;
  label: string;
  meta?: string;
}

interface Props {
  title: string;
  options: MultiSelectOption[];
  selected: (string | number)[];
  onClose: () => void;
  onSave: (selected: (string | number)[]) => void;
  allowManualAdd?: boolean;
  searchPlaceholder?: string;
}

export default function MultiSelectModal({
  title,
  options,
  selected,
  onClose,
  onSave,
  allowManualAdd = false,
  searchPlaceholder = 'Szukaj…',
}: Props) {
  const [internal, setInternal] = useState<(string | number)[]>(selected);
  const [search, setSearch] = useState('');
  const [manualInput, setManualInput] = useState('');

  useEffect(() => setInternal(selected), [selected]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q),
    );
  }, [options, search]);

  const toggle = (val: string | number) => {
    setInternal(internal.includes(val) ? internal.filter((v) => v !== val) : [...internal, val]);
  };

  const selectAllFiltered = () => {
    const vals = filtered.map((o) => o.value);
    setInternal([...new Set([...internal, ...vals])]);
  };
  const deselectAll = () => setInternal([]);
  const invert = () => {
    const filteredValues = filtered.map((o) => o.value);
    const kept = internal.filter((v) => !filteredValues.includes(v));
    const added = filteredValues.filter((v) => !internal.includes(v));
    setInternal([...kept, ...added]);
  };

  const addManual = () => {
    const v = manualInput.trim();
    if (!v) return;
    if (!internal.includes(v)) setInternal([...internal, v]);
    setManualInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        <div className="bg-green-50 border-b-2 border-green-600 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-green-600"
            />
          </div>
          <div className="flex gap-2 text-xs">
            <button onClick={selectAllFiltered} className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
              Zaznacz widoczne ({filtered.length})
            </button>
            <button onClick={invert} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              Odwróć
            </button>
            <button onClick={deselectAll} className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
              Wyczyść wszystkie
            </button>
          </div>
          {allowManualAdd && (
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addManual()}
                placeholder="Dodaj ręcznie…"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={addManual} className="px-4 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                Dodaj
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {filtered.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Brak wyników</p>}
          {filtered.map((o) => {
            const isChecked = internal.includes(o.value);
            return (
              <label
                key={o.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  isChecked ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input type="checkbox" checked={isChecked} onChange={() => toggle(o.value)} className="w-4 h-4 mt-0.5 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{o.label}</p>
                  {o.meta && <p className="text-xs text-gray-500 truncate">{o.meta}</p>}
                </div>
                {isChecked && <Check className="w-4 h-4 text-green-600 shrink-0" />}
              </label>
            );
          })}
          {allowManualAdd && internal.filter((v) => !options.some((o) => o.value === v)).length > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">Ręcznie dodane ({internal.filter((v) => !options.some((o) => o.value === v)).length}):</p>
              <div className="flex flex-wrap gap-1">
                {internal.filter((v) => !options.some((o) => o.value === v)).map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    {v}
                    <button onClick={() => setInternal(internal.filter((i) => i !== v))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-600">Wybrane: <strong>{internal.length}</strong></span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">Anuluj</button>
            <button onClick={() => onSave(internal)} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 font-medium">
              Zapisz wybór
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
