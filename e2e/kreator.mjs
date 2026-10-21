// Test end-to-end kreatora (przeglądarka na monitorze Odyssey): Magic Link → kroki 1–5 → złożenie rezerwacji.
// Uruchomienie: node e2e/kreator.mjs <local|dev> <brak|ograniczone|dwoje> <katalog wyników>
// Lokalnie link logowania jest czytany z lokalnej bazy, na DEV z podglądu maili (emails-rezerwacja-radsasfun.synlogia.dev).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const [ENV, VARIANT, OUT] = process.argv.slice(2);
const CFG = {
  local: { base: 'http://localhost:3000' },
  dev: { base: 'https://rezerwacja-radsasfun.synlogia.dev', mail: 'https://emails-rezerwacja-radsasfun.synlogia.dev' },
}[ENV];
const BASE = CFG.base;
const EMAIL = 'szymon.guzik@gmail.com';
const CHROME = process.env.E2E_CHROME
  || '/Users/szymon/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const WINDOW = (process.env.E2E_WINDOW || '-1000,-1400').split(',');  // domyślnie monitor Odyssey nad ekranem MacBooka
const LOCAL_DB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../api_radsas/database.db');
const CAMP_ID = 41; const EDITION_ID = 159;  // Obóz Narciarski Z1, ZIMA 2027
const log = (...a) => console.log(...a);
const json = async (url) => (await fetch(url)).json();

const inputAfterLabel = (page, text, nth = 0) => page.locator(
  `xpath=(//label[contains(normalize-space(.), "${text}")])[${nth + 1}]/following::*[self::input or self::select or self::textarea][1]`);

async function stepErrors(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.text-red-500, .text-red-600, .text-red-700, [role=alert]'))
    .map((e) => e.textContent.trim()).filter((t) => t && t !== '*' && t.length < 200).slice(0, 8));
}

async function next(page, label) {
  const before = page.url();
  await page.locator('button:visible', { hasText: /przejdź dalej/i }).first().click();
  await page.waitForTimeout(6000);
  if (page.url() === before) {
    await page.screenshot({ path: `${OUT}/stop_${label.replace(' ', '')}.png`, fullPage: true });
    throw new Error(`${label}: nie przeszło dalej — błędy: ${JSON.stringify(await stepErrors(page))}`);
  }
  log(`  ${label} → ${page.url().replace(BASE, '')}`);
}

async function magicLinkUrl(sinceId) {
  if (ENV === 'local') {
    const token = execFileSync('sqlite3', ['-readonly', LOCAL_DB,
      `SELECT magic_link_token FROM users WHERE email='${EMAIL}'`]).toString().trim();
    return token ? `${BASE}/auth/verify?token=${token}` : null;
  }
  const mails = (await json(`${CFG.mail}/api/emails/latest?limit=50`)).filter((e) => e.id > sinceId);
  const mail = mails.find((m) => /magic|login|logow/i.test(`${m.email_type} ${m.subject}`));
  if (!mail) return null;
  const body = await (await fetch(`${CFG.mail}/api/emails/${mail.id}/body`)).text();
  const link = (body.match(/https:\/\/rezerwacja-radsasfun\.synlogia\.dev[^"'\s<>\\]*token=[^"'\s<>\\&]+[^"'\s<>\\]*/) || [])[0];
  return link ? link.replace(/&amp;/g, '&') : null;
}

async function login(page) {
  const sinceId = ENV === 'dev' ? ((await json(`${CFG.mail}/api/emails/latest?limit=1`))[0] || { id: 0 }).id : 0;
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(5000);
  await page.locator('input[type=email]').first().fill(EMAIL);
  await page.locator('button[type=submit], form button').first().click();
  await page.waitForTimeout(8000);
  const url = await magicLinkUrl(sinceId);
  if (!url) throw new Error('brak linku logowania');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(9000);
  const logged = await page.evaluate(() => !!localStorage.getItem('radsasfun_auth_token'));
  log('1. MAGIC LINK → zalogowany:', logged, '| adres:', page.url().replace(BASE, ''));
  if (!logged) throw new Error('po Magic Linku brak tokenu w przeglądarce');
}

