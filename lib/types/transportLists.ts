/**
 * Typy modułu „Listy transportowe" (lustro Pydantic: api_radsas/app/schemas/transport.py).
 * Źródło prawdy = backend; tu trzymamy zgodne typy TS strict dla panelu admina.
 */

export type Direction = 'arrival' | 'return';
export type TaborType = 'autokar' | 'pociag' | 'wlasny' | 'prywatny';
export type ListStatus = 'robocza' | 'zatwierdzona';

export interface Connection {
  id: number;
  name: string;
  tags: string; // CSV tagów, np. "B1,S1"
  direction: Direction;
  date: string | null;
  created_at: string;
}

export interface ConnectionCreate {
  name: string;
  tags: string;
  direction: Direction;
  date?: string | null;
}

/** P1: turnus z datami (start=przyjazd, end=powrót) + status użycia per kierunek (modal Dodaj połączenie). */
export interface TagDetail {
  tag: string;
  start_date: string | null;
  end_date: string | null;
  used_arrival: boolean;
  used_return: boolean;
}

export interface Tabor {
  id: number;
  connection_id: number;
  type: TaborType;
  name: string | null;
  number: string | null;
  seats: number;
  supervisor_seats: number;
  carrier: string | null;
  driver: string | null;
  driver_phone: string | null;
  transport_manager: string | null;
  manager_phone: string | null;
  additional_info: string | null;
  document_approved: boolean;
}

export interface TaborCreate {
  connection_id: number;
  type: TaborType;
  name?: string | null;
  number?: string | null;
  seats?: number;
  supervisor_seats?: number;
  carrier?: string | null;
  driver?: string | null;
  driver_phone?: string | null;
  transport_manager?: string | null;
  manager_phone?: string | null;
  additional_info?: string | null;
}

export type TaborUpdate = Partial<Omit<TaborCreate, 'connection_id'>>;

export interface TaborCapacity {
  tabor_id: number;
  seats: number;
  supervisor_seats: number;
  capacity: number;
  occupied: number;
  free: number;
}

export interface CityCounts {
  city: string;
  transport_city_id: number | null;
  display_order: number | null;
  route_color: string | null;
  beaver: number;
  sawa: number;
  limba: number;
  razem: number;
  trasa: number;
  nieprzyp: number;
  is_transfer: boolean;
}

export interface ParticipantRow {
  reservation_id: number;
  reservation_number: string | null;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  topic: string | null;
  tag: string | null;
  region: string | null;
  city: string | null;              // PRZYSTANEK (transport_cities.city)
  participant_city: string | null;  // MIASTO zamieszkania (reservations.participant_city)
  transport_city_id: number | null;
  is_assigned: boolean;
}

export interface TaborParticipant {
  id: number;
  tabor_id: number;
  reservation_id: number;
  order_number: number;
  topic_snapshot: string | null;
  is_transfer: boolean;
}

export interface OrphanedAssignment {
  participant_id: number;
  reservation_id: number;
  tabor_id: number;
  reason: string;
}

/** Wiersz uczestnika w snapshocie dokumentu (payload_json). */
export interface ListPayloadParticipant {
  lp: number;
  reservation_id: number;
  first_name: string | null;
  last_name: string | null;
  rocznik: number | null;
  opiekun: string | null;
  kontakt: string | null;
  turnus: string | null;
  przystanek: string | null;
  miejsce_zbiorki: string;
  is_transfer: boolean;
  upowaznienia?: string; // tylko dla powrotu
}

export interface ListPayload {
  direction: Direction;
  header_note?: string;
  tabor: Partial<Tabor>;
  participants: ListPayloadParticipant[];
}

export interface TransportListSummary {
  id: number;
  connection_id: number | null;
  tabor_id: number | null;
  list_id: string | null;
  direction: string | null;
  status: ListStatus;
  header_note: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface TransportListDetail extends TransportListSummary {
  payload_json: string | null;
}

export interface CompareEntry {
  connection_id: number;
  name: string | null;
  direction: string | null;
  cities: CityCounts[];
}
