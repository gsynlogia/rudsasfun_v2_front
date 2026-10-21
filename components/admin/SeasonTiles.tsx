'use client';

import { useEffect, useState } from 'react';

import { listSeasons } from '@/lib/services/seasonsApi';
import type { Season } from '@/lib/types/seasons';

interface SeasonTilesProps {
  value: number | null;
  onChange: (season: Season) => void;
  /** Nowy turnus: dopóki nic nie wybrano, zaznacz najnowszy niezarchiwizowany sezon. */
  preselectCurrent?: boolean;
}

/** Wybór sezonu turnusu (kafelki). Okres lato/zima turnusu bierze się z wybranego sezonu. */
export default function SeasonTiles({ value, onChange, preselectCurrent = false }: SeasonTilesProps) {
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSeasons()
      .then((data) => {
        if (!cancelled) setSeasons(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Nie udało się pobrać sezonów');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preselectCurrent || value !== null || !seasons) return;
    const current = seasons.find((season) => !season.is_archived);
    if (current) onChange(current);
  }, [preselectCurrent, value, seasons, onChange]);

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!seasons) return <div className="h-10 w-56 animate-pulse bg-gray-100" aria-hidden="true" />;
  if (seasons.length === 0) return <p className="text-sm text-gray-500">Brak sezonów</p>;

  return (
    <div role="radiogroup" aria-label="Sezon" className="flex flex-wrap gap-2">
      {seasons.map((season) => {
        const selected = season.id === value;
        return (
          <button
            key={season.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(season)}
            className={`min-h-10 px-4 py-2 text-sm font-medium border-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03adf0] ${
              selected
                ? 'border-[#03adf0] bg-[#03adf0] text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-[#03adf0]'
            }`}
            style={{ borderRadius: 0, cursor: 'pointer' }}
          >
            {season.is_archived ? `${season.name} (archiwum)` : season.name}
          </button>
        );
      })}
    </div>
  );
}