async function step1(page) {
  await page.goto(`${BASE}/camps/${CAMP_ID}/edition/${EDITION_ID}/step/1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(10000);
  const fill = async (label, value, nth = 0) => {
    const el = inputAfterLabel(page, label, nth);
    if (await el.count() && await el.isEditable()) await el.fill(value);
  };
  await fill('Imię *', 'Szymon'); await fill('Nazwisko *', 'Test E2E');
  const email = page.locator('input[type=email]').first(); if (await email.isEditable()) await email.fill(EMAIL);
  await page.locator('input[type=tel]').first().fill('735048660');
  await fill('Ulica i numer', 'Testowa 1'); await fill('Kod pocztowy', '80-001'); await fill('Miejscowość', 'Gdańsk');
  if (VARIANT === 'brak') {
    await page.locator('label', { hasText: 'Brak drugiego opiekuna' }).locator('input[type=checkbox]').check();
  } else if (VARIANT === 'ograniczone') {
    await page.locator('label', { hasText: 'Ograniczone prawa rodzicielskie' }).locator('input[type=checkbox]').check();
  } else {
    await fill('Imię *', 'Anna', 1); await fill('Nazwisko *', 'Opiekun Drugi', 1);
    const email2 = page.locator('input[type=email]').nth(1); if (await email2.count()) await email2.fill(EMAIL);
    await page.locator('input[type=tel]').nth(1).fill('735048660');
    await fill('Ulica i numer', 'Testowa 2', 1); await fill('Kod pocztowy', '80-002', 1); await fill('Miejscowość', 'Gdańsk', 1);
  }
  await fill('Imię uczestnika', 'Test'); await fill('Nazwisko uczestnika', `Zima ${VARIANT}`);
  await inputAfterLabel(page, 'Rocznik').selectOption('2015');
  await inputAfterLabel(page, 'Płeć').selectOption('Chłopiec');
  await fill('Miejsce zamieszkania (miasto)', 'Gdańsk');
  for (const name of ['chronicDiseases', 'dysfunctions', 'psychiatric']) {
    const radios = page.locator(`input[type=radio][name=${name}]`); if (await radios.count() > 1) await radios.nth(1).check();
  }
  const diet = page.locator('button, label, div[role=button]', { hasText: /^Standardowa/ }).first();
  if (await diet.count()) await diet.click();
  await page.screenshot({ path: `${OUT}/step1.png`, fullPage: true });
  await next(page, 'krok 1');
}

async function step2(page) {
  const selects = page.locator('select');
  await selects.filter({ has: page.locator('option[value=zbiorowy]') }).nth(0).selectOption('zbiorowy');
  await page.waitForTimeout(2000);
  const cityDep = page.locator('select', { has: page.locator('option', { hasText: 'Katowice' }) }).first();
  if (await cityDep.count()) await cityDep.selectOption({ label: 'Katowice' });
  await selects.filter({ has: page.locator('option[value=wlasny]') }).nth(1).selectOption('wlasny');
  const source = page.locator('input[type=radio]').first(); if (await source.count()) await source.check();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/step2.png`, fullPage: true });
  await next(page, 'krok 2');
}

async function checkAllAndNext(page, label) {
  const boxes = page.locator('input[type=checkbox]:visible');
  for (let i = 0; i < await boxes.count(); i += 1) { const b = boxes.nth(i); if (!(await b.isChecked())) await b.check().catch(() => {}); }
  await next(page, label);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const result = { env: ENV, variant: VARIANT, started: new Date().toISOString() };
  const browser = await chromium.launch({
    executablePath: CHROME, headless: false, args: [`--window-position=${WINDOW[0]},${WINDOW[1]}`, '--window-size=1600,1300'],
  });
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage(); const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 120)}`));
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 90)}`); });
  try {
    await login(page);
    log('2. KREATOR', VARIANT); await step1(page); await step2(page);
    await checkAllAndNext(page, 'krok 3'); await checkAllAndNext(page, 'krok 4');
    result.step5SecondGuardianBlock = await page.locator('h3', { hasText: 'Dane opiekuna 2' }).count() > 0;
    await page.screenshot({ path: `${OUT}/step5.png`, fullPage: true });
    log('   krok 5: blok „Dane opiekuna 2” widoczny:', result.step5SecondGuardianBlock);
    const submit = page.locator('button:visible', { hasText: /rezerw|potwierdz|zatwierdź|zamawiam/i }).first();
    const respPromise = page.waitForResponse((r) => /\/api\/reservations\/?$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 });
    await submit.click();
    const resp = await respPromise;
    if (process.env.DUMP_PAYLOAD) fs.writeFileSync(process.env.DUMP_PAYLOAD, resp.request().postData() || '');
    result.submitStatus = resp.status();
    result.submitBody = (await resp.text()).slice(0, 300);
    await page.waitForTimeout(10000);
    await page.screenshot({ path: `${OUT}/after_submit.png`, fullPage: true });
    const text = await page.evaluate(() => document.body.innerText);
    result.reservationNumber = (text.match(/REZ-\d{4}-\d+/) || [null])[0];
    log('3. ZŁOŻENIE → status', result.submitStatus, '| numer:', result.reservationNumber, '| adres:', page.url().replace(BASE, ''));
  } catch (e) {
    log('STOP:', e.message);
    result.error = e.message;
  }
  result.problems = problems.slice(0, 12);
  log('PROBLEMY:', JSON.stringify(result.problems));
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(result, null, 1));
  const expectedBlock = VARIANT === 'dwoje';
  result.ok = !result.error && result.submitStatus === 201 && result.step5SecondGuardianBlock === expectedBlock;
  log('WYNIK:', result.ok ? 'OK' : 'BŁĄD');
  if (!result.ok) process.exitCode = 1;
  await browser.close();
})();