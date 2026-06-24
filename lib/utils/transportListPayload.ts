/**
 * Czysta logika edycji bufora wypuszczonej listy transportowej (film: właściciel „muszę mieć przycisk
 * dodania/usunięcia osoby... połamał rękę przed wyjazdem... nie chcę ingerować w bazę").
 * Operacje na snapshot `payload_json` (bufor) — NIE dotykają bazy rezerwacji. Pure (testowalne bez DOM).
 */
import type { ListPayload, ListPayloadParticipant } from '@/lib/types/transportLists';

/** Przepisuje numery porządkowe LP na 1..n (zachowuje kolejność). */
export function renumberLp(participants: ListPayloadParticipant[]): ListPayloadParticipant[] {
  return participants.map((r, i) => ({ ...r, lp: i + 1 }));
}

/** Usuwa wiersz uczestnika z bufora po indeksie i renumeruje LP bez luki. */
export function removeParticipantAt(payload: ListPayload, idx: number): ListPayload {
  return { ...payload, participants: renumberLp(payload.participants.filter((_, i) => i !== idx)) };
}

/** Dodaje pusty wiersz ręczny (reservation_id=0 = dopisany z palca) na koniec bufora + LP.
 * BUG 008: przystanek pusty (edytowalny), by admin mógł dodać destynację nowej osoby. */
export function addBlankParticipant(payload: ListPayload, isReturn: boolean): ListPayload {
  const blank: ListPayloadParticipant = {
    lp: payload.participants.length + 1, reservation_id: 0,
    first_name: '', last_name: '', rocznik: null, opiekun: null, kontakt: null,
    turnus: null, przystanek: '', miejsce_zbiorki: '', is_transfer: false,
    ...(isReturn ? { upowaznienia: '' } : {}),
  };
  return { ...payload, participants: renumberLp([...payload.participants, blank]) };
}

/** BUG 008 + 006: ranga resortu z turnusu (B/S/L) do sortowania „w obrębie przystanku". */
function turnusRank(turnus: string | null): number {
  const t = (turnus ?? '').trim().toUpperCase()[0];
  return t === 'B' ? 0 : t === 'S' ? 1 : t === 'L' ? 2 : 99;
}

/**
 * BUG 008 + 006: komparator domyślnej kolejności listy: PRZYSTANEK (alfabet PL) → resort Beaver/Sawa/Limba
 * → nazwisko+imię. Pusty przystanek (nowa osoba bez destynacji) ląduje na końcu. Używany też do live
 * grupowania w modalu dokumentu (auto-przesuwanie nowo dodanej osoby tam, gdzie ma być).
 */
export function compareListRows(a: ListPayloadParticipant, b: ListPayloadParticipant): number {
  const stopKey = (s: string | null) => (s ?? '').trim() || '￿';   // pusty → na koniec
  const byStop = stopKey(a.przystanek).localeCompare(stopKey(b.przystanek), 'pl');
  if (byStop !== 0) return byStop;
  const byResort = turnusRank(a.turnus) - turnusRank(b.turnus);
  if (byResort !== 0) return byResort;
  return `${a.last_name ?? ''} ${a.first_name ?? ''}`.trim()
    .localeCompare(`${b.last_name ?? ''} ${b.first_name ?? ''}`.trim(), 'pl');
}

/**
 * BUG 008 (nowa osoba „przesunie się gdzie ma być") + BUG 006 („to samo dotyczy wygenerowanej listy"):
 * sortuje wiersze listy wg komparatora i renumeruje LP 1..n.
 */
export function sortListParticipants(participants: ListPayloadParticipant[]): ListPayloadParticipant[] {
  return renumberLp([...participants].sort(compareListRows));
}
