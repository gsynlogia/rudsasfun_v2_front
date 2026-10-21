'use client';

import { ARCHIVE_SCOPE_OPTIONS, type ArchiveScope } from '@/lib/utils/seasons';

interface ArchiveScopeSwitchProps {
  name: string;
  value: ArchiveScope;
  onChange: (scope: ArchiveScope) => void;
  /** dark = na granatowej belce (jak na liście Rezerwacji), light = na białym pasku filtrów. */
  tone: 'dark' | 'light';
}

/** Przełącznik Aktualne / Archiwalne / Wszystkie — ten sam wygląd co na liście Rezerwacji. */
export default function ArchiveScopeSwitch({ name, value, onChange, tone }: ArchiveScopeSwitchProps) {
  const box = tone === 'dark'
    ? 'bg-slate-700 text-white rounded'
    : 'bg-white text-gray-800 border-2 border-[#03adf0]';
  return (
    <div className={`flex items-center gap-3 px-3 py-1 ${box}`}>
      {ARCHIVE_SCOPE_OPTIONS.map((option) => (
        <label key={option.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="w-3.5 h-3.5 accent-[#03adf0]"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}