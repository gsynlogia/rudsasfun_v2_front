// 15 scenariuszy rezerwacji ZIMA 2027 — każda dozwolona para wartości opcji występuje co najmniej raz
// (dobór 2026-10-22: zachłanny + poprawianie, sprawdzany funkcją coverage() przy każdym uruchomieniu).
// Ograniczenia oferty: dodatki tylko Obóz Narciarski; Taneczny bez sekcji „Promocje i Rabaty” (bez promocji i kodu);
// roczniki w zakresie turnusu; miasta z cennika transportu danego terminu (Z1/Z2/Z3).

const CAMP = { ski: 41, aio: 42, chill: 43, przygoda: 44, dance: 45 };
const STANDARD = 'Komplet sprzętu narciarskiego STANDARD (narty+kijki+buty)';
const PROMO = {
  rodzenstwo: { id: 1, name: 'Rodzeństwo razem', text: { 'Wpisz imię rodzeństwa': 'Ala', 'Wpisz nazwisko rodzeństwa': 'Testowa' } },
  maxa: { id: 2, name: 'Obozy na maxa', checkbox: 'Deklaruję, że uczestnik skorzysta' },
  kdr: { id: 3, name: 'Duża rodzina', text: { 'Wpisz numer KDR': 'KDR-E2E-001' } },
};
const HEALTH = 'Astma oskrzelowa — inhalator rano i wieczorem (test e2e)';
const route = (departure, back) => ({ departure, return: back });  // null = transport własny

// kolumny: id, turnus, rodzaj, rocznik, ochrona, kod, opiekun 2, faktura, transport, zdrowie, promocja, dieta, dodatek
const ROWS = [
  ['S01', 159, 'ski', 2013, 'TARCZA', 'ZMIANA', 'brak', 'osoba', route('Katowice', 'Łódź'), null, PROMO.rodzenstwo, 'Standardowa', null],
  ['S02', 164, 'ski', 2010, 'TARCZA', 'BONBRAZOWY', 'brak', 'firma', route('Kielce', null), HEALTH, null, 'Wegetariańska', STANDARD],
  ['S03', 169, 'ski', 2018, 'OAZA', null, 'ograniczone', 'firma', route('Poznań', 'Kraków'), null, PROMO.maxa, 'Standardowa', STANDARD],
  ['S04', 159, 'ski', 2015, null, null, 'ograniczone', 'osoba', route('Tychy', 'Tychy'), null, PROMO.kdr, 'Standardowa', STANDARD],
  ['S05', 164, 'ski', 2016, null, 'ZMIANA', 'dwoje', 'nie', route(null, null), HEALTH, PROMO.rodzenstwo, 'Bez Laktozy', STANDARD],
  ['S06', 160, 'aio', 2012, null, 'BONSREBRNY', 'ograniczone', 'firma', route('Opole', 'Opole'), null, PROMO.maxa, 'Bez Glutenu', null],
  ['S07', 165, 'aio', 2013, 'OAZA', null, 'ograniczone', 'nie', route(null, 'Gdynia'), HEALTH, null, 'Standardowa', null],
  ['S08', 170, 'aio', 2014, 'OAZA', 'ZMIANA', 'ograniczone', 'osoba', route('Toruń', 'Toruń'), HEALTH, PROMO.kdr, 'Wegetariańska', null],
  ['S09', 161, 'chill', 2015, 'OAZA', 'ZMIANA', 'ograniczone', 'firma', route('Częstochowa', 'Częstochowa'), HEALTH, null, 'Bez Laktozy', null],
  ['S10', 166, 'chill', 2014, null, 'BONZLOTY', 'dwoje', 'osoba', route('Warszawa', 'Gdańsk'), null, null, 'Standardowa', null],
  ['S11', 162, 'przygoda', 2017, 'TARCZA', 'ZMIANA', 'dwoje', 'nie', route('Wrocław', 'Wrocław'), null, null, 'Bez Glutenu', null],
  ['S12', 167, 'przygoda', 2018, 'OAZA', 'BONPLATYNOWY', 'brak', 'nie', route('Radom', 'Gdynia'), null, PROMO.rodzenstwo, 'Standardowa', null],
  ['S13', 163, 'dance', 2011, 'TARCZA', null, 'ograniczone', 'osoba', route('Piotrków Trybunalski', null), null, null, 'Wegetariańska', null],
  ['S14', 168, 'dance', 2010, 'OAZA', null, 'dwoje', 'firma', route('Gdańsk', 'Kielce'), HEALTH, null, 'Bez Laktozy', null],
  ['S15', 171, 'dance', 2012, null, null, 'brak', 'nie', route('Bydgoszcz', 'Bydgoszcz'), null, null, 'Standardowa', null],
];

