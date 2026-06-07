/**
 * Pure function: oblicza wariant koloru wiersza w tabeli Dokumenty na podstawie
 * ostatniego przypomnienia (data + kanal).
 *
 * Wzorzec: Pure function (CLAUDE.md sekcja "Architektura", jak computeReservationStatusLabel).
 * Testowalna bez DOM/Next/auth → tests/unit/computeReminderRowColor.test.ts.
 *
 * Reguly biznesowe (potwierdzone przez usera 2026-05-31 + decyzje D1-D4):
 *  - lastReminder = null → 'red' ("nigdy nie bylo przypomnienia bo mamy 5+")
 *  - channel = 'failed' → 'red' (klient nic nie dostal = de facto brak reminderu, fail-loud)
 *  - dni kalendarzowe w strefie Europe/Warsaw od daty remindera do "teraz":
 *      0-2 dni  → 'blue'
 *      3-4 dni  → 'orange'
 *      5+ dni   → 'red'
 *  - data przyszla (clock skew) → 'blue' (jak 0 dni)
 *  - niepoprawna data → 'none' (defensywnie)
 */

export type ReminderChannel = 'email' | 'sms' | 'both' | 'failed' | 'phone_call';
export type ReminderColorVariant = 'red' | 'orange' | 'blue' | 'green' | 'none';

export interface LastReminderInput {
  at: string;
  channel: ReminderChannel;
}

export function parseToDateDefensive(iso: string): Date | null {
  if (!iso) return null;
  const hasTzInfo = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasTzInfo ? iso : iso + 'Z';
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function getWarsawDateString(d: Date): string {
  // Zwraca "YYYY-MM-DD" dla momentu d wyrazonego w strefie Europe/Warsaw.
  // Uzywamy 'en-CA' bo daje ISO format YYYY-MM-DD (a 'pl-PL' DD.MM.YYYY).
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function daysBetweenWarsaw(reminder: Date, now: Date): number {
  // Roznica dni kalendarzowych w strefie Warsaw (NIE 24-godzinnych blokow).
  // "Wczoraj o 23:55" vs "dzis o 00:05" = 1 dzien (nie 0).
  const r = getWarsawDateString(reminder);
  const n = getWarsawDateString(now);
  const rUtc = new Date(r + 'T00:00:00Z');
  const nUtc = new Date(n + 'T00:00:00Z');
  return Math.floor((nUtc.getTime() - rUtc.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Cz. 7 v2 (2026-05-31): czy reminder jest "recent" (≤2 dni Warsaw = blue tlo wiersza).
 * Uzywane do disable-owania reminder buttonow gdy admin NIE zaznaczyl "Odblokuj zablokowane".
 * Spojne z computeReminderRowColor (blue = 0/1/2 dni).
 */
export function isRecentReminder(
  reminderIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!reminderIso) return false;
  const r = parseToDateDefensive(reminderIso);
  if (r === null) return false;
  const days = daysBetweenWarsaw(r, now);
  return days >= 0 && days <= 2;
}

/**
 * Cz. 7 (2026-05-31): polski labelka "ile dni temu" dla daty przypomnienia.
 * Uzywa daysBetweenWarsaw (dni kalendarzowe w strefie Warsaw, NIE 24h-blokow).
 *
 * Wartosci:
 *  - null lub brak dat: 'nigdy nie wysłano przypomnienia'
 *  - 0: 'dzisiaj'
 *  - 1: '1 dzień temu' (singular)
 *  - 2+: 'N dni temu' (polski plural)
 *  - przyszlosc (clock skew): 'dzisiaj' (defensive)
 */
export function formatDaysAgoPL(
  reminderIso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!reminderIso) return 'nigdy nie wysłano przypomnienia';
  const r = parseToDateDefensive(reminderIso);
  if (r === null) return 'nigdy nie wysłano przypomnienia';
  const days = daysBetweenWarsaw(r, now);
  if (days <= 0) return 'dzisiaj';
  if (days === 1) return '1 dzień temu';
  return `${days} dni temu`;
}

export function computeReminderRowColor(
  lastReminder: LastReminderInput | null,
  now: Date = new Date(),
): ReminderColorVariant {
  if (lastReminder === null) return 'red';
  if (lastReminder.channel === 'failed') return 'red';

  const reminderDate = parseToDateDefensive(lastReminder.at);
  if (reminderDate === null) return 'none';

  const diffDays = daysBetweenWarsaw(reminderDate, now);

  // Data w przyszlosci (clock skew / cron error) — traktuj jak 0 dni.
  const normalizedDays = diffDays < 0 ? 0 : diffDays;

  if (normalizedDays <= 2) return 'blue';
  if (normalizedDays <= 4) return 'orange';
  return 'red';
}

function isApprovedDocStatus(status: string | null | undefined): boolean {
  // reservations.py liczy 'approved' (accepted+sms). 'accepted' obsługiwane defensywnie.
  return status === 'approved' || status === 'accepted';
}

/**
 * Kolor wiersza w widoku DOKUMENTY (mode='active').
 *
 * Bug (user 2026-06-01): po pokazaniu WSZYSTKICH rezerwacji (Zadanie 2) te z OBOMA dokumentami
 * zatwierdzonymi leciały na czerwono (bo kolor liczył się tylko z daty przypomnienia — brak świeżego
 * → 5+ dni → red). Powinny być ZIELONE (gotowe, nic do zrobienia).
 *
 * Reguła: oba dokumenty zatwierdzone → 'green'; w przeciwnym razie kolor wg ostatniego przypomnienia.
 */
export function computeActiveRowColor(
  contractStatus: string | null | undefined,
  qualificationCardStatus: string | null | undefined,
  lastReminder: LastReminderInput | null,
  now: Date = new Date(),
): ReminderColorVariant {
  if (isApprovedDocStatus(contractStatus) && isApprovedDocStatus(qualificationCardStatus)) {
    return 'green';
  }
  return computeReminderRowColor(lastReminder, now);
}

export function getRowColorClass(variant: ReminderColorVariant): string {
  switch (variant) {
    case 'green':
      return 'bg-green-50 hover:bg-green-100';
    case 'blue':
      return 'bg-sky-50 hover:bg-sky-100';
    case 'orange':
      return 'bg-orange-50 hover:bg-orange-100';
    case 'red':
      return 'bg-red-50 hover:bg-red-100';
    case 'none':
    default:
      return 'hover:bg-gray-50';
  }
}
