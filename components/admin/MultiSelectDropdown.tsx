'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface MultiOption { value: string; label: string }

interface MultiSelectDropdownProps {
  values: Set<string>;
  options: MultiOption[];
  onChange: (values: Set<string>) => void;
  ariaLabel?: string;
  minWidthPx?: number;
  /** Etykieta gdy nic nie wybrano (= wszystkie). */
  emptyLabel?: string;
}

/**
 * Dropdown WIELOKROTNEGO wyboru (checkboxy) — np. wybór wielu sezonów do predykcji/statystyk.
 * Pusty zbiór = „wszystkie" (brak filtra). Klik opcji przełącza zaznaczenie (lista NIE zamyka się),
 * klik „wszystkie" czyści wybór. Zamyka się po kliknięciu poza. Spójny wizualnie ze StyledDropdown.
 */
export default function MultiSelectDropdown({
  values, options, onChange, ariaLabel, minWidthPx, emptyLabel = 'Wszystkie',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (v: string) => {
    const next = new Set(values);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(next);
  };

  const label = values.size === 0
    ? emptyLabel
    : values.size === 1
      ? (options.find((o) => o.value === Array.from(values)[0])?.label ?? `Wybrane: 1`)
      : `Wybrane: ${values.size}`;

  const box = (checked: boolean) => (
    <span className={`w-4 h-4 flex-shrink-0 inline-flex items-center justify-center border rounded ${checked ? 'bg-[#03adf0] border-[#03adf0]' : 'border-gray-300'}`}>
      {checked && <Check className="w-3 h-3 text-white" />}
    </span>
  );

  return (
    <div className="relative" ref={ref} style={minWidthPx ? { minWidth: minWidthPx } : undefined}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center justify-between gap-2 w-full text-sm px-3 py-1.5 text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-[#03adf0] hover:text-[#03adf0] focus:outline-none focus:ring-2 focus:ring-[#03adf0]/30 transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <ul
        role="listbox"
        aria-multiselectable="true"
        className={`absolute left-0 mt-1 z-40 min-w-full bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-72 overflow-auto origin-top transition-all duration-150 ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <li
          role="option"
          aria-selected={values.size === 0}
          onClick={() => onChange(new Set())}
          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${values.size === 0 ? 'bg-[#03adf0]/10 text-[#03adf0] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {box(values.size === 0)}
          <span className="truncate">{emptyLabel}</span>
        </li>
        {options.map((o) => {
          const checked = values.has(o.value);
          return (
            <li
              key={o.value}
              role="option"
              aria-selected={checked}
              onClick={() => toggle(o.value)}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${checked ? 'bg-[#03adf0]/10 text-[#03adf0] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {box(checked)}
              <span className="truncate">{o.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
