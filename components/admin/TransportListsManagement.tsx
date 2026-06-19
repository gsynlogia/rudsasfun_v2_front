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
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Connection, Direction, CityCounts, ParticipantRow, Tabor } from '@/lib/types/transportLists';
import {
  listConnections, getConnectionCities, getConnectionParticipants, listTabors,
} from '@/lib/services/transportListsApi';

import CitiesPanel from './transport/CitiesPanel';
import ParticipantsPanel from './transport/ParticipantsPanel';
import TaborPanel from './transport/TaborPanel';

type PanelMode = 'numbers' | 'participants'; // toggle Cyfry / Uczestnicy (Nr 22)

export default function TransportListsManagement() {
  const [direction, setDirection] = useState<Direction>('arrival');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<number | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('numbers');
  const [cities, setCities] = useState<CityCounts[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [tabors, setTabors] = useState<Tabor[]>([]);
  const [transferCityIds, setTransferCityIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleTransfer = useCallback((cityId: number) => {
    setTransferCityIds((prev) => {
      const next = new Set(prev);
      if (next.has(cityId)) next.delete(cityId);
      else next.add(cityId);
      return next;
    });
  }, []);

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

  // Liczby per miasto dla aktywnego połączenia (zasilają widok Cyfry + widget ŁĄCZNIE)
  useEffect(() => {
    setTransferCityIds(new Set()); // przesiadki są per połączenie — reset przy zmianie
    if (activeConnectionId == null) {
      setCities([]);
      setParticipants([]);
      setTabors([]);
      return;
    }
    let cancelled = false;
    getConnectionCities(activeConnectionId)
      .then((data) => { if (!cancelled) setCities(data); })
      .catch(() => { if (!cancelled) setCities([]); });
    getConnectionParticipants(activeConnectionId)
      .then((data) => { if (!cancelled) setParticipants(data); })
      .catch(() => { if (!cancelled) setParticipants([]); });
    listTabors(activeConnectionId)
      .then((data) => { if (!cancelled) setTabors(data); })
      .catch(() => { if (!cancelled) setTabors([]); });
    return () => { cancelled = true; };
  }, [activeConnectionId]);

  // Lookup imion uczestników (reservation_id → „Nazwisko Imię") dla kart taborów.
  const participantNames = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of participants) {
      m.set(p.reservation_id, `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() || `#${p.reservation_id}`);
    }
    return m;
  }, [participants]);

  const totals = useMemo(() => cities.reduce(
    (acc, c) => ({
      razem: acc.razem + c.razem, beaver: acc.beaver + c.beaver,
      sawa: acc.sawa + c.sawa, limba: acc.limba + c.limba, nieprzyp: acc.nieprzyp + c.nieprzyp,
    }),
    { razem: 0, beaver: 0, sawa: 0, limba: 0, nieprzyp: 0 },
  ), [cities]);

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
            <CitiesPanel cities={cities} totals={totals}
              transferCityIds={transferCityIds} onToggleTransfer={toggleTransfer} />
          </Panel>
          <Panel title={panelMode === 'numbers' ? 'Cyfry' : 'Uczestnicy'}>
            {panelMode === 'numbers'
              ? <NumbersView totals={totals} />
              : <ParticipantsPanel participants={participants} />}
          </Panel>
          <Panel title="Tabor">
            <TaborPanel tabors={tabors} participantNames={participantNames} />
          </Panel>
        </div>
      )}

      {/* Widget „łącznie poza aplikacją" (F12/U11) — widoczny w trybie Uczestnicy */}
      {!loading && connections.length > 0 && panelMode === 'participants' && (
        <div className="fixed bottom-8 right-8 z-40 rounded-xl bg-sky-600 px-5 py-3 text-white shadow-lg"
          data-testid="total-widget">
          <div className="text-xs uppercase tracking-wide opacity-90">Łącznie</div>
          <div className="text-3xl font-bold leading-none">{totals.razem}</div>
        </div>
      )}
    </div>
  );
}

/** Widok „Cyfry" (Radek) — wielka liczba ŁĄCZNIE + rozbicie per resort + nieprzypisani. */
function NumbersView({ totals }: { totals: { razem: number; beaver: number; sawa: number; limba: number; nieprzyp: number } }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-wide text-gray-500">Łącznie uczestników</div>
        <div className="text-7xl font-bold text-sky-600" data-testid="total-numbers">{totals.razem}</div>
      </div>
      <div className="flex gap-3 text-sm">
        <ResortPill label="Beaver" value={totals.beaver} color="text-emerald-700 bg-emerald-50" />
        <ResortPill label="Sawa" value={totals.sawa} color="text-blue-700 bg-blue-50" />
        <ResortPill label="Limba" value={totals.limba} color="text-orange-700 bg-orange-50" />
      </div>
      <div className="text-sm text-gray-600">
        Nieprzypisani do taboru:{' '}
        <span className={`font-semibold ${totals.nieprzyp > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {totals.nieprzyp}
        </span>
      </div>
    </div>
  );
}

function ResortPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`rounded-md px-3 py-1.5 font-medium ${color}`}>{label}: {value}</span>
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
