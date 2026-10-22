// Kreator rezerwacji w przeglądarce: logowanie Magic Linkiem i kroki 1–5 sterowane opisem scenariusza.
import fs from 'node:fs';

import { CLIENT_EMAIL, CLIENT_PHONE, pause, q, sql } from './config.mjs';
import { parseZloty } from './pricing.mjs';

const NEXT = /przejdź dalej/i;
const COMPANY = { name: 'Testowa Firma E2E sp. z o.o.', nip: '5260250274', street: 'Firmowa 5', postal: '00-950', city: 'Warszawa' };

const afterLabel = (page, text, nth = 0) => page.locator(
  `xpath=(//label[contains(normalize-space(.), "${text}")])[${nth + 1}]/following::*[self::input or self::select or self::textarea][1]`);

async function fillAfterLabel(page, label, value, nth = 0) {
  const field = afterLabel(page, label, nth);
  if (await field.count() && await field.isEditable()) await field.fill(value);
}

/** Okna „Tak, dokupuję” (dodatek, ochrona) i „Potwierdzam różne lokalizacje” (transport). */
async function confirmDialogs(page) {
  for (const text of ['Tak, dokupuję', 'Potwierdzam różne lokalizacje']) {
    const button = page.locator('button:visible', { hasText: text });
    if (await button.count()) { await button.first().click(); await pause(page, 1200); }
  }
}

async function visibleErrors(page) {
  return page.evaluate(() => [...document.querySelectorAll('.text-red-500, .text-red-600, .text-red-700, [role=alert]')]
    .map((e) => e.textContent.trim()).filter((t) => t && t !== '*' && t.length < 200).slice(0, 8));
}

async function next(page, ctx, label) {
  const before = page.url();
  await page.locator('button:visible', { hasText: NEXT }).first().click();
  await page.waitForURL((url) => url.toString() !== before, { timeout: 20000 }).catch(() => {});
  await pause(page, 2500);
  if (page.url() === before) {
    await page.screenshot({ path: `${ctx.out}/stop_${label}.png`, fullPage: true });
    throw new Error(`${label}: nie przeszło dalej — ${JSON.stringify(await visibleErrors(page))}`);
  }
}

/** Logowanie Magic Linkiem; link odczytany z bazy środowiska (users.magic_link_token). Sesja zostaje w kontekście przeglądarki. */
export async function login(page, ctx) {
  await page.goto(`${ctx.env.base}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pause(page, 3000);
  await page.locator('input[type=email]').first().fill(CLIENT_EMAIL);
  await page.locator('button[type=submit], form button').first().click(); await pause(page, 6000);
  const [row] = sql(ctx.env, `SELECT magic_link_token AS token FROM users WHERE email = ${q(CLIENT_EMAIL)}`);
  if (!row?.token) throw new Error('logowanie: brak tokenu Magic Link w bazie');
  await page.goto(`${ctx.env.base}/auth/verify?token=${row.token}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => !!localStorage.getItem('radsasfun_auth_token'), null, { timeout: 30000 });
  await pause(page, 3000);
}

// Kod rabatowy działa raz na klienta (po e-mailu z danych rezerwacji) — każdy scenariusz ma własny adres opiekuna
// w tej samej skrzynce Gmaila (+e2e-…); poza produkcją bezpiecznik i tak kieruje maile na adres testowy.
export const guardianEmail = (s) => CLIENT_EMAIL.replace('@', `+e2e-${s.id.toLowerCase()}@`);

async function fillGuardians(page, s) {
  await fillAfterLabel(page, 'Imię *', 'Szymon'); await fillAfterLabel(page, 'Nazwisko *', 'Test E2E');
  await page.locator('input[type=email]').first().fill(guardianEmail(s));
  await page.locator('input[type=tel]').first().fill(CLIENT_PHONE);
  await fillAfterLabel(page, 'Ulica i numer', 'Testowa 1'); await fillAfterLabel(page, 'Kod pocztowy', '80-001');
  await fillAfterLabel(page, 'Miejscowość', 'Gdańsk');
  if (s.guardian2 === 'brak') {
    await page.locator('label', { hasText: 'Brak drugiego opiekuna' }).locator('input[type=checkbox]').check();
  } else if (s.guardian2 === 'ograniczone') {
    await page.locator('label', { hasText: 'Ograniczone prawa rodzicielskie' }).locator('input[type=checkbox]').check();
  } else {
    await fillAfterLabel(page, 'Imię *', 'Anna', 1); await fillAfterLabel(page, 'Nazwisko *', 'Opiekun Drugi', 1);
    await page.locator('input[type=email]').nth(1).fill(guardianEmail(s));
    await page.locator('input[type=tel]').nth(1).fill(CLIENT_PHONE);
    await fillAfterLabel(page, 'Ulica i numer', 'Testowa 2', 1); await fillAfterLabel(page, 'Kod pocztowy', '80-002', 1);
    await fillAfterLabel(page, 'Miejscowość', 'Gdańsk', 1);
  }
}

async function fillParticipant(page, s) {
  await fillAfterLabel(page, 'Imię uczestnika', 'Test'); await fillAfterLabel(page, 'Nazwisko uczestnika', `E2E ${s.id}`);
  await afterLabel(page, 'Rocznik').selectOption(String(s.birthYear));
  await afterLabel(page, 'Płeć').selectOption(s.id.endsWith('1') ? 'Dziewczynka' : 'Chłopiec');
  await fillAfterLabel(page, 'Miejsce zamieszkania (miasto)', 'Gdańsk');
  // Tekst kafelka bywa sklejony („Standardowa0 zł”) — nazwa diety, potem cena.
  await page.locator('button:visible', { hasText: new RegExp(`^\\s*${s.diet}\\s*[+\\d]`) }).first().click();
  await confirmDialogs(page);
  if (s.health) {
    await page.locator('input[type=radio][name=chronicDiseases][value=Tak]').check();
    await page.locator('textarea[placeholder="Opisz choroby przewlekłe..."]').fill(s.health);
  }
}

