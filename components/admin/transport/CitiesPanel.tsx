'use client';

/**
 * Panel LEWY „Miasta" — tabela przystanków 1:1 z makietą Figma (CitiesTransportTable.tsx).
 * Nagłówek + stopka gray-700; kolory tras (bg-*-100, hover -200, podświetlenie -300); checkboxy:
 *  - MASTER zaznaczenia (nagłówek PRZYSTANEK, niebieski),
 *  - MASTER przesiadek (nagłówek ⇄, pomarańczowy),
 *  - per MIASTO (obok nazwy), per KOMÓRKA RESORTU (obok liczby Beaver/Sawa/Limba),
 *  - per PRZESIADKA (kolumna ⇄) → dodatkowy wiersz „przesiadka <miasto>".
 * Dane realne z bazy (sezon/połączenie); mock makiety ignorowany.
 */
import { Fragment, useMemo, useState } from 'react';

import type { CityCounts } from '@/lib/types/transportLists';
import {
  type Resort, type SelectionState, isCityFullySelected, isResortCellSelected,
} from '@/lib/utils/transportSelection';

interface Totals { razem: number; beaver: number; sawa: number; limba: number; nieprzyp: number; }

const RESORT_LABELS: Record<Resort, string> = { beaver: 'Beaver', sawa: 'Sawa', limba: 'Limba' };

// Trasy/destynacje + kolory (makieta §6.2). Klucz = nazwa miasta (lower, exact PL z bazy).
const ROUTE_OF: Record<string, number> = {
  warszawa: 1,
  łódź: 2, włocławek: 2,
  toruń: 3,
  kraków: 4, kielce: 4, radom: 4,
  katowice: 5, częstochowa: 5, 'piotrków trybunalski': 5, bełchatów: 5,
  wrocław: 6, leszno: 6, poznań: 6, gniezno: 6,
  bydgoszcz: 7,
  szczecin: 8, kołobrzeg: 8, koszalin: 8, słupsk: 8,
  lębork: 9,
  gdynia: 10,
  gdańsk: 11,
  własny: 12,
};
// Tła wierszy 1:1 z makietą: bazowo -100 (gray-200), hover -200 (gray-300), podświetlone -300 (gray-400).
const ROUTE_BG: Record<number, { base: string; hover: string; active: string }> = {
  1: { base: 'bg-blue-100', hover: 'hover:bg-blue-200', active: 'bg-blue-300' },
  2: { base: 'bg-orange-100', hover: 'hover:bg-orange-200', active: 'bg-orange-300' },
  3: { base: 'bg-green-100', hover: 'hover:bg-green-200', active: 'bg-green-300' },
  4: { base: 'bg-gray-200', hover: 'hover:bg-gray-300', active: 'bg-gray-400' },
  5: { base: 'bg-red-100', hover: 'hover:bg-red-200', active: 'bg-red-300' },
  6: { base: 'bg-yellow-100', hover: 'hover:bg-yellow-200', active: 'bg-yellow-300' },
  7: { base: 'bg-teal-100', hover: 'hover:bg-teal-200', active: 'bg-teal-300' },
  8: { base: 'bg-pink-100', hover: 'hover:bg-pink-200', active: 'bg-pink-300' },
  9: { base: 'bg-indigo-100', hover: 'hover:bg-indigo-200', active: 'bg-indigo-300' },
  10: { base: 'bg-sky-100', hover: 'hover:bg-sky-200', active: 'bg-sky-300' },
  11: { base: 'bg-violet-100', hover: 'hover:bg-violet-200', active: 'bg-violet-300' },
  12: { base: 'bg-purple-100', hover: 'hover:bg-purple-200', active: 'bg-purple-300' },
};

function routeOf(city: string): number | null {
  return ROUTE_OF[city.trim().toLowerCase()] ?? null;
}

interface CitiesPanelProps {
  cities: CityCounts[];
  totals: Totals;
  visibleResorts: Resort[];
  selection: SelectionState;
  onToggleCity: (city: string) => void;
  onToggleResortCell: (city: string, resort: Resort) => void;
  onToggleMaster: () => void;
  transferCities: Set<string>;
  onToggleTransfer: (city: string) => void;
  onToggleAllTransfers: () => void;
}

