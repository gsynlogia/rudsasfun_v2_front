// Cena oczekiwana scenariusza liczona wprost z cennika w bazie — niezależnie od kalkulatora aplikacji.
// Reguły (jak w ofercie): turnus + dodatki ośrodka (obowiązkowe + wybrany; sekcja ukryta = brak) + ochrona + dieta
// + transport (droższy z kierunków zbiorowych) − promocja i kod obniżający cenę (kwota dla 7 albo 10 dni).
import { q, sql } from './config.mjs';

const SEVEN_DAYS = 7;
const DAY_MS = 86400000;

function turnus(env, propertyId) {
  const [row] = sql(env, `SELECT base_price, city, days_count, start_date, end_date, hide_addons_section,
    hide_promotions_section FROM camp_properties WHERE id=${Number(propertyId)}`);
  const days = row.days_count || (Date.parse(row.end_date) - Date.parse(row.start_date)) / DAY_MS + 1;
  return { ...row, days };
}

function addonItems(env, prop, scenario) {
  if (prop.hide_addons_section) return [];
  const rows = sql(env, `SELECT DISTINCT a.name, a.price, a.is_mandatory FROM addons a
    JOIN addon_centers ac ON ac.addon_id = a.id WHERE a.is_active = 1 AND lower(ac.city) = lower(${q(prop.city)})`);
  return rows.filter((a) => a.is_mandatory || a.name === scenario.addon).map((a) => [a.name, a.price]);
}

function protectionItems(env, scenario) {
  if (!scenario.protection) return [];
  const rows = sql(env, `SELECT cpg.price FROM center_protection_turnuses cpt
    JOIN center_protection_general_protections cpg ON cpg.center_protection_id = cpt.center_protection_id
    JOIN general_protections gp ON gp.id = cpg.general_protection_id
    WHERE cpt.property_id = ${Number(scenario.propertyId)} AND gp.name = ${q(scenario.protection)}`);
  if (rows.length !== 1) throw new Error(`cennik: ochrona ${scenario.protection} — ${rows.length} cen dla turnusu`);
  return [[`Ochrona ${scenario.protection}`, rows[0].price]];
}

function dietItems(env, scenario) {
  const [row] = sql(env, `SELECT price FROM general_diets WHERE name = ${q(scenario.diet)} AND is_active = 1`);
  if (!row) throw new Error(`cennik: brak diety ${scenario.diet}`);
  return row.price ? [[`Dieta ${scenario.diet}`, row.price]] : [];
}

function transportItems(env, scenario) {
  const { departure, return: back } = scenario.transport;
  const price = (city, column) => {
    if (!city) return 0;
    const [row] = sql(env, `SELECT tc.${column} AS price FROM transport_turnuses tt
      JOIN transport_cities tc ON tc.transport_id = tt.transport_id
      WHERE tt.property_id = ${Number(scenario.propertyId)} AND tc.city = ${q(city)}`);
    if (!row) throw new Error(`cennik: brak miasta ${city} w transporcie turnusu ${scenario.propertyId}`);
    return row.price;
  };
  const amount = Math.max(price(departure, 'departure_price'), price(back, 'return_price'));
  return amount ? [['Transport', amount]] : [];
}

function discountItems(env, prop, scenario) {
  const column = prop.days <= SEVEN_DAYS ? 'kwota7' : 'kwota10';
  const items = [];
  if (scenario.promotion && !prop.hide_promotions_section) {
    const [row] = sql(env, `SELECT ${column} AS amount FROM promotions_v2 WHERE nazwa = ${q(scenario.promotion.name)}`);
    items.push([`Promocja ${scenario.promotion.name}`, -row.amount]);
  }
  if (scenario.code) {
    const [row] = sql(env, `SELECT ${column} AS amount, kategoria FROM promo_codes WHERE kod = ${q(scenario.code)}`);
    if (row.kategoria === 'obniza_cene') items.push([`Kod ${scenario.code}`, -row.amount]);
  }
  return items;
}

/** Pozycje cennika i suma dla scenariusza. */
export function expectedPrice(env, scenario) {
  const prop = turnus(env, scenario.propertyId);
  const items = [
    ['Turnus', prop.base_price],
    ...addonItems(env, prop, scenario),
    ...protectionItems(env, scenario),
    ...dietItems(env, scenario),
    ...transportItems(env, scenario),
    ...discountItems(env, prop, scenario),
  ];
  const total = Math.max(0, Math.round(items.reduce((sum, [, amount]) => sum + amount, 0) * 100) / 100);
  return { items, total };
}

/** „3 320,00 zł” / „3320,00 zł” → 3320 */
export function parseZloty(text) {
  const match = String(text).replace(/\u00a0/g, ' ').match(/(-?[\d ]+(?:,\d{1,2})?)\s*zł/);
  return match ? Number(match[1].replace(/ /g, '').replace(',', '.')) : null;
}