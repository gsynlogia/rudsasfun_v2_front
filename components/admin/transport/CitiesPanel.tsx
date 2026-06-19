'use client';

/**
 * Panel LEWY „Miasta" (Nr 23) — tabela przystanków z liczbami per resort + agregaty.
 * Kolumny: PRZYSTANEK | [Beaver|Sawa|Limba — tylko obecne] | ŁĄCZNIE | NIEPRZYP. Stopka SUMA.
 * Wzór: CitiesTransportTable (makieta). Przesiadki + kolory tras + hover trasa = Nr 24.
 */
import type { CityCounts } from '@/lib/types/transportLists';

interface Totals {
  razem: number; beaver: number; sawa: number; limba: number; nieprzyp: number;
}

const RESORTS = [
  { key: 'beaver' as const, label: 'Beaver' },
  { key: 'sawa' as const, label: 'Sawa' },
  { key: 'limba' as const, label: 'Limba' },
];

export default function CitiesPanel({ cities, totals }: { cities: CityCounts[]; totals: Totals }) {
  // Kolumny resortów: pokazuj tylko te z liczbą > 0 (gdy wszystkie 0 — pokaż wszystkie, U5).
  const anyResort = totals.beaver > 0 || totals.sawa > 0 || totals.limba > 0;
  const visibleResorts = anyResort ? RESORTS.filter((r) => totals[r.key] > 0) : RESORTS;

  if (cities.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Brak miast dla tego połączenia.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="cities-table">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-2 py-2">Przystanek</th>
            {visibleResorts.map((r) => <th key={r.key} className="px-2 py-2 text-right">{r.label}</th>)}
            <th className="px-2 py-2 text-right">Łącznie</th>
            <th className="px-2 py-2 text-right">Nieprzyp.</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((c) => (
            <tr key={c.transport_city_id ?? c.city} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-2 py-1.5 font-medium text-gray-800">{c.city}</td>
              {visibleResorts.map((r) => (
                <td key={r.key} className="px-2 py-1.5 text-right tabular-nums text-gray-700">{c[r.key]}</td>
              ))}
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-sky-700">{c.razem}</td>
              <td className="px-2 py-1.5 text-right">
                <span className={`inline-block min-w-[28px] rounded px-1.5 py-0.5 text-xs font-semibold ${
                  c.nieprzyp > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {c.nieprzyp}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 font-semibold text-gray-900">
            <td className="px-2 py-2">SUMA</td>
            {visibleResorts.map((r) => (
              <td key={r.key} className="px-2 py-2 text-right tabular-nums">{totals[r.key]}</td>
            ))}
            <td className="px-2 py-2 text-right tabular-nums text-sky-700">{totals.razem}</td>
            <td className="px-2 py-2 text-right tabular-nums">{totals.nieprzyp}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
