'use client';

/**
 * Modal „Wypuść listę / Dokument" (Nr 31-33) — TransportDocumentModal z makiety.
 * Nr 31: tabela uczestników GRUPOWANA po przystanku (kolumny U1), kolory resortów wg tagu.
 * Nr 32: nagłówek „za przednią szybę" + akcje Excel / Drukuj / Zapisz bufor / Zatwierdź (immutable po approve).
 * Nr 33: kolumna „Upoważnienia" renderowana TYLKO dla kierunku return; edytowalna w buforze (P1 — ręcznie).
 */
import { X, FileSpreadsheet, Printer, Check, Save, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Direction, ListPayload, ListPayloadParticipant, TransportListDetail } from '@/lib/types/transportLists';
import { releaseList, getList, patchList, approveList, downloadListExcel } from '@/lib/services/transportListsApi';
import { addBlankParticipant, removeParticipantAt, sortListParticipants, compareListRows } from '@/lib/utils/transportListPayload';

interface Props {
  taborId: number;
  direction: Direction;
  listId?: number;          // BUG 007: gdy podany — otwiera ISTNIEJĄCĄ listę (podgląd/edycja), nie wypuszcza nowej
  onClose: () => void;
  onApproved: () => void;
}

// Kolor tła wiersza wg resortu (pierwsza litera tagu): B=Beaver zielony, S=Sawa niebieski, L=Limba pomarańczowy.
function resortBg(turnus: string | null): string {
  const c = (turnus ?? '').trim().toUpperCase()[0];
  if (c === 'B') return 'bg-green-50';
  if (c === 'S') return 'bg-blue-50';
  if (c === 'L') return 'bg-orange-50';
  return '';
}

