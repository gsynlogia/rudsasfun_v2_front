'use client';

/**
 * Panel LEWY „Miasta" (Nr 23-24) — tabela przystanków z liczbami per resort + agregaty.
 * Nr 23: kolumny PRZYSTANEK | [Beaver|Sawa|Limba] | ŁĄCZNIE | NIEPRZYP + stopka SUMA.
 * Nr 24: kolory tras (§6.2), kolumna TRASA (suma destynacji) + hover-podświetlenie trasy,
 *        checkbox przesiadka (pomarańczowy) → dodatkowy wiersz „przesiadka <miasto>".
 */
import { Fragment, useMemo, useState } from 'react';

import type { CityCounts } from '@/lib/types/transportLists';

interface Totals { razem: number; beaver: number; sawa: number; limba: number; nieprzyp: number; }

const RESORTS = [
  { key: 'beaver' as const, label: 'Beaver' },
  { key: 'sawa' as const, label: 'Sawa' },
  { key: 'limba' as const, label: 'Limba' },
];

// Trasy/destynacje + kolory tła (lista_transportowa §6.2). Klucz = nazwa miasta (lower, bez ogonków nie trzeba — exact PL).
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
const ROUTE_BG: Record<number, string> = {
  1: 'bg-blue-50', 2: 'bg-orange-50', 3: 'bg-green-50', 4: 'bg-gray-100', 5: 'bg-red-50',
  6: 'bg-yellow-50', 7: 'bg-teal-50', 8: 'bg-pink-50', 9: 'bg-indigo-50', 10: 'bg-sky-50',
  11: 'bg-violet-50', 12: 'bg-purple-50',
};

function routeOf(city: string): number | null {
  return ROUTE_OF[city.trim().toLowerCase()] ?? null;
}

interface CitiesPanelProps {
  cities: CityCounts[];
  totals: Totals;
  transferCityIds: Set<number>;
  onToggleTransfer: (cityId: number) => void;
}

export default function CitiesPanel({ cities, totals, transferCityIds, onToggleTransfer }: CitiesPanelProps) {
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null);

  const anyResort = totals.beaver > 0 || totals.sawa > 0 || totals.limba > 0;
  const visibleResorts = anyResort ? RESORTS.filter((r) => totals[r.key] > 0) : RESORTS;

  // TRASA = suma ŁĄCZNIE wszystkich miast tej samej trasy (Nr 24).
  const routeTotals = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of cities) {
      const r = routeOf(c.city);
      if (r != null) m.set(r, (m.get(r) ?? 0) + c.razem);
    }
    return m;
  }, [cities]);

  if (cities.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Brak miast dla tego połączenia.</p>;
  }

  const colCount = 3 + visibleResorts.length + 2; // przes. + przystanek + resorty + łącznie + trasa + nieprzyp

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="cities-table">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-1 py-2 text-orange-600" title="Przesiadka">⇄</th>
            <th className="px-2 py-2">Przystanek</th>
            {visibleResorts.map((r) => <th key={r.key} className="px-2 py-2 text-right">{r.label}</th>)}
            <th className="px-2 py-2 text-right">Łącznie</th>
            <th className="px-2 py-2 text-right">Trasa</th>
            <th className="px-2 py-2 text-right">Nieprzyp.</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c) => {
            const route = routeOf(c.city);
            const bg = route != null ? ROUTE_BG[route] : '';
            const highlight = route != null && route === hoveredRoute ? 'ring-2 ring-inset ring-sky-400' : '';
            const cid = c.transport_city_id;
            const isTransfer = cid != null && transferCityIds.has(cid);
            return (
              <Fragment key={cid ?? c.city}>
                <tr className={`border-b border-gray-50 ${bg} ${highlight}`}>
                  <td className="px-1 py-1.5 text-center">
                    <input type="checkbox" className="accent-orange-500"
                      checked={isTransfer} disabled={cid == null}
                      onChange={() => cid != null && onToggleTransfer(cid)}
                      aria-label={`Przesiadka ${c.city}`} />
                  </td>
                  <td className="px-2 py-1.5 font-medium text-gray-800">{c.city}</td>
                  {visibleResorts.map((r) => (
                    <td key={r.key} className="px-2 py-1.5 text-right tabular-nums text-gray-700">{c[r.key]}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-sky-700">{c.razem}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-600"
                    onMouseEnter={() => setHoveredRoute(route)} onMouseLeave={() => setHoveredRoute(null)}>
                    {route != null ? routeTotals.get(route) : '–'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`inline-block min-w-[28px] rounded px-1.5 py-0.5 text-xs font-semibold ${
                      c.nieprzyp > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {c.nieprzyp}
                    </span>
                  </td>
                </tr>
                {isTransfer && (
                  <tr className="border-b border-orange-100 bg-orange-50 text-orange-800"
                    data-testid="transfer-row">
                    <td className="px-1 py-1 text-center text-orange-500">⇄</td>
                    <td className="px-2 py-1 text-xs italic" colSpan={colCount - 1}>przesiadka {c.city}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 font-semibold text-gray-900">
            <td />
            <td className="px-2 py-2">SUMA</td>
            {visibleResorts.map((r) => (
              <td key={r.key} className="px-2 py-2 text-right tabular-nums">{totals[r.key]}</td>
            ))}
            <td className="px-2 py-2 text-right tabular-nums text-sky-700">{totals.razem}</td>
            <td className="px-2 py-2" />
            <td className="px-2 py-2 text-right tabular-nums">{totals.nieprzyp}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
