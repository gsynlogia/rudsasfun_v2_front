/* eslint-disable @typescript-eslint/no-explicit-any */
/** Typy strony szczegółów rezerwacji. */

export interface SpeechRecognitionResultEventLike {
  results: { [i: number]: { isFinal: boolean; 0: { transcript: string }; length: number } };
  resultIndex: number;
}

export interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (e: SpeechRecognitionResultEventLike) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
}

/** Używane w komponentach strony (np. loader karty). */
export type ReservationDetailsWithNumber = ReservationDetails & { reservation_number?: string };

export interface ReservationDetails {
  id: number;
  camp_id?: number;
  property_id?: number;
  camp_name?: string | null;
  property_name?: string | null;
  property_city?: string | null;
  property_period?: string | null;
  property_start_date?: string | null;
  property_end_date?: string | null;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  participant_age?: string | null;
  participant_gender?: string | null;
  participant_city?: string | null;
  participant_additional_info?: string | null;
  parents_data?: Array<{ firstName?: string; lastName?: string; email?: string; phoneNumber?: string; street?: string; city?: string; postalCode?: string }> | null;
  diet?: number | null;
  diet_name?: string | null;
  diet_price?: number | null;
  selected_diets?: number[] | null;
  selected_addons?: (string | number)[] | null;
  selected_protection?: (string | number)[] | null;
  selected_promotion?: string | null;
  promotion_name?: string | null;
  promotion_price?: number | null;
  promotion_justification?: any;
  departure_type?: string | null;
  departure_city?: string | null;
  return_type?: string | null;
  return_city?: string | null;
  transport_different_cities?: boolean;
  selected_source?: string | null;
  source_name?: string | null;
  source_inne_text?: string | null;
  wants_invoice?: boolean;
  invoice_type?: string | null;
  invoice_first_name?: string | null;
  invoice_last_name?: string | null;
  invoice_email?: string | null;
  invoice_phone?: string | null;
  invoice_company_name?: string | null;
  invoice_nip?: string | null;
  invoice_street?: string | null;
  invoice_postal_code?: string | null;
  invoice_city?: string | null;
  delivery_type?: string | null;
  delivery_different_address?: boolean;
  delivery_street?: string | null;
  delivery_postal_code?: string | null;
  delivery_city?: string | null;
  accommodation_request?: string | null;
  health_questions?: any;
  health_details?: any;
  additional_notes?: string | null;
  consent1?: boolean;
  consent2?: boolean;
  consent3?: boolean;
  consent4?: boolean;
  total_price?: number;
  deposit_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  contract_status?: string | null;
  contract_rejection_reason?: string | null;
  qualification_card_status?: string | null;
  qualification_card_rejection_reason?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  archive_id?: number | null;
}

export interface Addon { id: number; name: string; price: number; }
export interface Protection { id: number; name: string; price: number; }
export interface Promotion { id: number; name: string; price: number; does_not_reduce_price?: boolean; relation_id?: number; }
export interface PromotionOption { relationId: number; name: string; price: number; doesNotReducePrice?: boolean; }
export interface Diet { id: number; name: string; price: number; }

export interface ReservationNote {
  id: number;
  reservation_id: number;
  admin_user_id: number | null;
  admin_user_name: string | null;
  admin_user_login: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export type ReservationEventItem = { id: number; action: string; payload?: string | null; created_at?: string | null; author_display: string; author_role: string; };
export type AnnexItem = { id: number; reservation_id: number; change_type: string; description: string; status: string; cancellation_reason: string | null; created_at: string | null; };
export type GuardianEntry = { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; street?: string; city?: string; postalCode?: string; };