export const SCENARIOS = ROWS.map(([id, propertyId, kind, birthYear, protection, code, guardian2, invoice, transport,
  health, promotion, diet, addon]) => ({
  id, propertyId, kind, campId: CAMP[kind], birthYear, protection, code, guardian2, invoice, transport, health,
  promotion, diet, addon,
}));

// Poziomy opcji do sprawdzania par (wartość scenariusza → poziom).
const LEVELS = {
  kind: (s) => ({ ski: 'narciarski', dance: 'taneczny' }[s.kind] || 'inny'),
  protection: (s) => s.protection || 'brak',
  code: (s) => (!s.code ? 'brak' : s.code.startsWith('BON') ? 'bon' : 'rabat'),
  guardian2: (s) => s.guardian2,
  invoice: (s) => s.invoice,
  transport: ({ transport: t }) => (!t.departure || !t.return ? 'własny/mieszany' : t.departure === t.return ? 'jedno miasto' : 'różne miasta'),
  health: (s) => (s.health ? 'tak' : 'nie'),
  promotion: (s) => (s.promotion ? 'tak' : 'brak'),
  diet: (s) => (s.diet === 'Standardowa' ? 'standard' : 'płatna'),
  addon: (s) => (s.addon ? 'tak' : 'nie'),
};
const ALL = {
  kind: ['narciarski', 'inny', 'taneczny'], protection: ['brak', 'TARCZA', 'OAZA'], code: ['brak', 'rabat', 'bon'],
  guardian2: ['brak', 'ograniczone', 'dwoje'], invoice: ['nie', 'osoba', 'firma'],
  transport: ['jedno miasto', 'różne miasta', 'własny/mieszany'], health: ['nie', 'tak'], promotion: ['brak', 'tak'],
  diet: ['standard', 'płatna'], addon: ['nie', 'tak'],
};

// Para niemożliwa w ofercie (dodatek tylko narciarski; taneczny bez promocji i kodu).
function impossible(a, va, b, vb) {
  const rule = (x, vx, y, vy) => (x === 'kind' && vx !== 'narciarski' && y === 'addon' && vy === 'tak')
    || (x === 'kind' && vx === 'taneczny' && ((y === 'promotion' && vy === 'tak') || (y === 'code' && vy !== 'brak')));
  return rule(a, va, b, vb) || rule(b, vb, a, va);
}

/** Pary wartości opcji, których nie pokrywa żaden scenariusz (pomija pary niemożliwe w ofercie). */
export function coverage(scenarios = SCENARIOS) {
  const names = Object.keys(ALL);
  const seen = new Set(scenarios.flatMap((s) => names.flatMap((a, i) => names.slice(i + 1)
    .map((b) => `${a}=${LEVELS[a](s)}|${b}=${LEVELS[b](s)}`))));
  const missing = [];
  names.forEach((a, i) => names.slice(i + 1).forEach((b) => ALL[a].forEach((va) => ALL[b].forEach((vb) => {
    if (!impossible(a, va, b, vb) && !seen.has(`${a}=${va}|${b}=${vb}`)) missing.push(`${a}=${va} + ${b}=${vb}`);
  }))));
  return missing;
}