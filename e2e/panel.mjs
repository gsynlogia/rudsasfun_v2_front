// DEPRECATED 2026-10-22: zastąpione przez e2e/run.mjs (15 scenariuszy ZIMA 2027); usunięcie dopiero po zgodzie Szymona (TD-047).
// Test end-to-end panelu klienta na DEV: Magic Link → umowa i karta rezerwacji → podpis kodem SMS (podgląd SMS na DEV).
// Uruchomienie: node e2e/panel.mjs <numer REZ-…> <katalog wyników>
import fs from 'node:fs';

import { chromium } from 'playwright-core';

const [NUMBER, OUT] = process.argv.slice(2);
const BASE = 'https://rezerwacja-radsasfun.synlogia.dev';
const MAIL = 'https://emails-rezerwacja-radsasfun.synlogia.dev';
const SMS = 'https://sms-rezerwacja-radsasfun.synlogia.dev';
const EMAIL = 'szymon.guzik@gmail.com';
const CHROME = process.env.E2E_CHROME
  || '/Users/szymon/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const WINDOW = (process.env.E2E_WINDOW || '-1000,-1400').split(',');  // domyślnie monitor Odyssey nad ekranem MacBooka
const log = (...a) => console.log(...a);
const json = async (url) => (await fetch(url)).json();

async function login(page) {
  const sinceId = ((await json(`${MAIL}/api/emails/latest?limit=1`))[0] || { id: 0 }).id;
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(5000);
  await page.locator('input[type=email]').first().fill(EMAIL);
  await page.locator('button[type=submit], form button').first().click();
  await page.waitForTimeout(8000);
  const mail = (await json(`${MAIL}/api/emails/latest?limit=50`)).filter((e) => e.id > sinceId)
    .find((m) => /magic|login|logow/i.test(`${m.email_type} ${m.subject}`));
  if (!mail) throw new Error('brak maila z linkiem logowania');
  const body = await (await fetch(`${MAIL}/api/emails/${mail.id}/body`)).text();
  const link = (body.match(/https:\/\/rezerwacja-radsasfun\.synlogia\.dev[^"'\s<>\\]*token=[^"'\s<>\\&]+[^"'\s<>\\]*/) || [])[0];
  if (!link) throw new Error('brak linku w mailu');
  await page.goto(link.replace(/&amp;/g, '&'), { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(9000);
  if (!(await page.evaluate(() => !!localStorage.getItem('radsasfun_auth_token')))) throw new Error('brak logowania');
}

async function smsCodeSince(total) {
  const now = (await json(`${SMS}/api/sms/total`)).total;
  if (now <= total) return null;
  const latest = await json(`${SMS}/api/sms/latest?limit=${now - total}`);
  const items = Array.isArray(latest) ? latest : latest.items || latest.sms || [];
  const texts = items.map((s) => String(s.message || s.content || s.text || s.body || JSON.stringify(s)));
  return { texts, code: (texts.join(' ').match(/kod[^0-9]{0,40}(\d{4,6})/i) || [])[1] };
}

async function checkByLabel(page, text) {
  const box = page.locator(`xpath=//label[contains(., "${text}")]//input[@type="checkbox"] | //label[contains(., "${text}")]/preceding-sibling::input[@type="checkbox"][1]`).first();
  if (await box.count() && await box.isVisible() && !(await box.isChecked())) await box.check().catch(() => {});
}

async function signWithSms(page, label) {
  const smsBefore = (await json(`${SMS}/api/sms/total`)).total;
  const sign = page.locator('button:visible', { hasText: /podpisz/i }).first();
  if (!(await sign.count())) { log(`  ${label}: bez przycisku Podpisz (już podpisane)`); return; }
  await sign.click(); await page.waitForTimeout(10000);
  const sms = await smsCodeSince(smsBefore);
  if (!sms || !sms.code) { await page.screenshot({ path: `${OUT}/${label}_brak_kodu.png`, fullPage: true }); throw new Error(`${label}: brak kodu SMS ${JSON.stringify(sms)}`); }
  log(`  ${label}: SMS „${sms.texts[sms.texts.length - 1].slice(0, 90)}”`);
  await page.locator('input[maxlength="4"]:visible, input[placeholder*="_"]:visible').last().fill(sms.code);
  await page.locator('button:visible', { hasText: /^\s*Potwierdź\s*$/i }).last().click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${OUT}/${label}_po_podpisie.png`, fullPage: true });
  const status = await page.evaluate(() => document.body.innerText.split('\n')
    .filter((l) => /podpisan|weryfikac|zatwierdz|błąd|nieprawidłow|wymagan/i.test(l)).slice(0, 4));
  log(`  ${label}: po kodzie →`, JSON.stringify(status));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: false, args: [`--window-position=${WINDOW[0]},${WINDOW[1]}`, '--window-size=1600,1300'] });
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage(); const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 120)}`));
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 90)}`); });
  try {
    await login(page);
    for (const [label, sub] of [['umowa', 'umowa'], ['karta', 'karta-kwalifikacyjna']]) {
      await page.goto(`${BASE}/profil/aktualne-rezerwacje/${NUMBER}/${sub}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(12000);
      const body = await page.evaluate(() => document.body.innerText);
      log(`${NUMBER} ${label}:`, label === 'karta'
        ? `ZIMA=${body.includes('WYPOCZYNKU ZIMA')} | opiekun 2 na karcie: ${/Brak drugiego/i.test(body) ? 'pyta o brak/dane' : 'dane z rezerwacji'}`
        : `SKIPASS=${body.includes('SKIPASS')} | 3060=${/3\s?060/.test(body)}`);
      if (label === 'karta') {
        const dob = page.locator('#child-dob-field input');
        if (await dob.count()) await dob.first().fill('2015-05-10');
        const noPesel = page.locator('#child-no-pesel-section input[type=checkbox]');
        if (await noPesel.count() && !(await noPesel.first().isChecked())) await noPesel.first().check();
        for (const txt of ['Brak drugiego rodzica', 'Zgodnie z kalendarzem', 'Potwierdzam zapoznanie']) await checkByLabel(page, txt);
      }
      await signWithSms(page, label);
    }
  } catch (e) { log('STOP:', e.message); process.exitCode = 1; }
  log('PROBLEMY:', JSON.stringify(problems.slice(0, 12)));
  await browser.close();
})();