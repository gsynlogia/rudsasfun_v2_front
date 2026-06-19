/**
 * API client modułu „Listy transportowe" (prefix /api/transport-lists/).
 * Cienka warstwa nad authenticatedFetch (@/lib/utils/api — auto token + 401 redirect, jak #266).
 * Każda funkcja waliduje status odpowiedzi i zwraca sparsowane dane (typy z lib/types/transportLists).
 */
import { authenticatedFetch } from '@/lib/utils/api';
import type {
  Connection, ConnectionCreate, Tabor, TaborCreate, TaborUpdate, TaborCapacity,
  CityCounts, ParticipantRow, TaborParticipant, OrphanedAssignment,
  TransportListSummary, TransportListDetail, CompareEntry, Direction,
} from '@/lib/types/transportLists';

const BASE = '/api/transport-lists';

async function jsonOrThrow<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail ?? body);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${context}: ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ---------- POŁĄCZENIA ----------
export async function listConnections(direction?: Direction): Promise<Connection[]> {
  const q = direction ? `?direction=${direction}` : '';
  return jsonOrThrow(await authenticatedFetch(`${BASE}/connections${q}`), 'listConnections');
}

export async function createConnection(body: ConnectionCreate): Promise<Connection> {
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/connections`, { method: 'POST', body: JSON.stringify(body) }),
    'createConnection');
}

export async function deleteConnection(id: number): Promise<void> {
  const res = await authenticatedFetch(`${BASE}/connections/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`deleteConnection: ${res.status}`);
}

export async function getConnectionCities(id: number): Promise<CityCounts[]> {
  return jsonOrThrow(await authenticatedFetch(`${BASE}/connections/${id}/cities`), 'getConnectionCities');
}

export async function getConnectionParticipants(id: number, cityId?: number): Promise<ParticipantRow[]> {
  const q = cityId != null ? `?city_id=${cityId}` : '';
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/connections/${id}/participants${q}`), 'getConnectionParticipants');
}

export async function getOrphanedAssignments(id: number): Promise<OrphanedAssignment[]> {
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/connections/${id}/orphaned-assignments`), 'getOrphanedAssignments');
}

// ---------- TABORY ----------
export async function listTabors(connectionId: number): Promise<Tabor[]> {
  return jsonOrThrow(await authenticatedFetch(`${BASE}/connections/${connectionId}/tabors`), 'listTabors');
}

export async function createTabor(body: TaborCreate): Promise<Tabor> {
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/tabors`, { method: 'POST', body: JSON.stringify(body) }), 'createTabor');
}

export async function updateTabor(id: number, body: TaborUpdate): Promise<Tabor> {
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/tabors/${id}`, { method: 'PUT', body: JSON.stringify(body) }), 'updateTabor');
}

export async function deleteTabor(id: number): Promise<void> {
  const res = await authenticatedFetch(`${BASE}/tabors/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`deleteTabor: ${res.status}`);
}

export async function getTaborCapacity(id: number): Promise<TaborCapacity> {
  return jsonOrThrow(await authenticatedFetch(`${BASE}/tabors/${id}/capacity`), 'getTaborCapacity');
}

export async function listTaborParticipants(id: number): Promise<TaborParticipant[]> {
  return jsonOrThrow(await authenticatedFetch(`${BASE}/tabors/${id}/participants`), 'listTaborParticipants');
}

/** Przypisz uczestnika do taboru. Zwraca {overflow:true} gdy 409 (tabor za mały) — bez rzucania. */
export async function assignParticipant(
  taborId: number, reservationId: number, isTransfer = false,
): Promise<{ ok: boolean; overflow?: boolean; participant?: TaborParticipant }> {
  const res = await authenticatedFetch(`${BASE}/tabors/${taborId}/participants`, {
    method: 'POST', body: JSON.stringify({ reservation_id: reservationId, is_transfer: isTransfer }),
  });
  if (res.status === 409) return { ok: false, overflow: true };
  if (!res.ok) throw new Error(`assignParticipant: ${res.status}`);
  return { ok: true, participant: await res.json() };
}

export async function removeParticipant(participantId: number): Promise<void> {
  const res = await authenticatedFetch(`${BASE}/participants/${participantId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`removeParticipant: ${res.status}`);
}

// ---------- WYJAZD PRZED ZAKOŃCZENIEM ----------
export async function setEarlyLeave(reservationId: number, earlyLeave: boolean, note?: string): Promise<void> {
  const res = await authenticatedFetch(`${BASE}/reservations/${reservationId}/early-leave`, {
    method: 'PATCH', body: JSON.stringify({ early_leave: earlyLeave, note: note ?? null }),
  });
  if (!res.ok && res.status !== 204) throw new Error(`setEarlyLeave: ${res.status}`);
}

export async function getEarlyLeaveStats(): Promise<{ early_leave_count: number }> {
  return jsonOrThrow(await authenticatedFetch(`${BASE}/stats/early-leave`), 'getEarlyLeaveStats');
}

// ---------- LISTY (wypuść / edytuj / zatwierdź / Excel / historia / porównaj) ----------
export async function releaseList(taborId: number, direction?: Direction): Promise<TransportListDetail> {
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/tabors/${taborId}/release-list`, {
      method: 'POST', body: JSON.stringify({ direction: direction ?? null }),
    }), 'releaseList');
}

export async function getList(id: number): Promise<TransportListDetail> {
  return jsonOrThrow(await authenticatedFetch(`${BASE}/lists/${id}`), 'getList');
}

export async function patchList(
  id: number, body: { payload_json?: string; header_note?: string },
): Promise<TransportListDetail> {
  const res = await authenticatedFetch(`${BASE}/lists/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  if (res.status === 409) throw new Error('list_immutable');
  return jsonOrThrow(res, 'patchList');
}

export async function approveList(id: number): Promise<TransportListDetail> {
  return jsonOrThrow(
    await authenticatedFetch(`${BASE}/lists/${id}/approve`, { method: 'POST' }), 'approveList');
}

export interface ListHistoryParams {
  status?: string;
  direction?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export async function listHistory(params: ListHistoryParams = {}): Promise<TransportListSummary[]> {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][],
  ).toString();
  return jsonOrThrow(await authenticatedFetch(`${BASE}/lists${q ? `?${q}` : ''}`), 'listHistory');
}

export async function deleteList(id: number): Promise<void> {
  const res = await authenticatedFetch(`${BASE}/lists/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`deleteList: ${res.status}`);
}

export async function compareConnections(connectionIds: number[]): Promise<CompareEntry[]> {
  const q = connectionIds.map((id) => `connection_ids=${id}`).join('&');
  return jsonOrThrow(await authenticatedFetch(`${BASE}/compare?${q}`), 'compareConnections');
}

/** URL eksportu Excel (otwierany przez authenticatedFetch → blob, bo wymaga tokenu). */
export async function downloadListExcel(id: number): Promise<Blob> {
  const res = await authenticatedFetch(`${BASE}/lists/${id}/excel`);
  if (!res.ok) throw new Error(`downloadListExcel: ${res.status}`);
  return res.blob();
}
