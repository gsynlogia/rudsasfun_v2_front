// Zapisana rezerwacja a wybory w scenariuszu: opiekun 2, faktura, zdrowie, transport, promocja, kod, ochrona, dodatek.
import { q, sql } from './config.mjs';

const parse = (text, fallback) => { try { return JSON.parse(text); } catch { return fallback; } };

function expectations(env, s) {
  const codeId = s.code ? sql(env, `SELECT id FROM promo_codes WHERE kod = ${q(s.code)}`)[0]?.id : null;
  const collective = s.transport.departure && s.transport.return;
  return {
    'opiekunowie (liczba)': [s.guardian2 === 'dwoje' ? 2 : 1, (r) => parse(r.parents_data, []).length],
    'faktura': [s.invoice === 'nie' ? 'nie' : s.invoice === 'firma' ? 'company' : 'private',
      (r) => (r.wants_invoice ? r.invoice_type : 'nie')],
    'NIP firmy': [s.invoice === 'firma' ? '5260250274' : null, (r) => (s.invoice === 'firma' ? r.invoice_nip : null)],
    'zdrowie (choroby przewlekłe)': [s.health || '', (r) => (parse(r.health_questions, {}).chronicDiseases === 'Tak'
      ? parse(r.health_details, {}).chronicDiseases : '')],
    'miasto wyjazdu': [s.transport.departure || '', (r) => r.departure_city || ''],
    'miasto powrotu': [s.transport.return || '', (r) => r.return_city || ''],
    'różne miasta (flaga)': [Boolean(collective && s.transport.departure !== s.transport.return),
      (r) => Boolean(r.transport_different_cities)],
    'promocja': [s.promotion ? s.promotion.id : null, (r) => r.promotion_v2_id],
    'kod rabatowy': [codeId ?? null, (r) => r.promo_code_id],
    'ochrona (wybrana)': [Boolean(s.protection), (r) => parse(r.selected_protection, []).length > 0],
  };
}

// Rozbieżności już zgłoszone w długu technicznym — raportowane osobno, nie oblewają scenariusza.
export const KNOWN_ISSUES = {
  'różne miasta (flaga)': 'TD-049: kreator nie wysyła transportData.differentCities (ReservationService.ts)',
};

/** Lista rozbieżności między scenariuszem a zapisem w bazie (pusta = zgodne). */
export function checkSaved(env, s, number) {
  const [row] = sql(env, `SELECT parents_data, wants_invoice, invoice_type, invoice_nip, health_questions, health_details,
    departure_city, return_city, transport_different_cities, promotion_v2_id, promo_code_id, selected_protection
    FROM reservations WHERE reservation_number = ${q(number)}`);
  return Object.entries(expectations(env, s))
    .map(([name, [expected, read]]) => ({ name, expected, actual: read(row) }))
    .filter(({ expected, actual }) => JSON.stringify(expected) !== JSON.stringify(actual));
}