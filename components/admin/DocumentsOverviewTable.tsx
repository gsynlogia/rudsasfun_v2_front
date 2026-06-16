'use client';

import { useState, useEffect, useCallback, ChangeEvent, KeyboardEvent, useMemo, useRef } from 'react';
import { RefreshCw, FileText, CheckCircle2, FilterX, Mail, MessageSquare, Send, Info, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { authenticatedApiCall } from '@/utils/api-auth';
import { getDocumentsScopeParams } from '@/lib/utils/documentsQueryParams';
import {
  computeReminderRowColor,
  computeActiveRowColor,
  getRowColorClass,
  formatDaysAgoPL,
  isRecentReminder,
} from '@/lib/utils/computeReminderRowColor';

import AlreadySignedInfoModal from './AlreadySignedInfoModal';
import BulkRemindModal from './BulkRemindModal';
import RecentlyRemindedInfoModal from './RecentlyRemindedInfoModal';
import RetryReminderModal from './RetryReminderModal';
import ColumnFilter, { FilterValue, MultiSelectOption } from './ColumnFilter';
import DocumentReminderButtons from './DocumentReminderButtons';
import DocumentStatusBadge, { DocumentStatus } from './DocumentStatusBadge';
import EffectiveRemindersModal from './EffectiveRemindersModal';
import ReminderHistoryModal from './ReminderHistoryModal';
import TablePaginationBar from './TablePaginationBar';

export type DocumentsOverviewMode = 'active' | 'effective';

/**
 * Widok "Dokumenty" w admin panelu — lista rezerwacji z paginacją + status umowy/karty
 * + akcje przypomnienia + filtry per kolumna z URL state.
 *
 * REUSE backend: GET /api/reservations/paginated?page=X&limit=Y&filter_*=...
 *
 * Cz. 3 (2026-05-29): filtry per kolumna (text/date-range/multi-select), URL state, backend SQL filtering.
 * Stan filtra zapisany w URL → po reload zachowane → paginacja respektuje filtry → wszystko z bazy.
 */

interface ParentData {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
}

interface LastReminder {
  at: string;
  channel: 'email' | 'sms' | 'both' | 'failed' | 'phone_call';
}

interface ReservationDocumentRow {
  id: number;
  reservation_number: string | null;
  created_at: string | null;
  parents_data: ParentData[] | null;
  participant_first_name: string | null;
  participant_last_name: string | null;
  participant_age: string | null;
  property_tag: string | null;  // Cz. 3: tag turnusu (B1, L2, S3, ...)
  contract_status: DocumentStatus;
  contract_rejection_reason: string | null;
  qualification_card_status: DocumentStatus;
  qualification_card_rejection_reason: string | null;
  last_reminder: LastReminder | null;
  // Cz. 5 (2026-05-31): powod podpisu — wypelniane TYLKO gdy mode='effective'.
  // Cz. 6 (2026-05-31): rozszerzone do 3 wartosci:
  //   'after_reminder'      — klient zareagowal na reminder (ZIELONY background)
  //   'organic_no_reminder' — klient sam (brak reminderu) (JASNOBLEKITNY background, gdy showOrganic=true)
  //   'organic_post_factum' — reminder po podpisie (NIGDY w UI, backend wyklucza)
  signing_reason: 'after_reminder' | 'organic_no_reminder' | 'organic_post_factum' | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface PaginatedResponse {
  items: ReservationDocumentRow[];
  pagination: PaginationInfo;
}

const ITEMS_PER_PAGE = 20;

// ============== Helpers wyświetlania ==============

// CLAUDE.md i18n: baza w UTC, wyświetlanie w Europe/Warsaw przez Intl.DateTimeFormat
// (a NIE d.getHours() bo to zwraca lokalną strefę przeglądarki — która MOŻE NIE być Warsaw
// np. user na wakacjach lub Mac z błędną strefą). Backend zwraca ISO z `Z` (UTC) lub bez —
// jeśli bez, wymuszamy UTC (CLAUDE.md: API powinno zawsze zwracać z offset; defensywnie tu).
function parseToDate(iso: string | null): Date | null {
  if (!iso) return null;
  const hasTzInfo = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasTzInfo ? iso : iso + 'Z'; // brak tz → assume UTC
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(iso: string | null): string {
  const d = parseToDate(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatGuardian(parents: ParentData[] | null | undefined): { name: string; phone: string } {
  if (!parents || parents.length === 0) return { name: '—', phone: '—' };
  const p = parents[0];
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || '—';
  const dial = (p.phone || '').trim();
  const num = (p.phoneNumber || '').trim();
  const phoneJoined = dial && num ? `${dial} ${num}` : dial || num || '—';
  return { name, phone: phoneJoined };
}

function formatParticipant(row: ReservationDocumentRow): string {
  const name = [row.participant_first_name, row.participant_last_name].filter(Boolean).join(' ');
  return name || '—';
}

function formatDateTime(iso: string | null): string {
  const d = parseToDate(iso);
  if (!d) return '—';
  // pl-PL z opcjami daje "30.05.2026, 22:40" — usuwamy przecinek dla spójności z formatDate
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(',', '');
}

interface ChannelBadge { label: string; className: string; }

function getChannelBadge(channel: LastReminder['channel']): ChannelBadge {
  switch (channel) {
    case 'both':
      return { label: 'Email + SMS', className: 'bg-green-100 text-green-800' };
    case 'email':
      return { label: 'Email', className: 'bg-blue-100 text-blue-800' };
    case 'sms':
      return { label: 'SMS', className: 'bg-purple-100 text-purple-800' };
    case 'phone_call':
      // Cz. 7 v4 (2026-05-31): admin osobiscie zadzwonil
      return { label: 'Powiadomiony tel.', className: 'bg-teal-100 text-teal-800' };
    case 'failed':
      return { label: 'Próba — błąd', className: 'bg-gray-100 text-gray-600' };
    default:
      return { label: String(channel), className: 'bg-gray-100 text-gray-500' };
  }
}

// ============== Opcje multi-select dla statusów dokumentów ==============

const DOC_STATUS_OPTIONS: MultiSelectOption[] = [
  { value: 'approved', label: 'Zatwierdzona', badgeClassName: 'bg-green-100 text-green-800' },
  { value: 'signed_pending_admin', label: 'Podpisana SMS — czeka admina', badgeClassName: 'bg-cyan-100 text-cyan-800' },
  { value: 'in_verification', label: 'Oczekuje podpisu klienta', badgeClassName: 'bg-yellow-100 text-yellow-800' },
  { value: 'requires_signature', label: 'Wymaga podpisu', badgeClassName: 'bg-orange-100 text-orange-800' },
  { value: 'rejected', label: 'Odrzucona', badgeClassName: 'bg-red-100 text-red-800' },
  { value: 'brak', label: 'Brak dokumentu', badgeClassName: 'bg-gray-100 text-gray-500' },
];

// Cz. 3: tagi turnusów (z bazy: B1-B7, L1-L5, S1-S6 + edge cases)
const TAG_OPTIONS: MultiSelectOption[] = [
  { value: 'B1', label: 'B1' }, { value: 'B2', label: 'B2' }, { value: 'B3', label: 'B3' },
  { value: 'B4', label: 'B4' }, { value: 'B5', label: 'B5' }, { value: 'B6', label: 'B6' },
  { value: 'B7', label: 'B7' },
  { value: 'L1', label: 'L1' }, { value: 'L2', label: 'L2' }, { value: 'L3', label: 'L3' },
  { value: 'L4', label: 'L4' }, { value: 'L5', label: 'L5' },
  { value: 'S1', label: 'S1' }, { value: 'S2', label: 'S2' }, { value: 'S3', label: 'S3' },
  { value: 'S4', label: 'S4' }, { value: 'S5', label: 'S5' }, { value: 'S6', label: 'S6' },
  { value: 'LIMBA2', label: 'LIMBA2' },
];

const REMINDER_CHANNEL_OPTIONS: MultiSelectOption[] = [
  { value: 'email', label: 'Email', badgeClassName: 'bg-blue-100 text-blue-800' },
  { value: 'sms', label: 'SMS', badgeClassName: 'bg-purple-100 text-purple-800' },
  { value: 'both', label: 'Email + SMS', badgeClassName: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Próba — błąd', badgeClassName: 'bg-gray-100 text-gray-600' },
  { value: 'none', label: 'Brak (nigdy)', badgeClassName: 'bg-gray-50 text-gray-400' },
];

// ============== URL state — odczyt/zapis filtrów ==============

interface FiltersState {
  reservation_number: FilterValue;
  date: FilterValue;            // date-range
  tag: FilterValue;             // multi-select (Cz. 3 new)
  guardian: FilterValue;
  participant: FilterValue;
  contract_status: FilterValue;  // multi-select
  qcard_status: FilterValue;     // multi-select
  reminder: FilterValue;         // multi-select (Cz. 3 v2: bez daty per user — data tylko w kolumnie wiersza)
}

const EMPTY_FILTERS: FiltersState = {
  reservation_number: null,
  date: null,
  tag: null,
  guardian: null,
  participant: null,
  contract_status: null,
  qcard_status: null,
  reminder: null,
};

// Cz. 6 (2026-05-31): wszystkie helpery URL-aware dostaja urlPrefix.
// urlPrefix='' (main) → 'page', 'filter_X'. urlPrefix='effective_' (modal) → 'effective_page', 'effective_filter_X'.
// Backend params (w buildQueryString) NIE maja prefiksu — backend wciaz uzywa 'page', 'filter_X', tylko URL bar zmieniany.

function readFiltersFromUrl(params: URLSearchParams, urlPrefix: string = ''): FiltersState {
  const result: FiltersState = { ...EMPTY_FILTERS };

  const num = params.get(`${urlPrefix}filter_reservation_number`);
  if (num) result.reservation_number = { type: 'text', q: num };

  const dFrom = params.get(`${urlPrefix}filter_date_from`) || '';
  const dTo = params.get(`${urlPrefix}filter_date_to`) || '';
  if (dFrom || dTo) result.date = { type: 'date-range', from: dFrom, to: dTo };

  const tag = params.get(`${urlPrefix}filter_tag`);
  if (tag) result.tag = { type: 'multi-select', values: tag.split(',').filter(Boolean) };

  const guard = params.get(`${urlPrefix}filter_guardian`);
  if (guard) result.guardian = { type: 'text', q: guard };

  const part = params.get(`${urlPrefix}filter_participant`);
  if (part) result.participant = { type: 'text', q: part };

  const cs = params.get(`${urlPrefix}filter_contract_status`);
  if (cs) result.contract_status = { type: 'multi-select', values: cs.split(',').filter(Boolean) };

  const qs = params.get(`${urlPrefix}filter_qualification_card_status`);
  if (qs) result.qcard_status = { type: 'multi-select', values: qs.split(',').filter(Boolean) };

  const rCh = params.get(`${urlPrefix}filter_reminder_channel`) || '';
  if (rCh) {
    result.reminder = { type: 'multi-select', values: rCh.split(',').filter(Boolean) };
  }

  return result;
}

// Lista wszystkich kluczy URL z danym prefixem (zeby updateUrl mogl je czysto usunac przed zapisem nowych)
function ownUrlKeys(urlPrefix: string = ''): string[] {
  return [
    `${urlPrefix}page`,
    `${urlPrefix}filter_reservation_number`,
    `${urlPrefix}filter_date_from`,
    `${urlPrefix}filter_date_to`,
    `${urlPrefix}filter_tag`,
    `${urlPrefix}filter_guardian`,
    `${urlPrefix}filter_participant`,
    `${urlPrefix}filter_contract_status`,
    `${urlPrefix}filter_qualification_card_status`,
    `${urlPrefix}filter_reminder_channel`,
  ];
}

// Cz. 6 (2026-05-31): backend params BEZ urlPrefix (backend uzywa standardowych nazw 'page', 'filter_X').
// effectiveShowOrganic dodawane tylko w mode='effective'.
function buildQueryString(
  page: number,
  filters: FiltersState,
  mode: DocumentsOverviewMode,
  effectiveShowOrganic: boolean = false,
  hideRecentReminders: boolean = false,
  hideApproved: boolean = false,
  sortBy: string | null = null,
  sortDir: 'asc' | 'desc' = 'desc',
): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(ITEMS_PER_PAGE));
  // Trello FLYLzAHA (2026-06-16): sortowanie kolumny "Ostatnia data przypomnienia".
  if (sortBy) {
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);
  }

  // Bug Ani 2026-06-01: domyślnie pokaż WSZYSTKIE; exclude_effective_reminders tylko gdy
  // checkbox „Ukryj zatwierdzone" (hideApproved). Logika w pure helperze (testowalna).
  for (const [k, v] of Object.entries(getDocumentsScopeParams(mode, { hideApproved, effectiveShowOrganic }))) {
    params.set(k, v);
  }
  // ============================================================================
  // === FRAGMENT "UKRYJ NAJNOWSZE PRZYPOMNIENIA" (Cz. 7 v2 2026-05-31, do mod.) ===
  // ============================================================================
  if (hideRecentReminders) {
    params.set('hide_recent_reminders', 'true');
  }

  if (filters.reservation_number?.type === 'text' && filters.reservation_number.q) {
    params.set('filter_reservation_number', filters.reservation_number.q);
  }
  if (filters.date?.type === 'date-range') {
    if (filters.date.from) params.set('filter_date_from', filters.date.from);
    if (filters.date.to) params.set('filter_date_to', filters.date.to);
  }
  if (filters.tag?.type === 'multi-select' && filters.tag.values.length > 0) {
    params.set('filter_tag', filters.tag.values.join(','));
  }
  if (filters.guardian?.type === 'text' && filters.guardian.q) {
    params.set('filter_guardian', filters.guardian.q);
  }
  if (filters.participant?.type === 'text' && filters.participant.q) {
    params.set('filter_participant', filters.participant.q);
  }
  if (filters.contract_status?.type === 'multi-select' && filters.contract_status.values.length > 0) {
    params.set('filter_contract_status', filters.contract_status.values.join(','));
  }
  if (filters.qcard_status?.type === 'multi-select' && filters.qcard_status.values.length > 0) {
    params.set('filter_qualification_card_status', filters.qcard_status.values.join(','));
  }
  // Cz. 3 v2: reminder filter = tylko kanały (multi-select)
  if (filters.reminder?.type === 'multi-select' && filters.reminder.values.length > 0) {
    params.set('filter_reminder_channel', filters.reminder.values.join(','));
  }
  return params.toString();
}

// Cz. 6 (2026-05-31): buildUrlSearchString teraz przyjmuje (current URL params, page, filters, urlPrefix).
// Zachowuje WSZYSTKIE inne params w URL (np. effective_modal=open, effective_page=2 itp.),
// modyfikuje TYLKO swoje (z prefixem). To pozwala modalowi i mainowi koegzystowac w jednym URL.
function buildUrlSearchString(
  currentSearch: URLSearchParams | null,
  page: number,
  filters: FiltersState,
  urlPrefix: string = '',
): string {
  // Start od istniejacych params (zachowuje wszystkie nie-swoje)
  const params = new URLSearchParams(currentSearch?.toString() || '');
  // Usun WSZYSTKIE stare swoje params (z urlPrefix)
  for (const key of ownUrlKeys(urlPrefix)) {
    params.delete(key);
  }
  // Dodaj nowe swoje params (tylko gdy non-default)
  if (page !== 1) params.set(`${urlPrefix}page`, String(page));

  if (filters.reservation_number?.type === 'text' && filters.reservation_number.q) {
    params.set(`${urlPrefix}filter_reservation_number`, filters.reservation_number.q);
  }
  if (filters.date?.type === 'date-range') {
    if (filters.date.from) params.set(`${urlPrefix}filter_date_from`, filters.date.from);
    if (filters.date.to) params.set(`${urlPrefix}filter_date_to`, filters.date.to);
  }
  if (filters.tag?.type === 'multi-select' && filters.tag.values.length > 0) {
    params.set(`${urlPrefix}filter_tag`, filters.tag.values.join(','));
  }
  if (filters.guardian?.type === 'text' && filters.guardian.q) {
    params.set(`${urlPrefix}filter_guardian`, filters.guardian.q);
  }
  if (filters.participant?.type === 'text' && filters.participant.q) {
    params.set(`${urlPrefix}filter_participant`, filters.participant.q);
  }
  if (filters.contract_status?.type === 'multi-select' && filters.contract_status.values.length > 0) {
    params.set(`${urlPrefix}filter_contract_status`, filters.contract_status.values.join(','));
  }
  if (filters.qcard_status?.type === 'multi-select' && filters.qcard_status.values.length > 0) {
    params.set(`${urlPrefix}filter_qualification_card_status`, filters.qcard_status.values.join(','));
  }
  if (filters.reminder?.type === 'multi-select' && filters.reminder.values.length > 0) {
    params.set(`${urlPrefix}filter_reminder_channel`, filters.reminder.values.join(','));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ============== Główny komponent ==============

export interface DocumentsOverviewTableProps {
  /** Cz. 5 (2026-05-31): 'active' = glowna lista (skuteczne wykluczone), 'effective' = modal Skuteczne. */
  mode?: DocumentsOverviewMode;
  /** Cz. 5: disableUrlState — historyczne (Cz. 5), zachowane dla kompatybilnosci. W Cz. 6 zastapione przez urlPrefix. */
  disableUrlState?: boolean;
  /** Cz. 6 (2026-05-31): toggle "Pokaz wszystkie podpisane" w modal Skuteczne. */
  effectiveShowOrganic?: boolean;
}

export default function DocumentsOverviewTable({
  mode = 'active',
  disableUrlState = false,
  effectiveShowOrganic = false,
}: DocumentsOverviewTableProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cz. 6 (2026-05-31): urlPrefix — main uzywa '', modal uzywa 'effective_'.
  // To pozwala obu tabelom (main + modal) wspolistniec w URL bez konfliktu paginacji/filtrow.
  const urlPrefix = mode === 'effective' ? 'effective_' : '';

  // Init z URL (raz przy mount + przy zmianie URL — np. back button)
  const initialPage = parseInt(searchParams?.get(`${urlPrefix}page`) || '1', 10) || 1;
  const initialFilters = useMemo(
    () => readFiltersFromUrl(searchParams as URLSearchParams, urlPrefix),
    [searchParams, urlPrefix],
  );

  const [rows, setRows] = useState<ReservationDocumentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [pageInputValue, setPageInputValue] = useState('');
  // Trello FLYLzAHA (2026-06-16): sortowanie kolumny "Ostatnia data przypomnienia".
  // sortBy=null → domyślne (created_at desc). Klik nagłówka cykluje: desc → asc → brak.
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cz. 5 (2026-05-31): URL state dla otwarcia modal "Skuteczne powiadomienia" (?effective_modal=open)
  const isEffectiveModalOpen = mode === 'active' && searchParams?.get('effective_modal') === 'open';

  // Cz. 5 Krok 4 (2026-05-31): state dla modalu informacyjnego "dokumenty juz podpisane"
  const [alreadySignedRez, setAlreadySignedRez] = useState<string | null>(null);
  // Cz. 7 v2 (2026-05-31): modal "Niedawno wysłano" gdy backend 400 + recently_reminded=true
  const [recentlyRemindedRez, setRecentlyRemindedRez] = useState<string | null>(null);
  // Cz. 7 v4 (2026-05-31): modal "Błąd — wyślij raz jeszcze" (4 opcje: Email/SMS/Email+SMS/Tel.)
  const [retryRez, setRetryRez] = useState<string | null>(null);

  // Cz. 5 Krok 4c (2026-05-31): wielokrotny wybor rezerwacji + cross-page select-all-filtered.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAllLoading, setSelectAllLoading] = useState(false);

  // Cz. 6 Krok 6C (2026-05-31): bulk action state — gdy != null, otwiera BulkRemindModal
  const [bulkChannel, setBulkChannel] = useState<'email' | 'sms' | 'both' | null>(null);

  // Cz. 7 (2026-05-31): scroll container ref — do scrolla tabeli do gory po zmianie strony.
  // Dziala w obu trybach (main / modal Skuteczne) bo ten sam komponent.
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  // Cz. 7 (2026-05-31): info_modal URL state — modal historii reminders dla rezerwacji.
  // Prefix dla mode='active' = '?info_modal=REZ-XXX', dla 'effective' = '?effective_info_modal=REZ-XXX'.
  const infoModalParamKey = mode === 'effective' ? 'effective_info_modal' : 'info_modal';
  const infoModalRez = searchParams?.get(infoModalParamKey) || null;

  // ============================================================================
  // === FRAGMENT "UKRYJ NAJNOWSZE PRZYPOMNIENIA" (Cz. 7 v2 2026-05-31, do mod.) ===
  // User explicit: "pamietaj ten fragment kodu bo moze zmienie troche jego logike"
  // Cz. 7 v2: rozszerzono z "dzisiaj" na ostatnie 3 dni Warsaw (blue 0/1/2 dni).
  // Plus nowy "allow_recent" — odblokowuje moznosc wyslania reminderu mimo niedawnego.
  // ============================================================================
  const hideRecentReminders = mode === 'active' && searchParams?.get('hide_recent') === 'true';
  const allowRecentReminders = mode === 'active' && searchParams?.get('allow_recent') === 'true';
  // Bug Ani 2026-06-01: checkbox „Ukryj zatwierdzone" (domyślnie odznaczony → wszystkie).
  // Stan pamiętany w URL identycznie jak hide_recent / allow_recent.
  const hideApproved = mode === 'active' && searchParams?.get('hide_approved') === 'true';
  const toggleHideRecent = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (hideRecentReminders) {
      params.delete('hide_recent');
    } else {
      params.set('hide_recent', 'true');
    }
    router.replace(`/admin-panel/documents?${params.toString()}`, { scroll: false });
  }, [searchParams, router, hideRecentReminders]);
  const toggleAllowRecent = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (allowRecentReminders) {
      params.delete('allow_recent');
    } else {
      params.set('allow_recent', 'true');
    }
    router.replace(`/admin-panel/documents?${params.toString()}`, { scroll: false });
  }, [searchParams, router, allowRecentReminders]);
  const toggleHideApproved = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (hideApproved) {
      params.delete('hide_approved');
    } else {
      params.set('hide_approved', 'true');
    }
    router.replace(`/admin-panel/documents?${params.toString()}`, { scroll: false });
  }, [searchParams, router, hideApproved]);

  // Sync URL ↔ state przy zewnętrznych zmianach URL (np. back/forward).
  // Cz. 6: czyta tylko swoje params (z urlPrefix), modal nie reaguje na zmiany main, main nie reaguje na modal.
  // Cz. 7 fix (2026-05-31): porownanie GLEBOKIE filters (JSON.stringify) zeby nie wywolywac setFilters
  // z identycznymi wartosciami — zapobiega kaskadzie 2x request przy router.replace na URL state
  // (np. toggleHideRecent). Wczesniej setFilters tworzylo nowy ref → fetchPage useEffect → 2 request.
  useEffect(() => {
    if (disableUrlState) return;
    const urlPage = parseInt(searchParams?.get(`${urlPrefix}page`) || '1', 10) || 1;
    const urlFilters = readFiltersFromUrl(searchParams as URLSearchParams, urlPrefix);
    if (urlPage !== currentPage) setCurrentPage(urlPage);
    // Tylko setFilters gdy GLEBOKO inne (json compare — filters to plytka struktura, OK)
    setFilters((prev) => (JSON.stringify(prev) === JSON.stringify(urlFilters) ? prev : urlFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, disableUrlState, urlPrefix]);

  // Cz. 7 fix (2026-05-31): dedupe requestow. Wczesniej kaskada useEffectow + Strict Mode
  // generowala 2-3 requesty na zmiane. Teraz: useRef trzyma ostatni token, fetchPage sprawdza
  // czy jego wynik jest aktualny (jesli pojawil sie nowszy token → ignoruje response).
  // Strict Mode w dev dalej zrobi 2 wywolania efektu, ale tylko OSTATNIE wynik trafi do state.
  const fetchTokenRef = useRef(0);

  const fetchPage = useCallback(async (page: number, f: FiltersState) => {
    const token = ++fetchTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString(page, f, mode, effectiveShowOrganic, hideRecentReminders, hideApproved, sortBy, sortDir);
      const data = await authenticatedApiCall<PaginatedResponse>(
        `/api/reservations/paginated?${qs}`,
      );
      // Ignoruj response gdy jest juz nowszy fetch w toku (np. user kliknal checkbox w trakcie)
      if (token !== fetchTokenRef.current) return;
      setRows(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      if (token !== fetchTokenRef.current) return;
      setError(err instanceof Error ? err.message : 'Nieznany błąd ładowania danych');
      setRows([]);
      setPagination(null);
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, [mode, effectiveShowOrganic, hideRecentReminders, hideApproved, sortBy, sortDir]);

  useEffect(() => {
    fetchPage(currentPage, filters);
  }, [currentPage, filters, fetchPage]);

  // Trello FLYLzAHA: klik nagłówka "Ostatnia data przypomnienia" cykluje sortowanie:
  // desc (najmłodsze pierwsze) → asc (najstarsze) → brak (domyślne created_at). Reset do strony 1.
  const toggleReminderSort = useCallback(() => {
    setCurrentPage(1);
    if (sortBy !== 'last_reminder_at') {
      setSortBy('last_reminder_at');
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortBy(null);
      setSortDir('desc');
    }
  }, [sortBy, sortDir]);

  // Cz. 5 (2026-05-31): toggle modal Skuteczne — URL state ?effective_modal=open
  // Cz. 6 (2026-05-31): zachowujemy WSZYSTKIE inne params w URL (vs poprzednio buildUrlSearchString budowal nowy).
  const openEffectiveModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('effective_modal', 'open');
    router.replace(`/admin-panel/documents?${params.toString()}`, { scroll: false });
  };
  const closeEffectiveModal = () => {
    // Zamykamy modal: usun ?effective_modal=open + WSZYSTKIE jego params (effective_page, effective_filter_X, effective_show_organic)
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('effective_modal');
    params.delete('effective_show_organic');
    for (const key of ownUrlKeys('effective_')) {
      params.delete(key);
    }
    const s = params.toString();
    router.replace(`/admin-panel/documents${s ? `?${s}` : ''}`, { scroll: false });
  };

  // Cz. 5 Krok 4 (2026-05-31): live update wiersza po sukcesie wysylki reminderu.
  // Bez F5 — kolumna "Ostatnia data przypomnienia" + kolor wiersza przelicza sie automatycznie
  // (computeReminderRowColor patrzy na row.last_reminder ktore wlasnie aktualizujemy).
  // ============================================================================
  // === FRAGMENT "UKRYJ NAJNOWSZE POWIADOMIENIA" — LIVE HIDE (do mod. wg user) ===
  // Cz. 7 (2026-05-31). Jesli hideRecentReminders=true I reminder zakonczyl sie sukcesem
  // (channel != 'failed') → wiersz znika z `rows` (live, bez F5).
  // ============================================================================
  const handleReminderSent = useCallback(
    (rowId: number) => (channel: 'email' | 'sms' | 'both' | 'failed' | 'phone_call', at: string) => {
      // Cz. 7 v4 (2026-05-31): phone_call to TEZ sukces (admin powiadomil tel.) — live hide
      if (hideRecentReminders && channel !== 'failed') {
        // Reminder zadzialal LUB phone_call + hideRecent aktywny → znika z listy
        setRows((prev) => prev.filter((r) => r.id !== rowId));
      } else {
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? { ...r, last_reminder: { at, channel } } : r,
          ),
        );
      }
    },
    [hideRecentReminders],
  );

  const handleAlreadySigned = useCallback(
    (rezNumber: string) => () => {
      setAlreadySignedRez(rezNumber);
    },
    [],
  );

  // Cz. 7 v2 (2026-05-31): callback gdy backend 400 + recently_reminded → modal "Niedawno wysłano"
  const handleRecentlyReminded = useCallback(
    (rezNumber: string) => () => {
      setRecentlyRemindedRez(rezNumber);
    },
    [],
  );

  // Cz. 7 (2026-05-31): scroll tabeli do gory po zmianie strony.
  // Wywolywane z handlePageChange + handlePageInputKeyDown.
  const scrollTableToTop = useCallback(() => {
    tableScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Cz. 7 (2026-05-31): toggle modal "Informacje" — historia reminders dla rezerwacji.
  const openInfoModal = useCallback((rezNumber: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set(infoModalParamKey, rezNumber);
    router.replace(`/admin-panel/documents?${params.toString()}`, { scroll: false });
  }, [searchParams, router, infoModalParamKey]);
  const closeInfoModal = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete(infoModalParamKey);
    const s = params.toString();
    router.replace(`/admin-panel/documents${s ? `?${s}` : ''}`, { scroll: false });
  }, [searchParams, router, infoModalParamKey]);

  // Cz. 5 Krok 4b (2026-05-31): UX feedback usera — czy jakikolwiek filtr jest aktywny
  // (do podswietlenia X + nazwy kolumny na pomaranczowo + pokazania przycisku "Usun ustawione filtry")
  const activeFilterKeys = useMemo(
    () => (Object.keys(filters) as (keyof FiltersState)[]).filter((k) => filters[k] !== null),
    [filters],
  );
  const hasActiveFilters = activeFilterKeys.length > 0;

  const clearAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    updateUrl(1, EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: warunkowa klasa pomaranczowa dla nazwy kolumny gdy jej filtr aktywny.
  // BEZ zmiany font-weight/size/padding zeby strona nie "skakala" (CLAUDE.md UX feedback usera 2026-05-31).
  // text-orange-600 ma identyczna szerokosc co text-gray-600 (sam color zmienia).
  const colNameClass = (filterKey: keyof FiltersState): string =>
    filters[filterKey] !== null ? 'text-orange-600' : '';

  // ============== Cz. 5 Krok 4c (2026-05-31): wielokrotny wybor + select-all-filtered ==============

  // Cz. 7 fix (2026-05-31): master checkbox = 1 klik zaznacza WSZYSTKO przefiltrowane (cross-page).
  // Wczesniej: master zaznaczal tylko biezaca strone + banner "Zaznacz wszystkie X" wymagal 2-go kliku.
  // Teraz: 1 klik → fetch IDs + zaznacz wszystkie. Wzorzec: jak Gmail "select all in inbox".
  const pageRowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const totalFiltered = pagination?.total ?? 0;
  const allFilteredSelected = totalFiltered > 0 && selectedIds.size >= totalFiltered;
  const someSelected = selectedIds.size > 0 && !allFilteredSelected;

  function toggleRowSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // 1 klik master = WSZYSTKO przefiltrowane (fetch IDs gdy nie wszystko jeszcze zaznaczone).
  // Drugi klik (gdy wszystko zaznaczone) = odznacz wszystko.
  async function toggleAllFiltered() {
    if (selectAllLoading) return;
    if (allFilteredSelected) {
      // Odznacz wszystko
      setSelectedIds(new Set());
      return;
    }
    // Fetch wszystkich IDs z aktualnymi filtrami
    setSelectAllLoading(true);
    try {
      const qs = buildQueryString(1, filters, mode, effectiveShowOrganic, hideRecentReminders);
      const params = new URLSearchParams(qs);
      params.delete('page');
      params.delete('limit');
      params.set('return_ids_only', 'true');
      const data = await authenticatedApiCall<{ ids: number[] }>(
        `/api/reservations/paginated?${params.toString()}`,
      );
      setSelectedIds(new Set(data.ids || []));
    } catch (err) {
      console.error('[toggleAllFiltered] błąd:', err);
    } finally {
      setSelectAllLoading(false);
    }
  }

  function updateUrl(page: number, f: FiltersState) {
    if (disableUrlState) return;
    // Cz. 6 (2026-05-31): buildUrlSearchString zachowuje WSZYSTKIE inne URL params (z drugiej tabeli),
    // modyfikuje TYLKO swoje (z urlPrefix). Pozwala mainowi + modalowi koegzystowac w URL.
    const search = buildUrlSearchString(searchParams as URLSearchParams, page, f, urlPrefix);
    router.replace(`/admin-panel/documents${search}`, { scroll: false });
  }

  function setFilter<K extends keyof FiltersState>(key: K, value: FilterValue) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1); // reset paginacji przy zmianie filtra
    updateUrl(1, newFilters);
  }

  /**
   * Cz. 4 (2026-05-29): link do widoku rezerwacji w sekcji #dokumenty z returnTo do TEGO widoku
   * (z zachowanymi filtrami + paginacją). Po powrocie z rezerwacji user wraca dokładnie tu gdzie był.
   */
  function buildReservationLink(reservationNumber: string): string {
    const returnTo = `/admin-panel/documents${buildUrlSearchString(searchParams as URLSearchParams, currentPage, filters, urlPrefix)}`;
    const encodedReturn = encodeURIComponent(returnTo);
    return `/admin-panel/rezerwacja/${reservationNumber}?returnTo=${encodedReturn}#dokumenty`;
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setPageInputValue('');
    updateUrl(page, filters);
    scrollTableToTop();
  };

  const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const n = parseInt(pageInputValue, 10);
    if (!isNaN(n) && pagination && n >= 1 && n <= pagination.total_pages) {
      setCurrentPage(n);
      setPageInputValue('');
      updateUrl(n, filters);
      scrollTableToTop();
    }
  };

  const thBase = 'px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide';

  return (
    // Cz. 4 (2026-05-29): sticky header tabeli + sticky paginacja na dole.
    // `absolute inset-0` żeby zająć cały `<main>` (który w AdminLayout ma overflow-auto) —
    // wewnątrz mamy własny scroll container TYLKO dla tbody, header tabeli i pagination zostają na miejscu.
    <div className={mode === 'effective' ? 'flex flex-col bg-white h-full' : 'absolute inset-0 flex flex-col bg-white'}>
      <div className="flex-shrink-0 px-4 py-3 border-b bg-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === 'effective' ? 'Skuteczne powiadomienia' : 'Dokumenty'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mode === 'effective'
              ? 'Rezerwacje gdzie OBA dokumenty (umowa + karta) zostaly podpisane SMS-em. Po przypomnieniu = klient zareagowal na reminder. Klient sam = podpisal bez przypomnienia.'
              : 'Lista rezerwacji ze statusami umowy i karty kwalifikacyjnej. Filtry przy każdej kolumnie (▼). Rezerwacje gdzie OBA dokumenty zostaly podpisane SMS-em znajdziesz w "Skuteczne powiadomienia".'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {loading && rows.length > 0 && (
            <RefreshCw className="w-4 h-4 animate-spin text-[#03adf0]" />
          )}
          {/* Cz. 5 Krok 4b (2026-05-31): mocno widoczny pomaranczowy przycisk gdy aktywne filtry */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center px-3 py-1.5 text-sm font-semibold border-2 border-orange-500 bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer transition-colors"
              title={`Usun wszystkie ustawione filtry (${activeFilterKeys.length})`}
            >
              <FilterX className="w-4 h-4 mr-1.5" />
              Usuń ustawione filtry ({activeFilterKeys.length})
            </button>
          )}
          {/* Cz. 6 Krok 6C (2026-05-31): bulk action buttons — wyswietlane gdy zaznaczono >=1 rezerwacje (tylko mode='active') */}
          {mode === 'active' && selectedIds.size > 0 && (
            <>
              <span className="text-sm font-medium text-gray-700 pr-1 border-r border-gray-300 mr-1">
                Akcja dla {selectedIds.size}:
              </span>
              <button
                type="button"
                onClick={() => setBulkChannel('email')}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                title={`Wyslij Email do ${selectedIds.size} zaznaczonych`}
              >
                <Mail className="w-4 h-4 mr-1.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setBulkChannel('sms')}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                title={`Wyslij SMS do ${selectedIds.size} zaznaczonych`}
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                SMS
              </button>
              <button
                type="button"
                onClick={() => setBulkChannel('both')}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium border bg-slate-700 border-slate-700 text-white hover:bg-slate-800 cursor-pointer transition-colors"
                title={`Wyslij Email + SMS do ${selectedIds.size} zaznaczonych`}
              >
                <Send className="w-4 h-4 mr-1.5" />
                Email + SMS
              </button>
            </>
          )}
          {/* ======================================================================== */}
          {/* === FRAGMENT "UKRYJ NAJNOWSZE PRZYPOMNIENIA" — CHECKBOX (do mod.) === */}
          {/* User explicit Cz. 7 v2 (2026-05-31): rename "powiadomienia" → "przypomnienia" */}
          {/* + nowy checkbox "Odblokuj zablokowane przypomnienia" obok (logika 3 dni Warsaw) */}
          {/* ======================================================================== */}
          {mode === 'active' && (
            <label
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              title="Ukryj rezerwacje gdzie w ostatnich 3 dniach (dzis/wczoraj/przedwczoraj) wyslano Email / SMS / Email+SMS (failed nie liczy)."
            >
              <input
                type="checkbox"
                checked={hideRecentReminders}
                onChange={toggleHideRecent}
                className="w-4 h-4 cursor-pointer accent-orange-600"
              />
              Ukryj najnowsze przypomnienia
            </label>
          )}
          {mode === 'active' && (
            <label
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              title="Odblokuj mozliwosc wyslania reminderu mimo niedawnego (≤2 dni). Bez tego przyciski przy 'swiezo przypomnianych' sa zablokowane, a bulk pomija je."
            >
              <input
                type="checkbox"
                checked={allowRecentReminders}
                onChange={toggleAllowRecent}
                className="w-4 h-4 cursor-pointer accent-orange-600"
              />
              Odblokuj zablokowane przypomnienia
            </label>
          )}
          {mode === 'active' && (
            <label
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              title="Ukryj rezerwacje, gdzie OBA dokumenty sa juz w pelni podpisane/zatwierdzone (domyslnie pokazujemy wszystkie)."
            >
              <input
                type="checkbox"
                checked={hideApproved}
                onChange={toggleHideApproved}
                className="w-4 h-4 cursor-pointer accent-orange-600"
              />
              Ukryj zatwierdzone
            </label>
          )}
          {mode === 'active' && (
            <button
              type="button"
              onClick={openEffectiveModal}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium border bg-green-50 border-green-300 text-green-800 hover:bg-green-100 cursor-pointer transition-colors"
              title="Pokaz rezerwacje gdzie OBA dokumenty zostaly podpisane SMS-em"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Skuteczne powiadomienia
            </button>
          )}
        </div>
      </div>

      {/* Cz. 7 fix (2026-05-31): banner zaznaczenia — uproszczony.
          Master checkbox JUZ zaznacza wszystko 1 klikiem (bez 2-stopniowego flow). Banner pokazuje
          tylko licznik + Wyczysc. Brak dwustopniowego przycisku "Zaznacz wszystkie X". */}
      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-orange-50 border-b border-orange-300 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-orange-900">
            <span className="font-semibold">Zaznaczono: {selectedIds.size}</span>
            {selectedIds.size < totalFiltered && (
              <span className="ml-2 text-orange-700">
                z {totalFiltered} przefiltrowanych — kliknij checkbox w nagłówku żeby zaznaczyć wszystkie
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-orange-700 hover:text-orange-900 underline cursor-pointer"
          >
            Wyczyść zaznaczenie
          </button>
        </div>
      )}

      <div ref={tableScrollRef} className="flex-1 overflow-auto bg-white min-h-0">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-[#03adf0]" />
          </div>
        ) : error ? (
          <div className="p-6 m-4 text-red-700 bg-red-50 border border-red-200">
            <div className="font-medium">Błąd ładowania danych</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm border-b border-gray-300">
              <tr>
                {/* Cz. 7 fix (2026-05-31): master = 1 klik zaznacza WSZYSTKO przefiltrowane (cross-page) */}
                <th className={`${thBase} w-10`}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      // indeterminate gdy czesc zaznaczona (ale nie wszystko)
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAllFiltered}
                    disabled={selectAllLoading}
                    className="w-4 h-4 cursor-pointer accent-orange-600 disabled:opacity-50"
                    title={
                      selectAllLoading
                        ? 'Pobieranie wszystkich…'
                        : allFilteredSelected
                          ? `Odznacz wszystko (${selectedIds.size})`
                          : `Zaznacz WSZYSTKIE ${totalFiltered} ${someSelected ? `(zamiast ${selectedIds.size} aktualnie)` : ''}`
                    }
                  />
                </th>
                {/* Cz. 5 Krok 4c (2026-05-31): kolumna LP - liczba porzadkowa z paginacja */}
                <th className={`${thBase} w-12`}>LP</th>
                <th className={thBase}>
                  <span className={colNameClass('reservation_number')}>Numer rezerwacji</span>
                  <ColumnFilter
                    type="text"
                    value={filters.reservation_number}
                    onChange={(v) => setFilter('reservation_number', v)}
                    columnLabel="Numer rezerwacji"
                    textPlaceholder="np. REZ-2026"
                  />
                </th>
                <th className={thBase}>
                  <span className={colNameClass('date')}>Data rezerwacji</span>
                  <ColumnFilter
                    type="date-range"
                    value={filters.date}
                    onChange={(v) => setFilter('date', v)}
                    columnLabel="Data rezerwacji"
                  />
                </th>
                <th className={thBase}>
                  <span className={colNameClass('tag')}>Tag turnusu</span>
                  <ColumnFilter
                    type="multi-select"
                    value={filters.tag}
                    onChange={(v) => setFilter('tag', v)}
                    columnLabel="Tag turnusu"
                    multiOptions={TAG_OPTIONS}
                  />
                </th>
                <th className={thBase}>
                  <span className={colNameClass('guardian')}>Opiekun</span>
                  <ColumnFilter
                    type="text"
                    value={filters.guardian}
                    onChange={(v) => setFilter('guardian', v)}
                    columnLabel="Opiekun"
                    textPlaceholder="imię/nazwisko/telefon"
                  />
                </th>
                <th className={thBase}>
                  <span className={colNameClass('participant')}>Uczestnik</span>
                  <ColumnFilter
                    type="text"
                    value={filters.participant}
                    onChange={(v) => setFilter('participant', v)}
                    columnLabel="Uczestnik"
                    textPlaceholder="imię lub nazwisko"
                  />
                </th>
                <th className={thBase}>
                  <span className={colNameClass('contract_status')}>Umowa</span>
                  <ColumnFilter
                    type="multi-select"
                    value={filters.contract_status}
                    onChange={(v) => setFilter('contract_status', v)}
                    columnLabel="Status umowy"
                    multiOptions={DOC_STATUS_OPTIONS}
                  />
                </th>
                <th className={thBase}>
                  <span className={colNameClass('qcard_status')}>Karta kwalif.</span>
                  <ColumnFilter
                    type="multi-select"
                    value={filters.qcard_status}
                    onChange={(v) => setFilter('qcard_status', v)}
                    columnLabel="Status karty kwalifikacyjnej"
                    multiOptions={DOC_STATUS_OPTIONS}
                  />
                </th>
                <th className={thBase}>
                  <span
                    className={`${colNameClass('reminder')} cursor-pointer select-none inline-flex items-center gap-1 hover:text-[#03adf0]`}
                    onClick={toggleReminderSort}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleReminderSort(); } }}
                    title="Sortuj wg ostatniej daty przypomnienia (klik: najmłodsze → najstarsze → domyślne)"
                  >
                    Ostatnia data przypomnienia
                    {sortBy === 'last_reminder_at'
                      ? (sortDir === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />)
                      : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                  </span>
                  <ColumnFilter
                    type="multi-select"
                    value={filters.reminder}
                    onChange={(v) => setFilter('reminder', v)}
                    columnLabel="Kanał ostatniego przypomnienia"
                    multiOptions={REMINDER_CHANNEL_OPTIONS}
                  />
                </th>
                {mode === 'effective' && (
                  <th className={thBase}>
                    Powód podpisu
                  </th>
                )}
                <th className={thBase}>
                  Przypomnij
                </th>
                <th className={thBase}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-gray-300">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={mode === 'effective' ? 13 : 12} className="px-3 py-8 text-center text-sm text-gray-500">
                    Brak rezerwacji spełniających kryteria.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const guardian = formatGuardian(row.parents_data);
                  // Cz. 5 (2026-05-31): kolor wiersza wedlug ostatniego reminderu w mode='active'
                  //   (red = brak/failed/5+, orange = 3-4d, blue = 0-2d)
                  // Cz. 6 (2026-05-31): w mode='effective' kolor wg signing_reason:
                  //   after_reminder → bg-green-50 (jasnozielony, klient zareagowal)
                  //   organic_no_reminder → bg-sky-50 (jasnoblekitny, klient sam)
                  let rowColorClass: string;
                  if (mode === 'effective') {
                    if (row.signing_reason === 'after_reminder') {
                      rowColorClass = 'bg-green-50 hover:bg-green-100';
                    } else if (row.signing_reason === 'organic_no_reminder') {
                      rowColorClass = 'bg-sky-50 hover:bg-sky-100';
                    } else {
                      rowColorClass = 'hover:bg-gray-50';
                    }
                  } else {
                    // User 2026-06-01: oba dokumenty zatwierdzone → zielony (gotowe), niezależnie od
                    // daty przypomnienia. Inaczej kolor wg ostatniego przypomnienia (red/orange/blue).
                    rowColorClass = getRowColorClass(
                      computeActiveRowColor(row.contract_status, row.qualification_card_status, row.last_reminder),
                    );
                  }
                  const isSelected = selectedIds.has(row.id);
                  // LP uwzglednia paginacje: strona 2 limit 20 → LP startuje od 21
                  const lp = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <tr key={row.id} className={`${rowColorClass} align-top ${isSelected ? 'ring-2 ring-orange-400 ring-inset' : ''}`}>
                      {/* Checkbox per row */}
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelected(row.id)}
                          className="w-4 h-4 cursor-pointer accent-orange-600 mt-1"
                          title={isSelected ? 'Odznacz' : 'Zaznacz'}
                        />
                      </td>
                      {/* LP — paginacja-aware */}
                      <td className="px-3 py-2 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                        {lp}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {row.reservation_number || `#${row.id}`}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {row.property_tag ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                            {row.property_tag}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <div className="text-gray-900">{guardian.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{guardian.phone}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {formatParticipant(row)}
                      </td>
                      <td className="px-3 py-2">
                        <DocumentStatusBadge
                          status={row.contract_status}
                          rejectionReason={row.contract_rejection_reason}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <DocumentStatusBadge
                          status={row.qualification_card_status}
                          rejectionReason={row.qualification_card_rejection_reason}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {row.last_reminder ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-700 whitespace-nowrap">
                              {formatDateTime(row.last_reminder.at)}
                            </span>
                            {/* Cz. 7 (2026-05-31): "ile dni temu" pod data w nawiasie */}
                            <span className="text-xs text-gray-500">
                              ({formatDaysAgoPL(row.last_reminder.at)})
                            </span>
                            {/* Cz. 7 v4 (2026-05-31): channel='failed' → przycisk "Błąd — wyslij raz jeszcze" zamiast badge */}
                            {row.last_reminder.channel === 'failed' ? (
                              row.reservation_number ? (
                                <button
                                  type="button"
                                  onClick={() => setRetryRez(row.reservation_number!)}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium border bg-orange-50 border-orange-400 text-orange-800 hover:bg-orange-100 cursor-pointer transition-colors w-fit"
                                  title="Poprzednia wysyłka padła. Kliknij żeby wybrać sposób ponownej akcji."
                                >
                                  Błąd — wyślij raz jeszcze
                                </button>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium w-fit bg-gray-100 text-gray-600">
                                  Próba — błąd
                                </span>
                              )
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium w-fit ${getChannelBadge(row.last_reminder.channel).className}`}
                              >
                                {getChannelBadge(row.last_reminder.channel).label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            nigdy nie wysłano przypomnienia
                          </span>
                        )}
                      </td>
                      {mode === 'effective' && (
                        <td className="px-3 py-2">
                          {row.signing_reason === 'after_reminder' ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800"
                              title="Klient podpisal OBA dokumenty PO przypomnieniu admina — reminder zadzialal"
                            >
                              Po przypomnieniu
                            </span>
                          ) : (row.signing_reason === 'organic_no_reminder' || row.signing_reason === 'organic_post_factum') ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700"
                              title="Klient sam podpisal umowe / karte kwalifikacyjna (bez przypomnienia lub przed przypomnieniem)"
                            >
                              Klient sam
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        {mode === 'effective' ? (
                          <span
                            className="text-xs text-gray-400"
                            title="Nie trzeba — dokumenty sa juz podpisane przez klienta SMS-em"
                          >
                            Niedostępne
                          </span>
                        ) : row.reservation_number ? (
                          (() => {
                            // === FRAGMENT "UKRYJ NAJNOWSZE PRZYPOMNIENIA" — DISABLE (do mod.) ===
                            // Cz. 7 v2: gdy reminder ≤2 dni + NIE allowRecent → przyciski disabled.
                            const recentBlocked = isRecentReminder(row.last_reminder?.at) && !allowRecentReminders;
                            return (
                              <DocumentReminderButtons
                                reservationNumber={row.reservation_number}
                                documentType="both"
                                onReminderSent={handleReminderSent(row.id)}
                                onAlreadySigned={handleAlreadySigned(row.reservation_number)}
                                onRecentlyReminded={handleRecentlyReminded(row.reservation_number)}
                                disabled={recentBlocked}
                                disabledTooltip={recentBlocked ? "Niedawno wysłano przypomnienie. Zaznacz 'Odblokuj zablokowane przypomnienia' żeby wysłać ponownie." : undefined}
                                allowRecentReminders={allowRecentReminders}
                              />
                            );
                          })()
                        ) : (
                          <span className="text-xs text-gray-400">— brak numeru</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.reservation_number ? (
                          <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                            {/* Cz. 7 (2026-05-31): powiekszony przycisk Dokumenty (px-3 py-2 text-sm zamiast px-2 py-1 text-xs) */}
                            <Link
                              href={buildReservationLink(row.reservation_number)}
                              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                              title={`Otwórz rezerwację ${row.reservation_number} → sekcja Dokumenty`}
                            >
                              <FileText className="w-4 h-4 mr-1.5" />
                              Dokumenty
                            </Link>
                            {/* Cz. 7 (2026-05-31): nowy przycisk "Informacje" — otwiera modal historii reminderow */}
                            <button
                              type="button"
                              onClick={() => openInfoModal(row.reservation_number!)}
                              className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                              title={`Pokaż historię wszystkich przypomnień dla ${row.reservation_number}`}
                            >
                              <Info className="w-3.5 h-3.5 mr-1.5" />
                              Informacje
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {pagination && (
        <TablePaginationBar
          itemLabel="rezerwacji"
          total={pagination.total}
          itemsPerPage={pagination.limit}
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={handlePageChange}
          pageInputValue={pageInputValue}
          onPageInputChange={handlePageInputChange}
          onPageInputKeyDown={handlePageInputKeyDown}
        />
      )}

      {/* Cz. 5 (2026-05-31): modal "Skuteczne powiadomienia" — tylko w trybie 'active' */}
      {mode === 'active' && (
        <EffectiveRemindersModal
          isOpen={isEffectiveModalOpen}
          onClose={closeEffectiveModal}
        />
      )}

      {/* Cz. 5 Krok 4 (2026-05-31): modal informacyjny "dokumenty juz podpisane" — defensywa backend */}
      <AlreadySignedInfoModal
        isOpen={alreadySignedRez !== null}
        reservationNumber={alreadySignedRez}
        onClose={() => setAlreadySignedRez(null)}
      />

      {/* Cz. 7 (2026-05-31): modal historii przypomnien — URL state ?info_modal=REZ-XXX (lub effective_info_modal=). */}
      <ReminderHistoryModal
        isOpen={infoModalRez !== null}
        reservationNumber={infoModalRez}
        onClose={closeInfoModal}
      />

      {/* Cz. 7 v2 (2026-05-31): modal "Niedawno wysłano przypomnienie" — defensywa recently_reminded */}
      <RecentlyRemindedInfoModal
        isOpen={recentlyRemindedRez !== null}
        reservationNumber={recentlyRemindedRez}
        onClose={() => setRecentlyRemindedRez(null)}
      />

      {/* Cz. 7 v4 (2026-05-31): modal "Błąd — wyślij raz jeszcze" — 4 opcje (Email/SMS/Email+SMS/Tel.) */}
      <RetryReminderModal
        isOpen={retryRez !== null}
        reservationNumber={retryRez}
        onClose={() => setRetryRez(null)}
        onReminderSent={(rezNumber, channel, at) => {
          // Live update wiersza w state
          const rowId = rows.find((r) => r.reservation_number === rezNumber)?.id;
          if (rowId !== undefined) {
            handleReminderSent(rowId)(channel, at);
          }
        }}
      />

      {/* Cz. 6 Krok 6C (2026-05-31): bulk reminder modal — progress bar dla N rezerwacji */}
      {bulkChannel !== null && (
        <BulkRemindModal
          isOpen={true}
          reservationIds={Array.from(selectedIds)}
          channel={bulkChannel}
          allowRecentReminders={allowRecentReminders}
          onClose={() => setBulkChannel(null)}
          onRowUpdated={(rezId, ch, at) => {
            // Live update wiersza na biezacej stronie — kolumna "Ostatnia data" + kolor wiersza
            // Cz. 7 (2026-05-31): jesli hideRecentReminders + sukces → wiersz znika z listy
            if (hideRecentReminders && ch !== 'failed') {
              setRows((prev) => prev.filter((r) => r.id !== rezId));
            } else {
              setRows((prev) =>
                prev.map((r) =>
                  r.id === rezId ? { ...r, last_reminder: { at, channel: ch } } : r,
                ),
              );
            }
          }}
        />
      )}
    </div>
  );
}
