'use client';

/**
 * Moduł „Listy transportowe" — główny widok admina (1:1 z makietą Figma, dane realne z bazy).
 * AUTOMATYZACJA (rozkaz Pana 2026-06-19): po wejściu tabela Miast wypełniona OD RAZU danymi CAŁEGO
 * sezonu (wszystkie niezarchiwizowane turnusy) — bez ręcznego „Dodaj połączenie". Po wybraniu połączenia
 * dane zawężają się do jego turnusów (fundament taborów/list zostaje). Zaznaczanie miast/resortów filtruje
 * panel Uczestnicy (pusty gdy nic nie zaznaczone). Layout: pasek akcji + pasek połączeń (kierunek) + 3 strefy.
 */
import {
  MapPin, Home, Plus, Users, Hash, GitCompare, ListChecks, Table2, Bus, AlertCircle, X, UserX, Trash2,
  Palette,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  Connection, Direction, CityCounts, ParticipantRow, Tabor, OrphanedAssignment,
} from '@/lib/types/transportLists';
import {
  listConnections, getConnectionCities, getConnectionParticipants, listTabors, assignParticipant, deleteTabor,
  deleteConnection, setEarlyLeave, getEarlyLeaveStats, getSeasonCities, getSeasonParticipants,
  getOrphanedAssignments, autoCleanupOrphaned, removeParticipant,
} from '@/lib/services/transportListsApi';
import {
  type Resort, type SelectionState, emptySelection, toggleCity, toggleResortCell, toggleMaster,
  hasAnySelection, calculateSelectedTotal, isParticipantSelected, isTransferParticipant, toggleColumnKey,
} from '@/lib/utils/transportSelection';

import AddConnectionModal from './transport/AddConnectionModal';
import AddTaborModal from './transport/AddTaborModal';
import CitiesPanel from './transport/CitiesPanel';
import DeleteTaborModal from './transport/DeleteTaborModal';
import ParticipantsPanel, { PARTICIPANT_COLUMN_META, DEFAULT_VISIBLE_COLUMNS } from './transport/ParticipantsPanel';
import TaborOverflowModal from './transport/TaborOverflowModal';
import TaborPanel from './transport/TaborPanel';
import TransportCompareModal from './transport/TransportCompareModal';
import TransportDocumentModal from './transport/TransportDocumentModal';
import TransportListsModal from './transport/TransportListsModal';
import RoutesManagerModal from './transport/RoutesManagerModal';

type PanelMode = 'numbers' | 'participants'; // toggle Cyfry / Uczestnicy
const ALL_RESORTS: Resort[] = ['beaver', 'sawa', 'limba'];