export default function CitiesPanel({
  cities, totals, visibleResorts, selection,
  onToggleCity, onToggleResortCell, onToggleMaster,
  transferCities, onToggleTransfer, onToggleAllTransfers,
}: CitiesPanelProps) {
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null);

  const routeTotals = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of cities) {
      const r = routeOf(c.city);
      if (r != null) m.set(r, (m.get(r) ?? 0) + c.razem);
    }
    return m;
  }, [cities]);

  const allNames = useMemo(() => cities.map((c) => c.city), [cities]);
  const allCitiesSelected = allNames.length > 0 && allNames.every((c) => isCityFullySelected(selection, c));
  const allTransfersChecked = allNames.length > 0 && allNames.every((c) => transferCities.has(c));
  const resortColCount = visibleResorts.length;
  const colCount = 2 + resortColCount + 3; // przystanek + ⇄ + resorty + łącznie + trasa + nieprzyp

  if (cities.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400" data-testid="cities-empty">Brak miast — brak rezerwacji z transportem zbiorowym w tym kierunku.</p>;
  }

  return (
    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }} data-testid="cities-table">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-700 text-left text-[10px] font-semibold uppercase leading-tight text-white">
            <th className="border-r border-gray-500 px-2 py-2.5" style={{ width: '27%' }}>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={allCitiesSelected} onChange={onToggleMaster}
                  className="cursor-pointer rounded border-gray-300 text-[#00adee] focus:ring-[#00adee]"
                  aria-label="Zaznacz wszystkie miasta" data-testid="master-cities" />
                Przystanek
              </label>
            </th>
            <th className="border-r border-gray-500 px-1 py-2.5 text-center" style={{ width: '5%' }} title="Przesiadka">
              <input type="checkbox" checked={allTransfersChecked} onChange={onToggleAllTransfers}
                className="cursor-pointer rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                aria-label="Zaznacz wszystkie przesiadki" data-testid="master-transfers" />
            </th>
            {visibleResorts.map((r) => (
              <th key={r} className="border-r border-gray-500 px-1 py-2.5 text-center" style={{ width: '11%' }}>{RESORT_LABELS[r]}</th>
            ))}
            <th className="border-r border-gray-500 px-1 py-2.5 text-center" style={{ width: '11%' }}>Łącznie</th>
            <th className="border-r border-gray-500 px-1 py-2.5 text-center" style={{ width: '11%' }}>Trasa</th>
            <th className="px-1 py-2.5 text-center" style={{ width: '12%' }}>Nieprzyp.</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c) => {
            const route = routeOf(c.city);
            const colors = route != null ? ROUTE_BG[route] : null;
            const isActive = route != null && route === hoveredRoute;
            const bg = colors ? `${isActive ? colors.active : colors.base} ${colors.hover}` : '';
            const isTransfer = transferCities.has(c.city);
            return (
              <Fragment key={c.transport_city_id ?? c.city}>
                <tr className={`border-b border-gray-200 ${bg}`}>
                  <td className="border-r border-gray-200 px-2 py-2.5 font-medium text-gray-800" style={{ width: '28%' }}>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={isCityFullySelected(selection, c.city)}
                        onChange={() => onToggleCity(c.city)}
                        className="cursor-pointer rounded border-gray-300 text-[#00adee] focus:ring-[#00adee]"
                        aria-label={`Zaznacz ${c.city}`} data-testid={`city-${c.city}`} />
                      <span>{c.city}</span>
                    </label>
                  </td>
                  <td className="border-r border-gray-200 px-1 py-2.5 text-center" style={{ width: '6%' }}>
                    <input type="checkbox" checked={isTransfer} onChange={() => onToggleTransfer(c.city)}
                      className="cursor-pointer rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      aria-label={`Przesiadka ${c.city}`} />
                  </td>
                  {visibleResorts.map((r) => (
                    <td key={r} className="border-r border-gray-200 px-1 py-2.5 text-center text-gray-800" style={{ width: '11%' }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <input type="checkbox" checked={isResortCellSelected(selection, c.city, r)}
                          onChange={() => onToggleResortCell(c.city, r)}
                          className="cursor-pointer rounded border-gray-300 text-[#00adee] focus:ring-[#00adee]"
                          aria-label={`${RESORT_LABELS[r]} ${c.city}`} data-testid={`cell-${c.city}-${r}`} />
                        <span className="tabular-nums">{c[r]}</span>
                      </div>
                    </td>
                  ))}
                  <td className="border-r border-gray-200 px-2 py-2.5 text-center font-bold tabular-nums text-gray-800" style={{ width: '11%' }}>{c.razem}</td>
                  <td className="border-r border-gray-200 px-2 py-2.5 text-center font-bold tabular-nums text-gray-700" style={{ width: '11%' }}
                    onMouseEnter={() => setHoveredRoute(route)} onMouseLeave={() => setHoveredRoute(null)}>
                    {route != null ? routeTotals.get(route) : '–'}
                  </td>
                  <td className="px-2 py-2.5 text-center" style={{ width: '13%' }}>
                    <span className={`inline-block rounded-md px-3 py-1 text-xs font-bold text-white ${c.nieprzyp > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                      {c.nieprzyp}
                    </span>
                  </td>
                </tr>
                {isTransfer && (
                  <tr className="border-b border-orange-200 bg-orange-50 text-orange-800" data-testid="transfer-row">
                    <td className="px-2 py-1.5 text-xs italic" colSpan={colCount}>przesiadka {c.city}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-10">
          <tr className="border-t-2 border-gray-800 bg-gray-700 font-bold text-white">
            <td className="border-r border-gray-500 px-2 py-3" style={{ width: '28%' }}>SUMA</td>
            <td className="border-r border-gray-500 px-1 py-3" style={{ width: '6%' }} />
            {visibleResorts.map((r) => (
              <td key={r} className="border-r border-gray-500 px-1 py-3 text-center tabular-nums" style={{ width: '11%' }}>{totals[r]}</td>
            ))}
            <td className="border-r border-gray-500 px-2 py-3 text-center tabular-nums" style={{ width: '11%' }}>{totals.razem}</td>
            <td className="border-r border-gray-500 px-2 py-3 text-center" style={{ width: '11%' }}>-</td>
            <td className="px-2 py-3 text-center" style={{ width: '13%' }}>
              <span className={`inline-block rounded-md px-3 py-1 text-xs font-bold text-white ${totals.nieprzyp > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                {totals.nieprzyp}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
