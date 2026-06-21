'use client';

/**
 * G02 — Modal „Destynacje" (CRUD tras + kolorów). Film B2: „kolory dynamicznie pod destynację, zrób CRUD".
 * Admin sam: tworzy/edytuje/usuwa destynację, nadaje kolor z palety, przypisuje/odpina miasta sezonu.
 * Kolory i przypisania trzymane w bazie (transport_routes / transport_route_cities) — panel Miasta czyta je
 * przez CityCounts.route_color. onChanged() odświeża panel Miasta po zmianie.
 */
import { X, Plus, Trash2, Check } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import type { TransportRoute, RouteColorKey } from '@/lib/types/transportLists';
import {
  listRoutes, createRoute, updateRoute, deleteRoute,
  assignCityToRoute, unassignCityFromRoute,
} from '@/lib/services/transportListsApi';
import { ROUTE_PALETTE, ROUTE_COLOR_KEYS } from '@/lib/utils/transportRouteColors';
import { unassignedCities } from '@/lib/utils/transportRoutesHelpers';

interface Props {
  allCityNames: string[];   // nazwy miast bieżącego sezonu (do przypisywania)
  onClose: () => void;
  onChanged: () => void;    // reload panelu Miasta (kolory)
}

function ColorSwatch({ colorKey }: { colorKey: string }) {
  const cls = ROUTE_COLOR_KEYS.includes(colorKey as RouteColorKey)
    ? ROUTE_PALETTE[colorKey as RouteColorKey].base : 'bg-gray-100';
  return <span className={`inline-block h-4 w-4 rounded border border-gray-300 ${cls}`} />;
}

export default function RoutesManagerModal({ allCityNames, onClose, onChanged }: Props) {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<RouteColorKey>('blue');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRoutes(await listRoutes());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania destynacji');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd operacji');
    }
  }, [reload, onChanged]);

  const free = unassignedCities(allCityNames, routes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="routes-modal">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Destynacje (trasy i kolory)</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Zamknij">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && <div className="mx-5 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex-1 overflow-auto px-5 py-4">
          {/* DODAJ NOWĄ DESTYNACJĘ */}
          <div className="mb-4 flex items-end gap-2 rounded-md border border-dashed border-gray-300 p-3" data-testid="route-add-form">
            <label className="flex-1 text-xs font-medium text-gray-600">
              Nazwa destynacji
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="np. Pomorska" data-testid="route-new-name"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900" />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Kolor
              <select value={newColor} onChange={(e) => setNewColor(e.target.value as RouteColorKey)}
                data-testid="route-new-color"
                className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900">
                {ROUTE_COLOR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <ColorSwatch colorKey={newColor} />
            <button type="button" data-testid="route-add-btn"
              disabled={!newName.trim()}
              onClick={() => run(async () => { await createRoute({ name: newName.trim(), color_key: newColor }); setNewName(''); })}
              className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              <Plus className="h-4 w-4" /> Dodaj
            </button>
          </div>

          {loading && <p className="py-6 text-center text-sm text-gray-400">Ładowanie…</p>}

          {/* LISTA DESTYNACJI */}
          {!loading && routes.map((r) => (
            <RouteRow key={r.id} route={r} free={free} run={run} />
          ))}
          {!loading && routes.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">Brak destynacji — dodaj pierwszą powyżej.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteRow({ route, free, run }: {
  route: TransportRoute;
  free: string[];
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(route.name);
  const [color, setColor] = useState<RouteColorKey>(route.color_key);
  const [addCity, setAddCity] = useState('');
  const dirty = name.trim() !== route.name || color !== route.color_key;

  return (
    <div className="mb-3 rounded-md border border-gray-200 p-3" data-testid={`route-row-${route.id}`}>
      <div className="flex items-center gap-2">
        <ColorSwatch colorKey={color} />
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          data-testid={`route-name-${route.id}`}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium text-gray-900" />
        <select value={color} onChange={(e) => setColor(e.target.value as RouteColorKey)}
          data-testid={`route-color-${route.id}`}
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900">
          {ROUTE_COLOR_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <button type="button" disabled={!dirty || !name.trim()}
          onClick={() => run(() => updateRoute(route.id, { name: name.trim(), color_key: color }))}
          data-testid={`route-save-${route.id}`}
          className="flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
          title="Zapisz zmiany destynacji">
          <Check className="h-3.5 w-3.5" /> Zapisz
        </button>
        <button type="button" onClick={() => run(() => deleteRoute(route.id))}
          data-testid={`route-delete-${route.id}`}
          className="rounded p-1 text-red-600 hover:bg-red-50" title="Usuń destynację">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* MIASTA DESTYNACJI */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {route.cities.map((c) => (
          <span key={c} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            data-testid={`route-${route.id}-city-${c}`}>
            {c}
            <button type="button" onClick={() => run(() => unassignCityFromRoute(route.id, c))}
              className="rounded-full hover:bg-gray-300" title={`Odepnij ${c}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {route.cities.length === 0 && <span className="text-xs text-gray-400">brak miast</span>}

        <select value={addCity} onChange={(e) => setAddCity(e.target.value)}
          data-testid={`route-addcity-select-${route.id}`}
          className="rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700">
          <option value="">+ dodaj miasto…</option>
          {free.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" disabled={!addCity}
          onClick={() => run(async () => { await assignCityToRoute(route.id, addCity); setAddCity(''); })}
          data-testid={`route-addcity-btn-${route.id}`}
          className="rounded bg-gray-700 px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40">
          Dodaj
        </button>
      </div>
    </div>
  );
}