async function step1(page, ctx, s) {
  await page.goto(`${ctx.env.base}/camps/${s.campId}/edition/${s.propertyId}/step/1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await afterLabel(page, 'Rocznik').waitFor({ timeout: 60000 });
  await fillGuardians(page, s);
  await fillParticipant(page, s);
  await next(page, ctx, 'krok1');
}

async function choosePromotion(page, s) {
  if (!s.promotion) return;
  await page.locator('select', { has: page.locator('option', { hasText: 'Brak promocji' }) }).selectOption(String(s.promotion.id));
  await pause(page, 1500);
  for (const [placeholder, value] of Object.entries(s.promotion.text || {})) {
    await page.locator(`input[placeholder="${placeholder}"]`).fill(value);
  }
  if (s.promotion.checkbox) {
    await page.locator('label', { hasText: s.promotion.checkbox }).locator('input[type=checkbox]').check();
  }
}

async function applyCode(page, s) {
  if (!s.code) return;
  await page.locator('input[placeholder="Wpisz kod rabatowy"]').fill(s.code);
  await page.locator('button:visible', { hasText: 'Zatwierdź' }).first().click();
  await page.locator('button:visible', { hasText: 'Usuń kod' }).waitFor({ timeout: 15000 });
}

async function chooseTransport(page, s) {
  const types = page.locator('select', { has: page.locator('option[value=zbiorowy]') });
  const directions = [s.transport.departure, s.transport.return];
  for (let i = 0; i < 2; i += 1) {
    await types.nth(i).selectOption(directions[i] ? 'zbiorowy' : 'wlasny'); await pause(page, 1000);
  }
  // Listy miast pojawiają się tylko przy kierunkach zbiorowych, w kolejności wyjazd → powrót.
  const cities = page.locator('select', { has: page.locator('option', { hasText: 'Wybierz miasto' }) });
  let index = 0;
  for (const city of directions) {
    if (city) { await cities.nth(index).selectOption(city); index += 1; await pause(page, 800); }
  }
  await confirmDialogs(page);
}

async function step2(page, ctx, s) {
  if (s.addon) { await page.locator('button:visible', { hasText: s.addon }).first().click(); await pause(page, 1000); await confirmDialogs(page); }
  if (s.protection) {
    await page.locator('button:visible', { hasText: new RegExp(`^${s.protection}`) }).first().click();
    await pause(page, 1000); await confirmDialogs(page);
  }
  await choosePromotion(page, s);
  await applyCode(page, s);
  await chooseTransport(page, s);
  await page.locator('input[type=radio][name=source]').first().check();
  await confirmDialogs(page);
  await next(page, ctx, 'krok2');
}

async function step3(page, ctx, s) {
  if (s.invoice === 'nie') {
    await page.locator('button:visible', { hasText: 'Klient nie chce faktury' }).click();
  } else {
    await page.locator('button:visible', { hasText: 'Klient chce otrzymać fakturę' }).click(); await pause(page, 1000);
    await page.locator('button:visible', { hasText: s.invoice === 'firma' ? 'Firma' : 'Osoba prywatna' }).first().click();
    await pause(page, 1000);
    if (s.invoice === 'firma') {
      await page.locator('input[placeholder="Nazwa firmy"]').fill(COMPANY.name);
      await page.locator('input[placeholder="NIP"]').fill(COMPANY.nip);
    }
    const fields = [['Ulica i numer', COMPANY.street], ['np. 00-000', COMPANY.postal], ['Miejscowość', COMPANY.city]];
    for (const [placeholder, value] of fields) {
      const input = page.locator(`input[placeholder="${placeholder}"]:visible`).first();
      if (await input.count() && !(await input.inputValue())) await input.fill(value);
    }
  }
  await next(page, ctx, 'krok3');
}

async function step4(page, ctx) {
  await page.locator('#selectAllConsents').check();
  await next(page, ctx, 'krok4');
}

/** Krok 5: cena „Koszt całkowity”, złożenie rezerwacji; zwraca numer, id i cenę z ekranu. */
async function step5(page, ctx, s) {
  await page.getByText('Koszt całkowity:').first().waitFor({ timeout: 30000 });
  const text = await page.evaluate(() => document.body.innerText);
  const priceLine = text.slice(text.indexOf('Koszt całkowity:'), text.indexOf('Koszt całkowity:') + 40);
  const step5Price = parseZloty(priceLine);
  fs.writeFileSync(`${ctx.out}/${s.id}_krok5.txt`, text);
  const response = page.waitForResponse((r) => /\/api\/reservations\/?$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 });
  await page.locator('button:visible', { hasText: 'Potwierdzam rezerwację' }).first().click();
  const result = await response;
  fs.writeFileSync(`${ctx.out}/${s.id}_wyslana_rezerwacja.json`, result.request().postData() || '');
  const body = await result.json().catch(() => ({}));
  if (result.status() !== 201) throw new Error(`złożenie: HTTP ${result.status()} ${JSON.stringify(body).slice(0, 200)}`);
  await pause(page, 5000);
  return { step5Price, id: body.id, number: body.reservation_number || `REZ-${new Date().getFullYear()}-${body.id}` };
}

/** Cały kreator dla scenariusza (zalogowana strona). */
export async function reserve(page, ctx, s) {
  await step1(page, ctx, s);
  await step2(page, ctx, s);
  await step3(page, ctx, s);
  await step4(page, ctx);
  return step5(page, ctx, s);
}