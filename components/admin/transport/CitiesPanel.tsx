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
import { routeRowClasses } from '@/lib/utils/transportRouteColors';

interface Totals { razem: number; beaver: number; sawa: number; limba: number; nieprzyp: number; }

const RESORT_LABELS: Record<Resort, string> = { beaver: 'Beaver', sawa: 'Sawa', limba: 'Limba' };

// G02: destynacja (route_id) + kolor (route_color) pochodzą z BAZY (CityCounts), nie z hardcoded mapy.
// Mapowanie color_key -> klasy Tailwind: lib/utils/transportRouteColors (routeRowClasses, testowane).

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
      if (c.route_id != null) m.set(c.route_id, (m.get(c.route_id) ?? 0) + c.razem);
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
            const route = c.route_id;
            const isActive = route != null && route === hoveredRoute;
            const bg = routeRowClasses(c.route_color, isActive);
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
