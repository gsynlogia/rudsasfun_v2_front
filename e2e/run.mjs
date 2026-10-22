// Testy end-to-end rezerwacji ZIMA 2027: kreator → cena (krok 5 = zapisana = cennik z bazy) → podpis umowy i karty
// kodem SMS → panel admina (akceptacja umowy i karty, wpłata) → maile w dzienniku.
// Uruchomienie: node e2e/run.mjs <local|dev> [S01,S05,...] [katalog wyników]
// Po testach: api_radsas/scripts/delete_test_reservations.py (oferta zimowa ma zostać bez rezerwacji).
import fs from 'node:fs';

import { chromium } from 'playwright-core';

import { acceptDocuments, addPayment, openAdmin } from './lib/admin.mjs';
import { BROWSER, ENVIRONMENTS, sql } from './lib/config.mjs';
import { signDocuments } from './lib/documents.mjs';
import { expectedPrice } from './lib/pricing.mjs';
import { checkSaved, KNOWN_ISSUES } from './lib/saved.mjs';
import { login, reserve } from './lib/wizard.mjs';
import { coverage, SCENARIOS } from './scenarios.mjs';

const [envName = 'local', only = '', outArg] = process.argv.slice(2);
const env = ENVIRONMENTS[envName];
if (!env) throw new Error(`nieznane środowisko: ${envName}`);
const out = outArg || `e2e-results/${envName}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`;
const selected = only ? SCENARIOS.filter((s) => only.split(',').includes(s.id)) : SCENARIOS;
const log = (...a) => console.log(...a);
const PRICE_TOLERANCE = 0.005;

function checkPrices(s, number, step5Price) {
  const expected = expectedPrice(env, s);
  const [saved] = sql(env, `SELECT id, total_price FROM reservations WHERE reservation_number = '${number}'`);
  const same = (a, b) => a !== null && b !== null && Math.abs(a - b) < PRICE_TOLERANCE;
  const ok = same(step5Price, saved?.total_price) && same(saved?.total_price, expected.total);
  log(`  cena: krok 5 = ${step5Price} | zapisana = ${saved?.total_price} | cennik = ${expected.total}`, ok ? 'OK' : 'BŁĄD');
  if (!ok) log('  pozycje cennika:', JSON.stringify(expected.items));
  return { ok, step5: step5Price, saved: saved?.total_price, expected: expected.total, items: expected.items };
}

// Dziennik maili nie zapisuje numeru rezerwacji (reservation_id puste) — maile scenariusza to te powstałe po jego starcie.
const lastEmailId = () => sql(env, 'SELECT COALESCE(MAX(id), 0) AS id FROM email_statuses')[0].id;

function checkEmails(sinceId, amount) {
  const mails = sql(env, `SELECT subject, status FROM email_statuses WHERE id > ${Number(sinceId)} ORDER BY id`);
  // Poza produkcją bezpiecznik dopisuje „[DEV -> adres] ” przed tematem, gdy adresat nie jest adresem testowym.
  const subject = (text) => new RegExp(`^(\\[DEV -> [^\\]]*\\] )?${text}`);
  const expected = [subject('Potwierdzenie rezerwacji'), subject('Umowa została zatwierdzona'),
    subject('Karta kwalifikacyjna została zatwierdzona'), subject(`Wpłata dodana - ${Number(amount).toFixed(2)} PLN`)];
  const missing = expected.filter((re) => !mails.some((m) => re.test(m.subject) && m.status === 'SENT')).map(String);
  log(`  maile (${mails.length}): ${mails.map((m) => `${m.subject} [${m.status}]`).join(' | ')}`, missing.length ? `BRAK ${missing}` : 'OK');
  return { ok: !missing.length, mails, missing };
}

async function runScenario(ctx, s) {
  const result = { id: s.id, propertyId: s.propertyId, started: new Date().toISOString() };
  const page = await ctx.browser.newPage();
  page.on('pageerror', (e) => ctx.problems.push(`${s.id} pageerror: ${e.message.slice(0, 120)}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 400) ctx.problems.push(`${s.id} ${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 90)}`);
  });
  const emailStart = lastEmailId();
  try {
    const { number, id, step5Price } = await reserve(page, ctx, s);
    Object.assign(result, { number, reservationId: id });
    log(`  złożona ${number}`);
    result.price = checkPrices(s, number, step5Price);
    const mismatches = checkSaved(env, s, number);
    result.knownIssues = mismatches.filter((m) => KNOWN_ISSUES[m.name]).map((m) => KNOWN_ISSUES[m.name]);
    result.savedMismatches = mismatches.filter((m) => !KNOWN_ISSUES[m.name]);
    log('  zapisane dane:', result.savedMismatches.length ? `ROZBIEŻNE ${JSON.stringify(result.savedMismatches)}` : 'zgodne z wyborami',
      result.knownIssues.length ? `| znane: ${result.knownIssues.join('; ')}` : '');
    result.signed = await signDocuments(page, ctx, s, number, id);
    result.admin = await acceptDocuments(ctx.admin, ctx, number);
    result.payment = await addPayment(ctx.admin, ctx, number, result.price.saved);
    await page.waitForTimeout(3000);  // mail o wpłacie wychodzi chwilę po zapisie
    result.emails = checkEmails(emailStart, result.price.saved);
  } catch (e) {
    const lines = e.message.split('\n');
    result.error = [lines[0], ...lines.filter((l) => l.includes('waiting for'))].slice(0, 2).join(' — ').replace(/\x1b\[\d+m/g, '');
    log(`  STOP: ${result.error}`);
    await page.screenshot({ path: `${ctx.out}/${s.id}_blad.png`, fullPage: true }).catch(() => {});
  }
  await page.close();
  result.ok = Boolean(!result.error && result.price?.ok && !result.savedMismatches?.length && result.signed?.ok
    && result.admin?.ok && result.payment?.ok && result.emails?.ok);
  return result;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const missing = coverage(selected);
  log(`Scenariusze: ${selected.map((s) => s.id).join(' ')} | niepokryte pary opcji: ${missing.length}`);
  const [x, y] = BROWSER.position.split(','); const [w, h] = BROWSER.size.split(',');
  const browserApp = await chromium.launch({ executablePath: BROWSER.chrome, headless: false, args: [`--window-position=${x},${y}`, `--window-size=${w},${h}`] });
  const browser = await browserApp.newContext({ viewport: null });
  const ctx = { env, out, browser, problems: [] };
  const results = [];
  try {
    const loginPage = await browser.newPage();
    await login(loginPage, ctx); await loginPage.close();
    log('Zalogowano klienta (Magic Link).');
    ctx.admin = await openAdmin(browserApp, ctx);
    for (const s of selected) {
      log(`\n${s.id} — turnus ${s.propertyId}`);
      results.push(await runScenario(ctx, s));
      fs.writeFileSync(`${out}/wyniki.json`, JSON.stringify({ env: envName, results, problems: ctx.problems }, null, 1));
    }
  } finally {
    await browserApp.close();
  }
  const failed = results.filter((r) => !r.ok);
  log(`\nWYNIK: ${results.length - failed.length}/${results.length} OK${failed.length ? ` — błędy: ${failed.map((r) => r.id).join(', ')}` : ''}`);
  log(`Numery: ${results.map((r) => `${r.id}=${r.number || '-'}`).join(' ')}`);
  if (ctx.problems.length) log('Odpowiedzi API ≥ 400 / błędy strony:', JSON.stringify(ctx.problems.slice(0, 20)));
  if (failed.length) process.exitCode = 1;
})();