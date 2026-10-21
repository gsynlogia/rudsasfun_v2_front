'use client';

import type { Season } from '@/lib/types/seasons';

interface SeasonFilterProps {
  seasons: Season[];
  value: number | null;
  onChange: (seasonId: number | null) => void;
}

/** Listy transportowe: bieżący sezon (domyślnie) albo wybrany sezon — także zarchiwizowany. */
export default function SeasonFilter({ seasons, value, onChange }: SeasonFilterProps) {
  const options: { id: number | null; label: string }[] = [
    { id: null, label: 'Bieżący' },
    ...seasons.map((season) => ({
      id: season.id,
      label: season.is_archived ? `${season.name} (archiwum)` : season.name,
    })),
  ];
  return (
    <div role="radiogroup" aria-label="Sezon" className="ml-3 flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id ?? 'current'}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 ${
              selected
                ? 'border-sky-600 bg-sky-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-sky-600'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}