export default function TransportListsManagement() {
  const [direction, setDirection] = useState<Direction>('arrival');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<number | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('numbers');
  const [cities, setCities] = useState<CityCounts[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [tabors, setTabors] = useState<Tabor[]>([]);
  const [orphaned, setOrphaned] = useState<OrphanedAssignment[]>([]);                // G04: kto wypadł z taboru (zatwierdzone — ręcznie)
  const [autoRemovedCount, setAutoRemovedCount] = useState(0);                       // Nr 17 AUTO: ilu auto-usunięto z roboczych
  const [selection, setSelection] = useState<SelectionState>(emptySelection());     // zaznaczone miasta/resorty
  const [transferCities, setTransferCities] = useState<Set<string>>(new Set());      // przesiadki (po nazwie)
  const [taborModalOpen, setTaborModalOpen] = useState(false);
  const [editingTabor, setEditingTabor] = useState<Tabor | null>(null);
  const [openTaborId, setOpenTaborId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Tabor | null>(null);
  const [overflowInfo, setOverflowInfo] = useState<{ capacity?: number; occupied?: number } | null>(null);
  const [connModalOpen, setConnModalOpen] = useState(false);
  const [deleteConnTarget, setDeleteConnTarget] = useState<Connection | null>(null);
  const [documentTabor, setDocumentTabor] = useState<Tabor | null>(null);
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [earlyLeaveTarget, setEarlyLeaveTarget] = useState<number | null>(null);
  const [earlyLeaveNote, setEarlyLeaveNote] = useState('');
  const [earlyLeaveCount, setEarlyLeaveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);  // „Tabela"
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [routesModalOpen, setRoutesModalOpen] = useState(false);                            // G02: CRUD destynacji

  // „Tabela": konfiguracja widocznych kolumn zapamiętana w localStorage (film: „widoki na poziomie local storage").
  useEffect(() => {
    try {
      const saved = localStorage.getItem('transport_participant_columns');
      const arr = saved ? JSON.parse(saved) : null;
      if (Array.isArray(arr) && arr.length) setVisibleColumns(arr);
    } catch { /* brak/uszkodzony localStorage → domyślne */ }
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((cur) => {
      const next = toggleColumnKey(cur, key);
      const safe = next.length ? next : cur;   // nie pozwól ukryć wszystkich kolumn
      try { localStorage.setItem('transport_participant_columns', JSON.stringify(safe)); } catch { /* ignore */ }
      return safe;
    });
  }, []);

  const loadConnections = useCallback(async () => {
    setError(null);
    try {
      const data = await listConnections(direction);
      setConnections(data);
      setActiveConnectionId((prev) => (prev && data.some((c) => c.id === prev) ? prev : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania połączeń');
    }
  }, [direction]);

  useEffect(() => { void loadConnections(); }, [loadConnections]);

  // Reload danych aktywnego źródła: SEZON (auto z bazy) gdy brak połączenia, inaczej dane połączenia.
  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeConnectionId == null) {
        const [c, p] = await Promise.all([
          getSeasonCities(direction).catch(() => [] as CityCounts[]),
          getSeasonParticipants(direction).catch(() => [] as ParticipantRow[]),
        ]);
        setCities(c); setParticipants(p); setTabors([]); setOrphaned([]); setAutoRemovedCount(0);
      } else {
        // Nr 17 AUTO: najpierw automatyczne wypadanie z taborów ROBOCZYCH (bezpiecznik: zatwierdzone listy
        // nietknięte). Dopiero potem dane — orphaned z odczytu = już tylko zatwierdzone (do ręcznej decyzji).
        const cleanup = await autoCleanupOrphaned(activeConnectionId).catch(
          () => ({ removed: [] as OrphanedAssignment[], kept_locked: [] as OrphanedAssignment[] }));
        const [c, p, t, o] = await Promise.all([
          getConnectionCities(activeConnectionId).catch(() => [] as CityCounts[]),
          getConnectionParticipants(activeConnectionId).catch(() => [] as ParticipantRow[]),
          listTabors(activeConnectionId).catch(() => [] as Tabor[]),
          getOrphanedAssignments(activeConnectionId).catch(() => [] as OrphanedAssignment[]),
        ]);
        setCities(c); setParticipants(p); setTabors(t); setOrphaned(o);
        setAutoRemovedCount(cleanup.removed.length);
      }
      setReloadKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, direction]);

  useEffect(() => {
    setTransferCities(new Set());
    setSelection(emptySelection());
    setOpenTaborId(null);
    setSelectedIds(new Set());
    void reloadData();
  }, [reloadData]);

  // ---------- agregaty + zaznaczanie ----------
  const totals = useMemo(() => cities.reduce(
    (acc, c) => ({
      razem: acc.razem + c.razem, beaver: acc.beaver + c.beaver,
      sawa: acc.sawa + c.sawa, limba: acc.limba + c.limba, nieprzyp: acc.nieprzyp + c.nieprzyp,
    }),
    { razem: 0, beaver: 0, sawa: 0, limba: 0, nieprzyp: 0 },
  ), [cities]);

  const visibleResorts = useMemo(() => ALL_RESORTS.filter((r) => totals[r] > 0), [totals]);
  const allCityNames = useMemo(() => cities.map((c) => c.city), [cities]);
  const hasSelection = hasAnySelection(selection);
  const selectedTotal = useMemo(() => calculateSelectedTotal(selection, cities), [selection, cities]);
  const assignMode = openTaborId != null;

  // Uczestnicy panelu: w trybie taboru — wszyscy (do wsadzania); inaczej — przefiltrowani do zaznaczenia.
  const displayedParticipants = useMemo(() => {
    if (assignMode) return participants;
    if (!hasSelection) return [];
    return participants.filter((p) => isParticipantSelected(selection, p.city, p.region));
  }, [assignMode, hasSelection, participants, selection]);

  const onToggleCity = useCallback((city: string) => setSelection((s) => toggleCity(s, city)), []);
  const onToggleResortCell = useCallback(
    (city: string, resort: Resort) => setSelection((s) => toggleResortCell(s, city, resort, visibleResorts)),
    [visibleResorts]);
  const onToggleMaster = useCallback(() => setSelection((s) => toggleMaster(s, allCityNames)), [allCityNames]);

  const onToggleTransfer = useCallback((city: string) => {
    setTransferCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city); else next.add(city);
      return next;
    });
  }, []);
  const onToggleAllTransfers = useCallback(() => {
    setTransferCities((prev) => {
      const allChecked = allCityNames.length > 0 && allCityNames.every((c) => prev.has(c));
      return allChecked ? new Set() : new Set(allCityNames);
    });
  }, [allCityNames]);

  // ---------- tabor / wsadzanie (fundament — bez zmian zachowania) ----------
  const toggleSelect = useCallback((rid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid); else next.add(rid);
      return next;
    });
  }, []);

  // G01 (film E2): mapa rezerwacja → przystanek, by ustalić przesiadkowość przy wsadzaniu do taboru.
  const participantCityById = useMemo(() => {
    const m = new Map<number, string | null>();
    for (const p of participants) m.set(p.reservation_id, p.city ?? null);
    return m;
  }, [participants]);

  const assignToOpenTabor = useCallback(async (rids: number[]) => {
    if (openTaborId == null || rids.length === 0) return;
    let overflow: { capacity?: number; occupied?: number } | null = null;
    for (const rid of rids) {
      const transfer = isTransferParticipant(participantCityById.get(rid) ?? null, transferCities);
      const r = await assignParticipant(openTaborId, rid, transfer);
      if (r.overflow) { overflow = { capacity: r.capacity, occupied: r.occupied }; break; }
    }
    setSelectedIds(new Set());
    await reloadData();
    if (overflow) setOverflowInfo(overflow);
  }, [openTaborId, reloadData, participantCityById, transferCities]);

  const dropAssign = useCallback(async (taborId: number, rid: number) => {
    const transfer = isTransferParticipant(participantCityById.get(rid) ?? null, transferCities);
    const r = await assignParticipant(taborId, rid, transfer);
    await reloadData();
    if (r.overflow) setOverflowInfo({ capacity: r.capacity, occupied: r.occupied });
  }, [reloadData, participantCityById, transferCities]);

  // Wspólny dla G04 (usuń wypadniętego z listy orphaned) i G06 (wyjmij uczestnika z taboru).
  const handleRemoveParticipant = useCallback(async (participantId: number) => {
    await removeParticipant(participantId);
    await reloadData();
  }, [reloadData]);

  const confirmDeleteTabor = useCallback(async () => {
    if (deleteTarget == null) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteTabor(id);
    if (openTaborId === id) setOpenTaborId(null);
    await reloadData();
  }, [deleteTarget, openTaborId, reloadData]);

  const handleConnectionCreated = useCallback(async (conn: Connection) => {
    if (conn.direction === direction) {
      await loadConnections();
      setActiveConnectionId(conn.id);
    } else {
      setDirection(conn.direction);
    }
  }, [direction, loadConnections]);

  useEffect(() => {
    getEarlyLeaveStats().then((s) => setEarlyLeaveCount(s.early_leave_count)).catch(() => {});
  }, [reloadKey]);

  const markEarlyLeave = useCallback(async () => {
    if (earlyLeaveTarget == null) return;
    const rid = earlyLeaveTarget;
    const note = earlyLeaveNote;
    setEarlyLeaveTarget(null);
    setEarlyLeaveNote('');
    await setEarlyLeave(rid, true, note || undefined);
    await reloadData();
  }, [earlyLeaveTarget, earlyLeaveNote, reloadData]);

  const confirmDeleteConnection = useCallback(async () => {
    if (deleteConnTarget == null) return;
    const id = deleteConnTarget.id;
    setDeleteConnTarget(null);
    await deleteConnection(id);
    if (activeConnectionId === id) setActiveConnectionId(null);
    await loadConnections();
  }, [deleteConnTarget, activeConnectionId, loadConnections]);

  const participantNames = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of participants) {
      m.set(p.reservation_id, `${p.last_name ?? ''} ${p.first_name ?? ''}`.trim() || `#${p.reservation_id}`);
    }
    return m;
  }, [participants]);

  const middleTitle = assignMode || panelMode === 'participants' ? 'Uczestnicy' : 'Cyfry';

  return (
    <div className="flex flex-col gap-3" style={{ minWidth: 1280 }}>
      {/* ---------- GÓRNY PASEK AKCJI ---------- */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <Bus className="h-6 w-6 text-sky-600" />
          <h1 className="text-xl font-semibold text-gray-900">Listy transportowe</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCompareOpen(true)} data-testid="open-compare"
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white"
            title="Porównaj połączenia">
            <GitCompare className="h-4 w-4" /> Porównaj
          </button>
          <button type="button" onClick={() => setListsModalOpen(true)} data-testid="open-lists"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            title="Historia wypuszczonych list">
            <ListChecks className="h-4 w-4" /> Listy
          </button>
          <button type="button" disabled={activeConnectionId == null}
            onClick={() => { setEditingTabor(null); setTaborModalOpen(true); }}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            title={activeConnectionId == null ? 'Najpierw wybierz/dodaj połączenie' : 'Dodaj tabor'}>
            <Plus className="h-4 w-4" /> Dodaj Tabor
          </button>
          {/* Toggle Cyfry / Uczestnicy — switch 1:1 z makietą (Cyfry ⬤ Uczestnicy) */}
          <div className="ml-2 flex items-center gap-2">
            <button type="button" onClick={() => setPanelMode('numbers')} data-testid="mode-numbers"
              className={`flex items-center gap-1 text-sm font-medium ${
                panelMode === 'numbers' ? 'text-[#00adee]' : 'text-gray-500'}`}>
              <Hash className="h-4 w-4" /> Cyfry
            </button>
            <label className="relative inline-flex cursor-pointer items-center" title="Przełącz Cyfry / Uczestnicy">
              <input type="checkbox" className="peer sr-only" data-testid="mode-switch"
                checked={panelMode === 'participants'}
                onChange={(e) => setPanelMode(e.target.checked ? 'participants' : 'numbers')} />
              <div className="h-7 w-14 rounded-full bg-gray-200 transition-colors peer-checked:bg-[#00adee] after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-7" />
            </label>
            <button type="button" onClick={() => setPanelMode('participants')} data-testid="mode-participants"
              className={`flex items-center gap-1 text-sm font-medium ${
                panelMode === 'participants' ? 'text-[#00adee]' : 'text-gray-500'}`}>
              <Users className="h-4 w-4" /> Uczestnicy
            </button>
          </div>
          <button type="button" onClick={() => setRoutesModalOpen(true)} data-testid="open-routes"
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Destynacje — trasy i kolory miast (CRUD)">
            <Palette className="h-4 w-4" /> Destynacje
          </button>
          <button type="button" onClick={() => setColumnsModalOpen(true)} data-testid="open-columns"
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Konfiguracja widocznych kolumn">
            <Table2 className="h-4 w-4" /> Tabela
          </button>
        </div>
      </div>

      {/* ---------- PASEK POŁĄCZEŃ + TOGGLE KIERUNKU ---------- */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActiveConnectionId(null)} data-testid="season-tab"
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
              activeConnectionId == null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            title="Cały sezon — wszystkie aktywne turnusy">
            Cały sezon
          </button>
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
            title="Dodaj połączenie (grupowanie turnusów do taborów/list)">
            <Plus className="h-4 w-4" /> Dodaj połączenie
          </button>
        </div>
        <div className="flex overflow-hidden rounded-md border border-gray-300">
          <button type="button" onClick={() => setDirection('arrival')} data-testid="dir-arrival"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              direction === 'arrival' ? 'bg-sky-600 text-white' : 'bg-white text-gray-700'}`}>
            <MapPin className="h-4 w-4" /> Przyjazd do ośrodka
          </button>
          <button type="button" onClick={() => setDirection('return')} data-testid="dir-return"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              direction === 'return' ? 'bg-sky-600 text-white' : 'bg-white text-gray-700'}`}>
            <Home className="h-4 w-4" /> Powrót z ośrodka
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {loading && <div className="py-10 text-center text-gray-500">Ładowanie danych transportu…</div>}

      {/* ---------- Nr 17 AUTO: ilu automatycznie wypadło z taborów roboczych ---------- */}
      {!loading && autoRemovedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
          data-testid="auto-removed-banner">
          <UserX className="h-4 w-4" />
          Automatycznie usunięto {autoRemovedCount} {autoRemovedCount === 1 ? 'uczestnika' : 'uczestników'} z taborów roboczych
          (zmiana danych: rezygnacja / zmiana turnusu / transport własny / wyjazd przed czasem).
        </div>
      )}

      {/* ---------- G04 (Nr 17): KTO WYPADŁ Z TABORU ZATWIERDZONEGO (orphaned — ręcznie) ---------- */}
      {!loading && orphaned.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3" data-testid="orphaned-panel">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <UserX className="h-4 w-4" /> Uczestnicy, którzy wypadli z taboru ({orphaned.length})
            <span className="font-normal text-amber-700">— zmiana danych po wsadzeniu; usuń z listy.</span>
          </div>
          <ul className="flex flex-col gap-1">
            {orphaned.map((o) => (
              <li key={o.participant_id} data-testid="orphaned-row"
                className="flex items-center justify-between gap-3 rounded bg-white px-3 py-1.5 text-sm">
                <span className="text-gray-800">
                  {participantNames.get(o.reservation_id) ?? `#${o.reservation_id}`}
                  <span className="ml-2 text-amber-700">— {o.reason}</span>
                </span>
                <button type="button" data-testid="orphaned-remove" title="Usuń wypadniętego z taboru"
                  onClick={() => void handleRemoveParticipant(o.participant_id)}
                  className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">
                  <Trash2 className="h-3.5 w-3.5" /> Usuń z taboru
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- 3 STREFY (Full HD) ---------- */}
      {!loading && (
        <div className="grid gap-3" style={{ gridTemplateColumns: '540px 1fr 400px' }}>
          <Panel title="Miasta">
            <CitiesPanel cities={cities} totals={totals} visibleResorts={visibleResorts}
              selection={selection} onToggleCity={onToggleCity} onToggleResortCell={onToggleResortCell}
              onToggleMaster={onToggleMaster} transferCities={transferCities}
              onToggleTransfer={onToggleTransfer} onToggleAllTransfers={onToggleAllTransfers} />
          </Panel>
          <Panel title={middleTitle}>
            <ParticipantsPanel participants={displayedParticipants} panelMode={panelMode}
              hasSelection={hasSelection} selectedTotal={selectedTotal} assignMode={assignMode}
              selectedIds={selectedIds} onToggleSelect={toggleSelect} transferCities={transferCities}
              visibleColumns={visibleColumns}
              onAssignSelected={() => void assignToOpenTabor([...selectedIds])}
              onEarlyLeave={(rid) => { setEarlyLeaveTarget(rid); setEarlyLeaveNote(''); }}
              onOpenReservation={(num) => { if (num && typeof window !== 'undefined') window.open(`/admin-panel/rezerwacja/${num}`, '_blank'); }} />
          </Panel>
          <Panel title="Tabor">
            {activeConnectionId == null ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-gray-400">
                <Bus className="mb-2 h-8 w-8" />
                <p className="text-sm">Dane całego sezonu (podgląd).</p>
                <p className="mt-1 text-xs">Dodaj połączenie, aby układać tabory i wypuszczać listy.</p>
              </div>
            ) : (
              <TaborPanel tabors={tabors} participantNames={participantNames} reloadKey={reloadKey}
                openTaborId={openTaborId}
                onOpenTabor={(id) => { setOpenTaborId(id); setPanelMode('participants'); }}
                onDropAssign={(taborId, rid) => void dropAssign(taborId, rid)}
                onRemoveParticipant={(pid) => void handleRemoveParticipant(pid)}
                onEdit={(t) => { setEditingTabor(t); setTaborModalOpen(true); }}
                onDelete={(t) => setDeleteTarget(t)}
                onDocument={(t) => setDocumentTabor(t)} />
            )}
          </Panel>
        </div>
      )}

      {/* statystyka wyjazdu przed zakończeniem (dyskretna) */}
      {!loading && (
        <div className="text-right text-xs text-gray-500" data-testid="early-leave-stat">
          Wyjazd przed zakończeniem (ogółem):{' '}
          <span className={`font-semibold ${earlyLeaveCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>{earlyLeaveCount}</span>
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
      {listsModalOpen && <TransportListsModal onClose={() => setListsModalOpen(false)} />}
      {columnsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="columns-modal">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Widoczne kolumny uczestników</h3>
              <button type="button" onClick={() => setColumnsModalOpen(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-gray-500">Zapamiętane w tej przeglądarce (localStorage).</p>
            <div className="flex flex-col gap-2">
              {PARTICIPANT_COLUMN_META.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={visibleColumns.includes(c.key)} data-testid={`col-toggle-${c.key}`}
                    onChange={() => toggleColumn(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setColumnsModalOpen(false)}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">Gotowe</button>
            </div>
          </div>
        </div>
      )}
      {compareOpen && <TransportCompareModal onClose={() => setCompareOpen(false)} />}
      {routesModalOpen && (
        <RoutesManagerModal
          allCityNames={cities.map((c) => c.city)}
          onClose={() => setRoutesModalOpen(false)}
          onChanged={() => { void reloadData(); }}
        />
      )}
      {earlyLeaveTarget != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="early-leave-modal">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-red-700">
              <AlertCircle className="h-5 w-5" /> Wyjazd przed zakończeniem
            </h3>
            <p className="text-sm text-gray-600">Uczestnik zostanie wykluczony z transportu powrotnego. Podaj powód:</p>
            <textarea value={earlyLeaveNote} onChange={(e) => setEarlyLeaveNote(e.target.value)} rows={3}
              placeholder="np. odbiór własny 3 dni przed końcem turnusu"
              className="mt-2 w-full rounded border border-gray-300 p-2 text-sm" data-testid="early-leave-note" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEarlyLeaveTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm">Anuluj</button>
              <button type="button" onClick={() => void markEarlyLeave()} data-testid="early-leave-confirm"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">Oznacz</button>
            </div>
          </div>
        </div>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[480px] flex-col rounded-lg border border-gray-200 bg-white">
      <header className="border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{title}</h2>
      </header>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}