export default function TransportDocumentModal({ taborId, direction, listId, onClose, onApproved }: Props) {
  const [list, setList] = useState<TransportListDetail | null>(null);
  const [payload, setPayload] = useState<ListPayload | null>(null);
  const [headerNote, setHeaderNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG 007: kierunek bierzemy z otwartej listy (gdy podgląd po listId), inaczej z propa.
  const isReturn = (list?.direction ?? direction) === 'return';
  const immutable = list?.status === 'zatwierdzona';

  useEffect(() => {
    let cancelled = false;
    // BUG 007: listId → otwórz istniejącą listę (getList); inaczej wypuść/odśwież roboczą (releaseList).
    const loader = listId != null ? getList(listId) : releaseList(taborId, direction);
    loader.then((l) => {
      if (cancelled) return;
      setList(l);
      setHeaderNote(l.header_note ?? '');
      try { setPayload(JSON.parse(l.payload_json ?? '{}')); } catch { setPayload(null); }
      setLoading(false);
    }).catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [taborId, direction, listId]);

  const updateRow = (idx: number, field: keyof ListPayloadParticipant, value: string) => {
    setPayload((p) => {
      if (!p) return p;
      const participants = p.participants.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
      return { ...p, participants };
    });
  };
  // film: ręczne dodanie/usunięcie osoby na liście (bufor) — NIE dotyka bazy rezerwacji.
  const addRow = () => setPayload((p) => (p ? addBlankParticipant(p, isReturn) : p));
  const removeRow = (idx: number) => setPayload((p) => (p ? removeParticipantAt(p, idx) : p));
  // BUG 008: edycja przystanku całej grupy (nowa osoba w pustej grupie dostaje destynację).
  const updateGroupStop = (idxs: number[], value: string) =>
    setPayload((p) => (p ? {
      ...p, participants: p.participants.map((r, i) => (idxs.includes(i) ? { ...r, przystanek: value } : r)),
    } : p));

  async function savebuffer() {
    if (!list || !payload) return;
    // BUG 008/006: zapisuj listę POSORTOWANĄ (przystanek→resort→nazwisko) z LP 1..n.
    const sorted = { ...payload, participants: sortListParticipants(payload.participants) };
    setPayload(sorted);
    await patchList(list.id, { payload_json: JSON.stringify(sorted), header_note: headerNote });
  }
  async function handleSave() {
    setBusy(true); setError(null);
    try { await savebuffer(); } catch (e) { setError(e instanceof Error ? e.message : 'Błąd zapisu'); }
    setBusy(false);
  }
  async function handleApprove() {
    if (!list) return;
    setBusy(true); setError(null);
    try {
      await savebuffer();
      await approveList(list.id);
      onApproved();
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd zatwierdzania'); setBusy(false); }
  }
  async function handleExcel() {
    if (!list) return;
    const blob = await downloadListExcel(list.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${list.list_id ?? 'lista'}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  // BUG 008/006: grupy budowane z POSORTOWANEJ kolejności (przystanek→resort→nazwisko) — nowo dodana
  // osoba „przesuwa się tam, gdzie ma być" po wpisaniu destynacji. idx pozostaje oryginalny (do edycji).
  const groups: { stop: string; rows: { row: ListPayloadParticipant; idx: number }[] }[] = [];
  (payload?.participants ?? [])
    .map((row, idx) => ({ row, idx }))
    .sort((a, b) => compareListRows(a.row, b.row))
    .forEach(({ row, idx }) => {
      const stop = (row.przystanek ?? '').trim() || '—';
      const g = groups.find((x) => x.stop === stop);
      if (g) g.rows.push({ row, idx });
      else groups.push({ stop, rows: [{ row, idx }] });
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="document-modal">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">Lista transportowa {list?.list_id ? `· ${list.list_id}` : ''}
            {immutable && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Zatwierdzona</span>}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {loading && <p className="py-8 text-center text-gray-500">Generowanie listy…</p>}
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {payload && (
            <>
              {/* Nagłówek „za przednią szybę" (Nr 32, edytowalny) */}
              <textarea value={headerNote} onChange={(e) => setHeaderNote(e.target.value)} disabled={immutable}
                data-testid="document-header" rows={2}
                className="mb-3 w-full rounded border border-gray-300 p-2 text-center text-sm font-semibold uppercase" />
              <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                <div>Kierownik transportu: <b>{payload.tabor.transport_manager || '—'}</b> {payload.tabor.manager_phone || ''}</div>
                <div>Kierowca: <b>{payload.tabor.driver || '—'}</b> {payload.tabor.driver_phone || ''}</div>
                <div>Rodzaj: <b>{payload.tabor.type} {payload.tabor.number ? `nr ${payload.tabor.number}` : ''}</b></div>
                <div>Przewoźnik: <b>{payload.tabor.carrier || '—'}</b></div>
              </div>

              {/* Tabela grupowana po przystanku (Nr 31) */}
              <table className="w-full border-collapse text-xs" data-testid="document-table">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    {['LP', 'Imię', 'Nazwisko', 'Rocznik', 'Opiekun', 'Kontakt', 'Turnus', 'Przystanek', 'Miejsce zbiórki']
                      .map((h) => <th key={h} className="border px-1.5 py-1">{h}</th>)}
                    {isReturn && <th className="border px-1.5 py-1" data-testid="col-upowaznienia">Upoważnienia</th>}
                    {!immutable && <th className="border px-1.5 py-1" />}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => g.rows.map(({ row, idx }, gi) => (
                    <tr key={row.reservation_id ?? `${g.stop}-${idx}`} className={resortBg(row.turnus)}>
                      <td className="border px-1.5 py-1">{row.lp}</td>
                      <td className="border px-1 py-0.5">
                        {immutable ? row.first_name : (
                          <input value={row.first_name ?? ''} data-testid="document-first-name"
                            onChange={(e) => updateRow(idx, 'first_name', e.target.value)}
                            className="w-full bg-transparent px-1 text-xs" placeholder="imię" />
                        )}
                      </td>
                      <td className="border px-1 py-0.5">
                        {immutable ? row.last_name : (
                          <input value={row.last_name ?? ''} data-testid="document-last-name"
                            onChange={(e) => updateRow(idx, 'last_name', e.target.value)}
                            className="w-full bg-transparent px-1 text-xs" placeholder="nazwisko" />
                        )}
                      </td>
                      <td className="border px-1.5 py-1">{row.rocznik ?? ''}</td>
                      <td className="border px-1.5 py-1">{row.opiekun ?? ''}</td>
                      <td className="border px-1.5 py-1">{row.kontakt ?? ''}</td>
                      <td className="border px-1.5 py-1">{row.turnus ?? ''}</td>
                      {gi === 0
                        ? (
                          <td className="border px-1.5 py-1 align-top font-semibold" rowSpan={g.rows.length}>
                            {/* BUG 008: przystanek edytowalny — admin dodaje destynację (też nowej osobie). */}
                            {immutable ? g.stop : (
                              <input value={g.stop === '—' ? '' : g.stop} data-testid="document-stop"
                                onChange={(e) => updateGroupStop(g.rows.map((r) => r.idx), e.target.value)}
                                className="w-full bg-transparent px-1 text-xs font-semibold" placeholder="przystanek" />
                            )}
                          </td>
                        )
                        : null}
                      <td className="border px-1 py-0.5">
                        <input value={row.miejsce_zbiorki ?? ''} disabled={immutable}
                          onChange={(e) => updateRow(idx, 'miejsce_zbiorki', e.target.value)}
                          className="w-full bg-transparent px-1 text-xs" placeholder="adres + godzina" />
                      </td>
                      {isReturn && (
                        <td className="border px-1 py-0.5">
                          <input value={row.upowaznienia ?? ''} disabled={immutable}
                            onChange={(e) => updateRow(idx, 'upowaznienia', e.target.value)}
                            className="w-full bg-transparent px-1 text-xs" placeholder="kto odbiera" />
                        </td>
                      )}
                      {!immutable && (
                        <td className="border px-1 py-0.5 text-center">
                          <button type="button" data-testid="document-remove-row" title="Usuń osobę z listy"
                            onClick={() => removeRow(idx)}
                            className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )))}
                </tbody>
              </table>
              {!immutable && (
                <button type="button" onClick={addRow} data-testid="document-add-row"
                  className="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-gray-400 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                  <UserPlus className="h-4 w-4" /> Dodaj osobę
                </button>
              )}

              {/* BUG 017 (Krzysztof): brakowało okna na uwagi — osobne od nagłówka „za przednią szybę". */}
              <div className="mt-4">
                <label htmlFor="document-notes" className="mb-1 block text-sm font-medium text-gray-700">Dodatkowe uwagi</label>
                <textarea id="document-notes" data-testid="document-notes" rows={2} disabled={immutable}
                  value={payload.notes ?? ''}
                  onChange={(e) => setPayload((p) => (p ? { ...p, notes: e.target.value } : p))}
                  placeholder="Wpisz dodatkowe uwagi do listy…"
                  className="w-full rounded border border-gray-300 p-2 text-sm" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Anuluj</button>
          <button type="button" onClick={() => void handleExcel()} disabled={!list}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm">
            <Printer className="h-4 w-4" /> Drukuj
          </button>
          {!immutable && (
            <>
              <button type="button" onClick={() => void handleSave()} disabled={busy} data-testid="document-save"
                className="flex items-center gap-1.5 rounded-md border border-sky-600 px-3 py-1.5 text-sm text-sky-700 disabled:opacity-50">
                <Save className="h-4 w-4" /> Zapisz
              </button>
              <button type="button" onClick={() => void handleApprove()} disabled={busy} data-testid="document-approve"
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                <Check className="h-4 w-4" /> Zatwierdź i zamknij
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
