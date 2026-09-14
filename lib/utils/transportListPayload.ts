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
    temat: '', uwagi: '',
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
 * Karta 6 (Trello „6. Lista transportowa finalna"): kolejność MIAST na liście = kolejność ich
 * POJAWIENIA (czyli wprowadzania do autokaru), a NIE alfabetycznie — autokar jedzie trasą ustaloną
 * przez kierownika (np. najpierw Warszawa, potem Łódź). W obrębie miasta zachowana kolejność
 * wprowadzania. Pusty przystanek (nowo dodana osoba bez destynacji) ląduje na końcu. Renumeracja LP 1..n.
 * Spójne z backendem `_build_list_payload` (transport_service.py).
 */
export function sortListParticipants(participants: ListPayloadParticipant[]): ListPayloadParticipant[] {
  return renumberLp(orderListRows(participants));
}

/** Zwraca wiersze w kolejności listy (miasta wg pojawienia, w obrębie wg wprowadzania), bez renumeracji. */
export function orderListRows<T extends ListPayloadParticipant>(participants: T[]): T[] {
  const firstIdx = new Map<string, number>();
  participants.forEach((p, i) => {
    const stop = (p.przystanek ?? '').trim();
    if (stop && !firstIdx.has(stop)) firstIdx.set(stop, i);
  });
  return participants
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const sa = (a.p.przystanek ?? '').trim();
      const sb = (b.p.przystanek ?? '').trim();
      const ea = sa ? 0 : 1, eb = sb ? 0 : 1;
      if (ea !== eb) return ea - eb;                       // pusty przystanek na koniec
      const fa = sa ? (firstIdx.get(sa) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const fb = sb ? (firstIdx.get(sb) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      if (fa !== fb) return fa - fb;                        // kolejność pojawienia miasta
      return a.i - b.i;                                     // kolejność wprowadzania w obrębie miasta
    })
    .map((x) => x.p);
}
