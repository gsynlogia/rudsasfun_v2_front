'use client';

/**
 * Moduł „Listy transportowe" (Nr 21+) — główny widok admina.
 * Full HD, nieresponsywny (cały panel admina jest Full HD). Layout: górny pasek + pasek połączeń
 * (toggle kierunku Przyjazd/Powrót) + 3 strefy: Miasta | Uczestnicy | Tabor.
 * Panele wypełniane w kolejnych zadaniach (Nr 23-27). Tu: fundament layoutu + ładowanie połączeń.
 */
import {
  MapPin, Home, Plus, Users, Hash, GitCompare, ListChecks, Table2, Bus, AlertCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { Connection, Direction } from '@/lib/types/transportLists';
import { listConnections } from '@/lib/services/transportListsApi';

type PanelMode = 'numbers' | 'participants'; // toggle Cyfry / Uczestnicy (Nr 22)

export default function TransportListsManagement() {
  const [direction, setDirection] = useState<Direction>('arrival');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<number | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('numbers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listConnections(direction);
      setConnections(data);
      setActiveConnectionId((prev) =>
        prev && data.some((c) => c.id === prev) ? prev : (data[0]?.id ?? null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania połączeń');
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const activeConnection = connections.find((c) => c.id === activeConnectionId) ?? null;

  return (
    <div className="flex flex-col gap-3" style={{ minWidth: 1280 }}>
      {/* ---------- GÓRNY PASEK AKCJI ---------- */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <Bus className="h-6 w-6 text-sky-600" />
          <h1 className="text-xl font-semibold text-gray-900">Listy transportowe</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled
            className="flex items-center gap-1.5 rounded-md bg-violet-600/90 px-3 py-1.5 text-sm font-medium text-white opacity-60"
            title="Porównaj połączenia (wkrótce — Nr 35)">
            <GitCompare className="h-4 w-4" /> Porównaj
          </button>
          <button type="button" disabled
            className="flex items-center gap-1.5 rounded-md bg-blue-600/90 px-3 py-1.5 text-sm font-medium text-white opacity-60"
            title="Historia list (wkrótce — Nr 34)">
            <ListChecks className="h-4 w-4" /> Listy
          </button>
          <button type="button" disabled
            className="flex items-center gap-1.5 rounded-md bg-emerald-600/90 px-3 py-1.5 text-sm font-medium text-white opacity-60"
            title="Dodaj tabor (wkrótce — Nr 28)">
            <Plus className="h-4 w-4" /> Dodaj Tabor
          </button>
          {/* Toggle Cyfry / Uczestnicy (Nr 22) */}
          <div className="ml-2 flex overflow-hidden rounded-md border border-gray-300">
            <button type="button" onClick={() => setPanelMode('numbers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
                panelMode === 'numbers' ? 'bg-sky-600 text-white' : 'bg-white text-gray-700'}`}>
              <Hash className="h-4 w-4" /> Cyfry
            </button>
            <button type="button" onClick={() => setPanelMode('participants')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
                panelMode === 'participants' ? 'bg-sky-600 text-white' : 'bg-white text-gray-700'}`}>
              <Users className="h-4 w-4" /> Uczestnicy
            </button>
          </div>
          <button type="button" disabled
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 opacity-60"
            title="Konfiguracja kolumn (wkrótce — Nr 37)">
            <Table2 className="h-4 w-4" /> Tabela
          </button>
        </div>
      </div>

      {/* ---------- PASEK POŁĄCZEŃ + TOGGLE KIERUNKU ---------- */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {connections.map((c) => (
            <button key={c.id} type="button" onClick={() => setActiveConnectionId(c.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                c.id === activeConnectionId
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {c.name}{c.date ? ` · ${c.date}` : ''}
            </button>
          ))}
          <button type="button" disabled
            className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-400 px-3 py-1.5 text-sm font-medium text-gray-600 opacity-70"
            title="Dodaj kolejne połączenie (wkrótce — Nr 30)">
            <Plus className="h-4 w-4" /> Dodaj kolejne połączenie
          </button>
        </div>
        <div className="flex overflow-hidden rounded-md border border-gray-300">
          <button type="button" onClick={() => setDirection('arrival')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              direction === 'arrival' ? 'bg-sky-600 text-white' : 'bg-white text-gray-700'}`}>
            <MapPin className="h-4 w-4" /> Przyjazd do ośrodka
          </button>
          <button type="button" onClick={() => setDirection('return')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              direction === 'return' ? 'bg-sky-600 text-white' : 'bg-white text-gray-700'}`}>
            <Home className="h-4 w-4" /> Powrót z ośrodka
          </button>
        </div>
      </div>

      {/* ---------- STANY ---------- */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {loading && <div className="py-10 text-center text-gray-500">Ładowanie połączeń…</div>}

      {!loading && connections.length === 0 && (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
          <Bus className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-gray-600">
            Brak połączeń dla kierunku „{direction === 'arrival' ? 'Przyjazd' : 'Powrót'}".
          </p>
          <p className="mt-1 text-sm text-gray-500">Dodaj pierwsze połączenie, aby zacząć układać listy.</p>
        </div>
      )}

      {/* ---------- 3 STREFY (Full HD) ---------- */}
      {!loading && connections.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: '380px 1fr 420px' }}>
          <Panel title="Miasta">
            <PlaceholderZone label="Tabela miast + liczby per resort (Nr 23-24)"
              hint={activeConnection ? `Połączenie: ${activeConnection.name}` : undefined} />
          </Panel>
          <Panel title={panelMode === 'numbers' ? 'Cyfry' : 'Uczestnicy'}>
            <PlaceholderZone label="Lista uczestników / agregaty (Nr 25-26)" />
          </Panel>
          <Panel title="Tabor">
            <PlaceholderZone label="Karty taborów + wsadzanie (Nr 27-29)" />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{title}</h2>
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

function PlaceholderZone({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
      <p className="text-sm">{label}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
