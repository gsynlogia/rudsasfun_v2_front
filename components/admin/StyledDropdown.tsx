'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface DropdownOption { value: string; label: string }

interface StyledDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  size?: 'sm' | 'lg';     // 'lg' = tytułowy (select rodzaju statystyki), 'sm' = zwykły (wybór dnia)
  ariaLabel?: string;
  minWidthPx?: number;
}

/**
 * Profesjonalny dropdown (custom) z płynnym rozwijaniem — zastępuje natywny <select>.
 * Animacja open/close (opacity + scale, origin-top), zaznaczenie aktywnej opcji, zamknięcie po kliknięciu poza.
 */
export default function StyledDropdown({ value, options, onChange, size = 'sm', ariaLabel, minWidthPx }: StyledDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const btnCls = size === 'lg'
    ? 'text-xl sm:text-2xl font-semibold px-3 py-1.5'
    : 'text-sm px-3 py-1.5';
  const chevCls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="relative" ref={ref} style={minWidthPx ? { minWidth: minWidthPx } : undefined}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 w-full ${btnCls} text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-[#03adf0] hover:text-[#03adf0] focus:outline-none focus:ring-2 focus:ring-[#03adf0]/30 transition-colors`}
      >
        <span className="truncate">{current?.label ?? '—'}</span>
        <ChevronDown className={`${chevCls} text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <ul
        role="listbox"
        className={`absolute left-0 mt-1 z-40 min-w-full bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-72 overflow-auto origin-top transition-all duration-150 ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <li
              key={o.value}
              role="option"
              aria-selected={active}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer transition-colors ${active ? 'bg-[#03adf0]/10 text-[#03adf0] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="truncate">{o.label}</span>
              {active && <Check className="w-4 h-4 flex-shrink-0" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
