'use client';

/**
 * Moduł „Listy transportowe" (Nr 21+) — główny widok admina.
 * Full HD, nieresponsywny (cały panel admina jest Full HD). Layout: górny pasek + pasek połączeń
 * (toggle kierunku Przyjazd/Powrót) + 3 strefy: Miasta | Uczestnicy | Tabor.
 * Panele wypełniane w kolejnych zadaniach (Nr 23-27). Tu: fundament layoutu + ładowanie połączeń.
 */
import {
  MapPin, Home, Plus, Users, Hash, GitCompare, ListChecks, Table2, Bus, AlertCircle, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Connection, Direction, CityCounts, ParticipantRow, Tabor } from '@/lib/types/transportLists';
import {
  listConnections, getConnectionCities, getConnectionParticipants, listTabors, assignParticipant, deleteTabor,
  deleteConnection,
} from '@/lib/services/transportListsApi';

import AddConnectionModal from './transport/AddConnectionModal';
import AddTaborModal from './transport/AddTaborModal';
import CitiesPanel from './transport/CitiesPanel';
import DeleteTaborModal from './transport/DeleteTaborModal';
import ParticipantsPanel from './transport/ParticipantsPanel';
import TaborOverflowModal from './transport/TaborOverflowModal';
import TaborPanel from './transport/TaborPanel';
import TransportDocumentModal from './transport/TransportDocumentModal';

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
  const [taborModalOpen, setTaborModalOpen] = useState(false);
  const [editingTabor, setEditingTabor] = useState<Tabor | null>(null);
  const [openTaborId, setOpenTaborId] = useState<number | null>(null); // tabor przyjmujący uczestników (Nr 26)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set()); // zaznaczeni uczestnicy do wsadzenia
  const [reloadKey, setReloadKey] = useState(0); // wymusza re-fetch kart taborów (capacity/uczestnicy) po wsadzeniu
  const [deleteTarget, setDeleteTarget] = useState<Tabor | null>(null); // tabor do usunięcia (Nr 29)
  const [overflowInfo, setOverflowInfo] = useState<{ capacity?: number; occupied?: number } | null>(null);
  const [connModalOpen, setConnModalOpen] = useState(false); // modal Dodaj połączenie (Nr 30)
  const [deleteConnTarget, setDeleteConnTarget] = useState<Connection | null>(null);
  const [documentTabor, setDocumentTabor] = useState<Tabor | null>(null); // modal Wypuść listę (Nr 31-33)
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

  // Wspólny reload danych aktywnego połączenia (miasta + uczestnicy + tabory) — używany po wsadzaniu/edycji.
  const reloadData = useCallback(async () => {
    if (activeConnectionId == null) {
      setCities([]); setParticipants([]); setTabors([]);
      return;
    }
    const [c, p, t] = await Promise.all([
      getConnectionCities(activeConnectionId).catch(() => [] as CityCounts[]),
      getConnectionParticipants(activeConnectionId).catch(() => [] as ParticipantRow[]),
      listTabors(activeConnectionId).catch(() => [] as Tabor[]),
    ]);
    setCities(c); setParticipants(p); setTabors(t);
    setReloadKey((k) => k + 1); // odśwież karty taborów (occupied/uczestnicy)
  }, [activeConnectionId]);

  useEffect(() => {
    setTransferCityIds(new Set());  // stan per połączenie — reset przy zmianie
    setOpenTaborId(null);
    setSelectedIds(new Set());
    void reloadData();
  }, [reloadData]);

  const toggleSelect = useCallback((rid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
  }, []);

  // Wsadź uczestników do otwartego taboru (Nr 26): assign każdego + reload. Overflow → modal (Nr 29).
  const assignToOpenTabor = useCallback(async (rids: number[]) => {
    if (openTaborId == null || rids.length === 0) return;
    let overflow: { capacity?: number; occupied?: number } | null = null;
    for (const rid of rids) {
      const r = await assignParticipant(openTaborId, rid);
      if (r.overflow) { overflow = { capacity: r.capacity, occupied: r.occupied }; break; }
    }
    setSelectedIds(new Set());
    await reloadData();
    if (overflow) setOverflowInfo(overflow);
  }, [openTaborId, reloadData]);

  // Wsadzenie pojedynczego uczestnika przez drag&drop na kartę taboru.
  const dropAssign = useCallback(async (taborId: number, rid: number) => {
    const r = await assignParticipant(taborId, rid);
    await reloadData();
    if (r.overflow) setOverflowInfo({ capacity: r.capacity, occupied: r.occupied });
  }, [reloadData]);

  // Usuń tabor (Nr 29): po potwierdzeniu — deleteTabor + reload + zamknij otwarty jeśli usunięto.
  const confirmDeleteTabor = useCallback(async () => {
    if (deleteTarget == null) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteTabor(id);
    if (openTaborId === id) setOpenTaborId(null);
    await reloadData();
  }, [deleteTarget, openTaborId, reloadData]);

  // Nowe połączenie utworzone (Nr 30): odśwież listę i aktywuj (przełącz kierunek jeśli inny niż bieżący).
  const handleConnectionCreated = useCallback(async (conn: Connection) => {
    if (conn.direction === direction) {
      await loadConnections();
      setActiveConnectionId(conn.id);
    } else {
      setDirection(conn.direction); // useEffect przeładuje listę nowego kierunku
    }
  }, [direction, loadConnections]);

  // Usuń połączenie (Nr 30): CASCADE usuwa tabory + przypisania; lista i aktywne się odświeżają.
  const confirmDeleteConnection = useCallback(async () => {
    if (deleteConnTarget == null) return;
    const id = deleteConnTarget.id;
    setDeleteConnTarget(null);
    await deleteConnection(id);
    if (activeConnectionId === id) setActiveConnectionId(null);
    await loadConnections();
  }, [deleteConnTarget, activeConnectionId, loadConnections]);

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
          <button type="button" disabled={activeConnectionId == null}
            onClick={() => { setEditingTabor(null); setTaborModalOpen(true); }}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            title="Dodaj tabor">
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
            <span key={c.id}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                c.id === activeConnectionId ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <button type="button" onClick={() => setActiveConnectionId(c.id)}>
                {c.name}{c.date ? ` · ${c.date}` : ''}
              </button>
              <button type="button" title="Usuń połączenie" data-testid="connection-delete"
                onClick={() => setDeleteConnTarget(c)}
                className={`ml-0.5 rounded ${c.id === activeConnectionId ? 'hover:bg-white/20' : 'hover:bg-gray-300'}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => setConnModalOpen(true)} data-testid="add-connection"
            className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-400 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            title="Dodaj kolejne połączenie">
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
              : <ParticipantsPanel participants={participants}
                  assignMode={openTaborId != null} selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onAssignSelected={() => void assignToOpenTabor([...selectedIds])} />}
          </Panel>
          <Panel title="Tabor">
            <TaborPanel tabors={tabors} participantNames={participantNames} reloadKey={reloadKey}
              openTaborId={openTaborId}
              onOpenTabor={(id) => { setOpenTaborId(id); setPanelMode('participants'); }}
              onDropAssign={(taborId, rid) => void dropAssign(taborId, rid)}
              onEdit={(t) => { setEditingTabor(t); setTaborModalOpen(true); }}
              onDelete={(t) => setDeleteTarget(t)}
              onDocument={(t) => setDocumentTabor(t)} />
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

      {taborModalOpen && activeConnectionId != null && (
        <AddTaborModal connectionId={activeConnectionId} tabor={editingTabor}
          onClose={() => setTaborModalOpen(false)} onSaved={reloadData} />
      )}
      {deleteTarget && (
        <DeleteTaborModal
          taborLabel={`${deleteTarget.name ?? deleteTarget.type}${deleteTarget.number ? ` #${deleteTarget.number}` : ''}`}
          onConfirm={() => void confirmDeleteTabor()} onClose={() => setDeleteTarget(null)} />
      )}
      {overflowInfo && (
        <TaborOverflowModal capacity={overflowInfo.capacity} occupied={overflowInfo.occupied}
          onClose={() => setOverflowInfo(null)} />
      )}
      {connModalOpen && (
        <AddConnectionModal defaultDirection={direction}
          onClose={() => setConnModalOpen(false)} onCreated={(c) => void handleConnectionCreated(c)} />
      )}
      {documentTabor && (
        <TransportDocumentModal taborId={documentTabor.id} direction={direction}
          onClose={() => setDocumentTabor(null)} onApproved={() => void reloadData()} />
      )}
      {deleteConnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="delete-connection-modal">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-red-700">Usuń połączenie</h3>
            <p className="text-sm text-gray-700">
              Czy na pewno usunąć połączenie <span className="font-semibold">{deleteConnTarget.name}</span>?
            </p>
            <p className="mt-2 text-sm text-gray-500">Usunięte zostaną też tabory i przypisania tego połączenia. Wypuszczone listy zostają.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteConnTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm">Anuluj</button>
              <button type="button" onClick={() => void confirmDeleteConnection()} data-testid="delete-connection-confirm"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">Usuń połączenie</button>
            </div>
          </div>
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
