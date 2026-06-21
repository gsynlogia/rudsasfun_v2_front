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

/** Dodaje pusty wiersz ręczny (reservation_id=0 = dopisany z palca) na koniec bufora + LP. */
export function addBlankParticipant(payload: ListPayload, isReturn: boolean): ListPayload {
  const blank: ListPayloadParticipant = {
    lp: payload.participants.length + 1, reservation_id: 0,
    first_name: '', last_name: '', rocznik: null, opiekun: null, kontakt: null,
    turnus: null, przystanek: '—', miejsce_zbiorki: '', is_transfer: false,
    ...(isReturn ? { upowaznienia: '' } : {}),
  };
  return { ...payload, participants: renumberLp([...payload.participants, blank]) };
}
