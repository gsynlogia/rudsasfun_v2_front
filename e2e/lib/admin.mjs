// Panel admina w osobnej sesji przeglądarki (token superadmina z pomocnika, bez hasła):
// akceptacja umowy i karty przyciskami w szczegółach rezerwacji oraz wpłata formularzem „Dodaj wpłatę”.
import fs from 'node:fs';

import { adminSession, pause, sql } from './config.mjs';

async function dumpButtons(page, ctx, name) {
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => b.offsetWidth || b.offsetHeight).map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
  fs.writeFileSync(`${ctx.out}/${name}_przyciski.json`, JSON.stringify(buttons, null, 1));
  await page.screenshot({ path: `${ctx.out}/${name}.png`, fullPage: true });
}

/** Osobny kontekst przeglądarki dla admina (klient i admin używają tych samych kluczy w localStorage). */
export async function openAdmin(browserApp, ctx) {
  const { token } = adminSession(ctx.env);
  const me = await fetch(`${ctx.env.api}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!me.ok) throw new Error(`admin: /api/auth/me HTTP ${me.status}`);
  const user = await me.json();
  const adminContext = await browserApp.newContext({ viewport: null });
  await adminContext.addInitScript(([t, u]) => {
    localStorage.setItem('radsasfun_auth_token', t);
    localStorage.setItem('radsasfun_auth_user', u);
  }, [token, JSON.stringify(user)]);
  return adminContext.newPage();
}

function documentStatus(ctx, number, type) {
  const [row] = sql(ctx.env, `SELECT sd.status FROM signed_documents sd JOIN reservations r ON r.id = sd.reservation_id
    WHERE r.reservation_number = '${number}' AND sd.document_type = '${type}' ORDER BY sd.id DESC LIMIT 1`);
  return row?.status || null;
}

async function acceptOne(page, ctx, number, buttonText, type) {
  const button = page.locator('button:visible', { hasText: buttonText }).first();
  if (!(await button.count())) {
    await dumpButtons(page, ctx, `${number}_${type}`);
    throw new Error(`admin: brak przycisku „${buttonText}”`);
  }
  page.once('dialog', (d) => d.accept());
  await button.click();
  await pause(page, 6000);
  const status = documentStatus(ctx, number, type);
  if (status !== 'accepted') throw new Error(`admin: po „${buttonText}” status ${status}`);
  return status;
}

/** Akceptacja umowy i karty w szczegółach rezerwacji. */
export async function acceptDocuments(page, ctx, number) {
  const open = async () => {
    await page.goto(`${ctx.env.base}/admin-panel/rezerwacja/${number}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const tab = page.locator('button:visible', { hasText: /^\s*Dokumenty\s*$/ }).first();
    await tab.waitFor({ timeout: 60000 });
    await tab.click();
    await pause(page, 4000);
  };
  await open();
  const contract = await acceptOne(page, ctx, number, 'Zaakceptuj umowę', 'contract');
  await open();
  const card = await acceptOne(page, ctx, number, 'Zaakceptuj kartę', 'qualification_card');
  console.log(`  admin: umowa ${contract}, karta ${card}`);
  return { ok: true, contract, card };
}

/** Wpłata całej kwoty formularzem admina; sprawdzenie w bazie (wpłata + status płatności). */
export async function addPayment(page, ctx, number, amount) {
  await page.goto(`${ctx.env.base}/admin-panel/rezerwacja/${number}/payments/wplata/nowa`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('#amount').waitFor({ timeout: 60000 });
  await page.locator('#amount').fill(String(amount).replace('.', ','));
  const date = page.locator('#paymentDate');
  if (!(await date.inputValue())) await date.fill(new Date().toISOString().slice(0, 10));
  const method = page.locator('#paymentMethod');
  const options = await method.locator('option').evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
  if (options.length) await method.selectOption(options[0]);
  await page.locator('button[type=submit]', { hasText: 'Zapisz wpłatę' }).click();
  await pause(page, 6000);
  const [row] = sql(ctx.env, `SELECT r.payment_status, COALESCE(SUM(mp.amount), 0) AS paid FROM reservations r
    LEFT JOIN manual_payments mp ON mp.reservation_id = r.id WHERE r.reservation_number = '${number}' GROUP BY r.id`);
  const ok = Math.abs(row.paid - amount) < 0.005;
  console.log(`  wpłata: ${row.paid} zł, status płatności: ${row.payment_status}`, ok ? 'OK' : 'BŁĄD');
  if (!ok) await dumpButtons(page, ctx, `${number}_wplata`);
  return { ok, paid: row.paid, paymentStatus: row.payment_status };
}